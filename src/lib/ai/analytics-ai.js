// src/lib/ai/analytics-ai.js
//
// Layer C: AI narrative generators. These depend on Layer B's
// buildClientOverview() for all data assembly. They own only prompt
// construction, model calls, and the AiGeneration cache. They must not
// perform raw-table aggregation.

import { chatCompletion } from './ai-client.js';
import { renderTemplate } from './prompt-template.js';
import { computeCacheKey, hashInput, getCachedResponse, setCachedResponse } from './cache.js';
import { buildClientOverview } from '../analytics/client-overview.js';

const MODEL = 'gpt-4o-mini';

/**
 * Generate weekly insights for a client.
 */
export async function generateWeeklyInsights(prisma, { clientSlug, dateRangeStart, dateRangeEnd, forceRefresh = false }) {
  const now = new Date();
  const start = dateRangeStart || new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const end = dateRangeEnd || now.toISOString().split('T')[0];

  const overview = await buildClientOverview(prisma, {
    clientSlug, start, end, opts: { includePriorPeriod: false },
  });
  if (!overview) return { error: 'Client not found', code: 'CLIENT_NOT_FOUND' };

  const { systemMessage, userMessage, version } = renderTemplate('weekly-insights', {
    clientName: overview.client.name,
    dateRangeStart: start,
    dateRangeEnd: end,
    socialData: overview.promptContext.socialData || 'No social data available for this period.',
    webData: overview.promptContext.webData,
    buzzwords: overview.promptContext.buzzwords,
  });

  const inputHash = hashInput({ clientSlug, start, end });
  const cacheKey = computeCacheKey({
    feature: 'weekly-insights',
    clientId: overview.client.id,
    dateRangeStart: start,
    dateRangeEnd: end,
    inputHash,
    promptVersion: version,
    model: MODEL,
  });

  if (!forceRefresh) {
    const cached = await getCachedResponse(prisma, cacheKey);
    if (cached) {
      return {
        insights: cached.responseBody,
        cached: true,
        usage: { promptTokens: cached.promptTokens, completionTokens: cached.completionTokens, totalTokens: cached.totalTokens },
        generatedAt: cached.createdAt.toISOString(),
        model: MODEL,
      };
    }
  }

  const result = await chatCompletion({
    model: MODEL,
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.6,
    maxTokens: 512,
  });

  if (!result.content?.trim()) {
    throw Object.assign(new Error('AI returned empty response'), { code: 'AI_INVALID_RESPONSE' });
  }

  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  await setCachedResponse(prisma, {
    cacheKey,
    feature: 'weekly-insights',
    clientId: overview.client.id,
    model: MODEL,
    promptVersion: version,
    inputHash,
    dateRangeStart: start,
    dateRangeEnd: end,
    responseFormat: 'markdown',
    responseBody: result.content,
    promptTokens: result.usage.promptTokens,
    completionTokens: result.usage.completionTokens,
    totalTokens: result.usage.totalTokens,
    latencyMs: result.latencyMs,
    expiresAt,
  });

  return {
    insights: result.content,
    cached: false,
    usage: result.usage,
    generatedAt: now.toISOString(),
    model: MODEL,
  };
}

/**
 * Assembles a structured analytics context from a buildClientOverview() result.
 *
 * Separates deterministic analytics processing from AI generation so:
 *  - the structured snapshot can be shown in the UI before generation
 *  - the AI receives richer, cleaner formatted inputs
 *
 * Returns { structured, promptText } where:
 *  - structured: display-ready analytics object (safe to expose to frontend)
 *  - promptText: { dailyEngagement, topPosts, postTypeBreakdown } — formatted for AI prompt
 */
