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
 * Generate a comprehensive client-facing report draft with graph data.
 *
 * Returns:
 *  - report: markdown narrative
 *  - chartData: structured data for frontend graph rendering
 *    - dailyEngagement: time-series by platform (likes, comments, reach, impressions)
 *    - platformTotals: per-platform aggregate metrics
 *    - topPosts: ranked by engagement score
 *    - postTypeBreakdown: media type distribution
 *    - dailyTraffic: GA4 sessions/users/pageviews per day
 *    - trafficSources: top referral sources
 */
export async function generateReportDraft(prisma, { clientSlug, dateRangeStart, dateRangeEnd, forceRefresh = false }) {
  const now = new Date();
  const start = dateRangeStart || new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const end = dateRangeEnd || now.toISOString().split('T')[0];

  const overview = await buildClientOverview(prisma, {
    clientSlug, start, end, opts: { includePriorPeriod: false },
  });
  if (!overview) return { error: 'Client not found', code: 'CLIENT_NOT_FOUND' };

  const cd = overview.chartData;

  // Build a compact daily-engagement table for the prompt so the AI can reference trends
  let dailyEngagementText = '';
  if (cd.dailyEngagement.length > 0) {
    dailyEngagementText = 'Daily social engagement:\n';
    for (const d of cd.dailyEngagement.slice(-14)) {
      const parts = [`  ${d.date}:`];
      for (const key of Object.keys(d)) {
        if (key !== 'date') parts.push(`${key}=${d[key]}`);
      }
      dailyEngagementText += parts.join(' ') + '\n';
    }
  }

  // Build top posts table
  let topPostsText = '';
  if (cd.topPosts.length > 0) {
    topPostsText = 'Top 10 posts by engagement:\n';
    for (const p of cd.topPosts) {
      topPostsText += `  - [${p.platform}/${p.mediaType}] "${(p.caption || '').slice(0, 60)}..." — ${p.likes} likes, ${p.comments} comments, ${p.shares} shares, ${p.reach} reach\n`;
    }
  }

  // Build post type breakdown
  let postTypeText = '';
  if (cd.postTypeBreakdown.length > 0) {
    postTypeText = 'Post type distribution: ' + cd.postTypeBreakdown.map(t => `${t.type}: ${t.count}`).join(', ');
  }

  const { systemMessage, userMessage, version } = renderTemplate('report-draft', {
    clientName: overview.client.name,
    dateRangeStart: start,
    dateRangeEnd: end,
    socialData: overview.promptContext.socialData || 'No social data available for this period.',
    webData: overview.promptContext.webData,
    buzzwords: overview.promptContext.buzzwords,
    dailyEngagement: dailyEngagementText,
    topPosts: topPostsText,
    postTypeBreakdown: postTypeText,
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
    chartData: cd,
    cached: false,
    usage: result.usage,
    generatedAt: now.toISOString(),
    model: MODEL,
  };
}