export function assembleReportContext(overview) {
  const cd = overview.chartData || {};
  const summary = overview.summary || {};

  // Structured context: display-ready analytics
  const structured = {
    clientName: overview.client?.name,
    dateRange: { start: overview.range?.start, end: overview.range?.end },
    socialSummary: {
      totalEngagement: summary.totalEngagement ?? 0,
      totalReach: summary.totalReach ?? 0,
      totalPosts: summary.totalPosts ?? 0,
      platforms: (cd.platformTotals || []).map(p => ({
        platform: p.platform,
        handle: p.handle,
        followers: p.followers,
        likes: p.likes,
        comments: p.comments,
        shares: p.shares,
        saves: p.saves,
        reach: p.reach,
      })),
      topPostCount: (cd.topPosts || []).length,
      postTypeBreakdown: (cd.postTypeBreakdown || []).reduce((acc, t) => {
        acc[t.type] = (acc[t.type] || 0) + t.count;
        return acc;
      }, {}),
    },
    webSummary: overview.web
      ? {
          sessions: overview.web.totals?.sessions ?? 0,
          users: overview.web.totals?.users ?? 0,
          pageviews: overview.web.totals?.pageviews ?? 0,
          topSource: overview.web.sources?.[0]?.source ?? null,
        }
      : null,
    insights: (overview.ruleInsights || []).slice(0, 5).map(i => ({
      type: i.type,
      message: i.message,
    })),
    freshnessState: overview.freshness
      ? {
          social: overview.freshness.socialLastSyncedAt,
          web: overview.freshness.webAnalyticsLastSyncedAt,
        }
      : null,
  };

  // Formatted text blocks for AI prompt
  let dailyEngagementText = '';
  if (cd.dailyEngagement?.length > 0) {
    dailyEngagementText = 'Daily social engagement:\n';
    for (const d of cd.dailyEngagement.slice(-14)) {
      const parts = [`  ${d.date}:`];
      for (const key of Object.keys(d)) {
        if (key !== 'date') parts.push(`${key}=${d[key]}`);
      }
      dailyEngagementText += parts.join(' ') + '\n';
    }
  }

  let topPostsText = '';
  if (cd.topPosts?.length > 0) {
    topPostsText = 'Top 10 posts by engagement:\n';
    for (const p of cd.topPosts) {
      topPostsText += `  - [${p.platform}/${p.mediaType}] "${(p.caption || '').slice(0, 60)}..." — ${p.likes} likes, ${p.comments} comments, ${p.shares} shares, ${p.reach} reach\n`;
    }
  }

  let postTypeText = '';
  if (cd.postTypeBreakdown?.length > 0) {
    postTypeText = 'Post type distribution: ' + cd.postTypeBreakdown.map(t => `${t.type}: ${t.count}`).join(', ');
  }

  return {
    structured,
    promptText: { dailyEngagement: dailyEngagementText, topPosts: topPostsText, postTypeBreakdown: postTypeText },
  };
}

/**
 * Generate a comprehensive client-facing report draft with graph data.
 *
 * Returns:
 *  - report: markdown narrative
 *  - reportContext: structured analytics context (pre-AI snapshot)
 *  - chartData: structured data for frontend graph rendering
 */
export async function generateReportDraft(prisma, { clientSlug, dateRangeStart, dateRangeEnd, forceRefresh = false, selectedModules = null }) {
  const now = new Date();
  const start = dateRangeStart || new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const end = dateRangeEnd || now.toISOString().split('T')[0];

  const overview = await buildClientOverview(prisma, {
    clientSlug, start, end, opts: { includePriorPeriod: false },
  });
  if (!overview) return { error: 'Client not found', code: 'CLIENT_NOT_FOUND' };

  const cd = overview.chartData;
  const { structured: reportContext, promptText } = assembleReportContext(overview);

  const { systemMessage, userMessage, version } = renderTemplate('report-draft', {
    clientName: overview.client.name,
    dateRangeStart: start,
    dateRangeEnd: end,
    socialData: overview.promptContext.socialData || 'No social data available for this period.',
    webData: overview.promptContext.webData,
    buzzwords: overview.promptContext.buzzwords,
    dailyEngagement: promptText.dailyEngagement,
    topPosts: promptText.topPosts,
    postTypeBreakdown: promptText.postTypeBreakdown,
    selectedModules: Array.isArray(selectedModules) && selectedModules.length > 0
      ? selectedModules.join(', ')
      : null,
  });

  const inputHash = hashInput({ clientSlug, start, end });
  const cacheKey = computeCacheKey({
    feature: 'report-draft',
    clientId: overview.client.id,
    dateRangeStart: start,
    dateRangeEnd: end,
    inputHash,
    promptVersion: version,
    model: MODEL,
  });

  if (!forceRefresh) {
    const cached = await getCachedResponse(prisma, cacheKey);
    if (cached) {
      return {
        report: cached.responseBody,
        reportContext,
        chartData: cd,
        cached: true,
        usage: { promptTokens: cached.promptTokens, completionTokens: cached.completionTokens, totalTokens: cached.totalTokens },
        generatedAt: cached.createdAt.toISOString(),
        model: MODEL,
      };
    }
  }

  const result = await chatCompletion({
    model: MODEL,
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.5,
    maxTokens: 3072,
  });

  if (!result.content?.trim()) {
    throw Object.assign(new Error('AI returned empty response'), { code: 'AI_INVALID_RESPONSE' });
  }

  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  await setCachedResponse(prisma, {
    cacheKey,
    feature: 'report-draft',
    clientId: overview.client.id,
    model: MODEL,
    promptVersion: version,
    inputHash,
    dateRangeStart: start,
    dateRangeEnd: end,
    responseFormat: 'markdown',
    responseBody: result.content,
    promptTokens: result.usage.promptTokens,
    completionTokens: result.usage.completionTokens,
    totalTokens: result.usage.totalTokens,
    latencyMs: result.latencyMs,
    expiresAt,
  });

  return {
    report: result.content,
    reportContext,
    chartData: cd,
    cached: false,
    usage: result.usage,
    generatedAt: now.toISOString(),
    model: MODEL,
  };
}
