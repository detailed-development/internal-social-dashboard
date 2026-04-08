import { chatCompletion } from './ai-client.js';
import { renderTemplate } from './prompt-template.js';
import { computeCacheKey, hashInput, getCachedResponse, setCachedResponse } from './cache.js';

const MODEL = 'gpt-4o-mini';

/**
 * Gather analytics data for a client, formatted as compact text for prompt injection.
 * Also builds structured chartData for frontend graph rendering.
 */
async function gatherClientAnalytics(prisma, clientSlug, dateStart, dateEnd) {
  const client = await prisma.client.findUnique({
    where: { slug: clientSlug },
    include: {
      socialAccounts: {
        where: { tokenStatus: 'ACTIVE' },
        include: {
          posts: {
            where: { publishedAt: { gte: new Date(dateStart), lte: new Date(dateEnd) } },
            orderBy: { publishedAt: 'desc' },
            take: 50,
            include: {
              metrics: { orderBy: { recordedAt: 'desc' }, take: 1 },
              comments: { take: 5, orderBy: { postedAt: 'desc' } },
            },
          },
        },
      },
    },
  });

  if (!client) return null;

  // ── Chart data structures ──────────────────────────────────────────
  const chartData = {
    // Daily engagement by platform: [{ date, instagram_likes, instagram_comments, facebook_likes, ... }]
    dailyEngagement: [],
    // Per-platform totals: [{ platform, likes, comments, shares, saves, reach, impressions }]
    platformTotals: [],
    // Top posts ranked by engagement: [{ caption, platform, likes, comments, shares, reach, mediaType }]
    topPosts: [],
    // Post type breakdown: [{ type, count }]
    postTypeBreakdown: [],
    // GA4 daily traffic: [{ date, sessions, users, pageviews, bounceRate }]
    dailyTraffic: [],
    // Traffic sources: [{ source, medium, sessions, users }]
    trafficSources: [],
  };

  // ── Social summary + chart data ────────────────────────────────────
  const socialLines = [];
  const dailyMap = new Map(); // date → { platform_metric: value }
  const allPosts = [];

  for (const account of client.socialAccounts) {
    const posts = account.posts;
    const plat = account.platform.toLowerCase(); // instagram / facebook

    if (posts.length === 0) {
      socialLines.push(`${account.platform} @${account.handle}: No posts in this period.`);
      continue;
    }

    const totalLikes = posts.reduce((s, p) => s + (p.metrics[0]?.likes || 0), 0);
    const totalComments = posts.reduce((s, p) => s + (p.metrics[0]?.commentsCount || 0), 0);
    const totalShares = posts.reduce((s, p) => s + (p.metrics[0]?.shares || 0), 0);
    const totalSaves = posts.reduce((s, p) => s + (p.metrics[0]?.saves || 0), 0);
    const totalReach = posts.reduce((s, p) => s + (p.metrics[0]?.reach || 0), 0);
    const totalImpressions = posts.reduce((s, p) => s + (p.metrics[0]?.impressions || 0), 0);

    chartData.platformTotals.push({
      platform: account.platform,
      handle: account.handle,
      followers: account.followerCount ?? 0,
      posts: posts.length,
      likes: totalLikes,
      comments: totalComments,
      shares: totalShares,
      saves: totalSaves,
      reach: totalReach,
      impressions: totalImpressions,
    });

    socialLines.push(
      `${account.platform} @${account.handle} (${account.followerCount ?? '?'} followers):`,
      `  Posts: ${posts.length} | Likes: ${totalLikes} | Comments: ${totalComments} | Shares: ${totalShares} | Saves: ${totalSaves}`,
      `  Reach: ${totalReach} | Impressions: ${totalImpressions}`,
    );

    // Build daily engagement map + collect all posts for ranking
    for (const post of posts) {
      const m = post.metrics[0] || {};
      const day = post.publishedAt.toISOString().split('T')[0];

      if (!dailyMap.has(day)) dailyMap.set(day, { date: day });
      const entry = dailyMap.get(day);
      entry[`${plat}_likes`] = (entry[`${plat}_likes`] || 0) + (m.likes || 0);
      entry[`${plat}_comments`] = (entry[`${plat}_comments`] || 0) + (m.commentsCount || 0);
      entry[`${plat}_reach`] = (entry[`${plat}_reach`] || 0) + (m.reach || 0);
      entry[`${plat}_impressions`] = (entry[`${plat}_impressions`] || 0) + (m.impressions || 0);

      allPosts.push({
        caption: (post.caption || '').slice(0, 100).replace(/\n/g, ' '),
        platform: account.platform,
        mediaType: post.mediaType,
        publishedAt: day,
        likes: m.likes || 0,
        comments: m.commentsCount || 0,
        shares: m.shares || 0,
        saves: m.saves || 0,
        reach: m.reach || 0,
        impressions: m.impressions || 0,
        engagement: (m.likes || 0) + (m.commentsCount || 0) + (m.shares || 0) + (m.saves || 0),
      });
    }

    // Top posts for text summary
    const sorted = [...posts].sort((a, b) => {
      const ae = (a.metrics[0]?.likes || 0) + (a.metrics[0]?.commentsCount || 0) + (a.metrics[0]?.shares || 0);
      const be = (b.metrics[0]?.likes || 0) + (b.metrics[0]?.commentsCount || 0) + (b.metrics[0]?.shares || 0);
      return be - ae;
    });

    socialLines.push('  Top posts:');
    for (const post of sorted.slice(0, 3)) {
      const m = post.metrics[0] || {};
      const caption = (post.caption || '').slice(0, 80).replace(/\n/g, ' ');
      socialLines.push(
        `    - "${caption}..." (${post.mediaType}, ${m.likes || 0} likes, ${m.commentsCount || 0} comments, ${m.reach || 0} reach)`
      );
    }
  }

  // Finalize chart data from social
  chartData.dailyEngagement = [...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date));
  chartData.topPosts = allPosts.sort((a, b) => b.engagement - a.engagement).slice(0, 10);

  // Post type breakdown
  const typeCount = {};
  for (const p of allPosts) {
    typeCount[p.mediaType] = (typeCount[p.mediaType] || 0) + 1;
  }
  chartData.postTypeBreakdown = Object.entries(typeCount).map(([type, count]) => ({ type, count }));

  const socialData = socialLines.join('\n');

  // ── Web analytics (GA4) + chart data ───────────────────────────────
  let webData = '';
  if (client.gaPropertyId) {
    const webRows = await prisma.webAnalytic.findMany({
      where: {
        clientId: client.id,
        date: { gte: new Date(dateStart), lte: new Date(dateEnd) },
        source: 'all',
        medium: 'all',
      },
      orderBy: { date: 'asc' },
    });

    if (webRows.length > 0) {
      const totalSessions = webRows.reduce((s, r) => s + r.sessions, 0);
      const totalUsers = webRows.reduce((s, r) => s + r.users, 0);
      const totalPageviews = webRows.reduce((s, r) => s + r.pageviews, 0);
      const avgBounce = webRows.reduce((s, r) => s + (r.bounceRate || 0), 0) / webRows.length;
      const avgDuration = webRows.reduce((s, r) => s + (r.avgSessionDuration || 0), 0) / webRows.length;

      webData = [
        `Sessions: ${totalSessions} | Users: ${totalUsers} | Pageviews: ${totalPageviews}`,
        `Avg Bounce Rate: ${avgBounce.toFixed(1)}% | Avg Session Duration: ${avgDuration.toFixed(1)}s`,
        `Data points: ${webRows.length} days`,
      ].join('\n');

      // Daily traffic chart data
      chartData.dailyTraffic = webRows.map(r => ({
        date: r.date.toISOString().split('T')[0],
        sessions: r.sessions,
        users: r.users,
        pageviews: r.pageviews,
        bounceRate: r.bounceRate ? parseFloat(r.bounceRate.toFixed(1)) : null,
        avgSessionDuration: r.avgSessionDuration ? parseFloat(r.avgSessionDuration.toFixed(1)) : null,
      }));

      // Daily engagement text for prompt
      webData += `\nDaily breakdown (last ${Math.min(webRows.length, 14)} days):\n`;
      for (const r of webRows.slice(-14)) {
        webData += `  ${r.date.toISOString().split('T')[0]}: ${r.sessions} sessions, ${r.users} users, ${r.pageviews} pageviews\n`;
      }
    }

    // Traffic sources
    const sources = await prisma.webAnalytic.findMany({
      where: {
        clientId: client.id,
        date: { gte: new Date(dateStart), lte: new Date(dateEnd) },
        source: { notIn: ['all', '_device', '_page'] },
      },
      orderBy: { sessions: 'desc' },
      take: 15,
    });

    if (sources.length > 0) {
      const srcMap = new Map();
      for (const s of sources) {
        const key = `${s.source}/${s.medium}`;
        if (!srcMap.has(key)) srcMap.set(key, { source: s.source, medium: s.medium, sessions: 0, users: 0 });
        const e = srcMap.get(key);
        e.sessions += s.sessions;
        e.users += s.users;
      }
      const srcArr = [...srcMap.values()].sort((a, b) => b.sessions - a.sessions).slice(0, 10);

      chartData.trafficSources = srcArr;
      webData += '\nTop traffic sources:\n';
      webData += srcArr.map(s => `  ${s.source}/${s.medium}: ${s.sessions} sessions, ${s.users} users`).join('\n');
    }

    // Device breakdown
    const devices = await prisma.webAnalytic.findMany({
      where: { clientId: client.id, source: '_device' },
      orderBy: { sessions: 'desc' },
    });

    if (devices.length > 0) {
      const totalDeviceSessions = devices.reduce((s, d) => s + d.sessions, 0);
      chartData.deviceBreakdown = devices.map(d => ({ device: d.medium, sessions: d.sessions, users: d.users }));
      webData += '\nDevice breakdown:\n';
      webData += devices.map(d => {
        const pct = totalDeviceSessions ? ((d.sessions / totalDeviceSessions) * 100).toFixed(1) : '0';
        return `  ${d.medium}: ${d.sessions} sessions (${pct}%), ${d.users} users`;
      }).join('\n');
    }

    // Top landing pages
    const pages = await prisma.webAnalytic.findMany({
      where: { clientId: client.id, source: '_page' },
      orderBy: { sessions: 'desc' },
      take: 10,
    });

    if (pages.length > 0) {
      chartData.topPages = pages.map(p => ({ path: p.medium, sessions: p.sessions, pageviews: p.pageviews }));
      webData += '\nTop landing pages:\n';
      webData += pages.map(p => `  ${p.medium}: ${p.sessions} sessions, ${p.pageviews} pageviews`).join('\n');
    }

    // Engagement rate (computed from bounce rate)
    const engagementRate = avgBounce != null ? ((1 - avgBounce) * 100).toFixed(1) : null;
    if (engagementRate) {
      webData += `\nEngagement Rate: ${engagementRate}% (1 - bounce rate)`;
    }
  }

  // ── Buzzwords ──────────────────────────────────────────────────────
  let buzzwords = '';
  try {
    const words = await prisma.$queryRaw`
      SELECT b.word, SUM(b.frequency)::int AS total_freq
      FROM buzzwords b
      LEFT JOIN comments c ON b.comment_id = c.id
      LEFT JOIN transcriptions t ON b.transcription_id = t.id
      LEFT JOIN posts p ON c.post_id = p.id OR t.post_id = p.id
      LEFT JOIN social_accounts sa ON p.social_account_id = sa.id
      LEFT JOIN clients cl ON sa.client_id = cl.id
      WHERE cl.slug = ${clientSlug}
      GROUP BY b.word
      ORDER BY total_freq DESC
      LIMIT 15
    `;
    if (words.length > 0) {
      buzzwords = words.map(w => `${w.word} (${w.total_freq})`).join(', ');
    }
  } catch (_) {}

  return { client, socialData, webData, buzzwords, chartData };
}

/**
 * Generate weekly insights for a client.
 */
export async function generateWeeklyInsights(prisma, { clientSlug, dateRangeStart, dateRangeEnd, forceRefresh = false }) {
  const now = new Date();
  const start = dateRangeStart || new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const end = dateRangeEnd || now.toISOString().split('T')[0];

  const data = await gatherClientAnalytics(prisma, clientSlug, start, end);
  if (!data) return { error: 'Client not found', code: 'CLIENT_NOT_FOUND' };

  const { systemMessage, userMessage, version } = renderTemplate('weekly-insights', {
    clientName: data.client.name,
    dateRangeStart: start,
    dateRangeEnd: end,
    socialData: data.socialData || 'No social data available for this period.',
    webData: data.webData,
    buzzwords: data.buzzwords,
  });

  const inputHash = hashInput({ clientSlug, start, end });
  const cacheKey = computeCacheKey({
    feature: 'weekly-insights',
    clientId: data.client.id,
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
    clientId: data.client.id,
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

  const data = await gatherClientAnalytics(prisma, clientSlug, start, end);
  if (!data) return { error: 'Client not found', code: 'CLIENT_NOT_FOUND' };

  // Build a compact daily-engagement table for the prompt so the AI can reference trends
  let dailyEngagementText = '';
  if (data.chartData.dailyEngagement.length > 0) {
    dailyEngagementText = 'Daily social engagement:\n';
    for (const d of data.chartData.dailyEngagement.slice(-14)) {
      const parts = [`  ${d.date}:`];
      for (const key of Object.keys(d)) {
        if (key !== 'date') parts.push(`${key}=${d[key]}`);
      }
      dailyEngagementText += parts.join(' ') + '\n';
    }
  }

  // Build top posts table
  let topPostsText = '';
  if (data.chartData.topPosts.length > 0) {
    topPostsText = 'Top 10 posts by engagement:\n';
    for (const p of data.chartData.topPosts) {
      topPostsText += `  - [${p.platform}/${p.mediaType}] "${p.caption.slice(0, 60)}..." — ${p.likes} likes, ${p.comments} comments, ${p.shares} shares, ${p.reach} reach\n`;
    }
  }

  // Build post type breakdown
  let postTypeText = '';
  if (data.chartData.postTypeBreakdown.length > 0) {
    postTypeText = 'Post type distribution: ' + data.chartData.postTypeBreakdown.map(t => `${t.type}: ${t.count}`).join(', ');
  }

  const { systemMessage, userMessage, version } = renderTemplate('report-draft', {
    clientName: data.client.name,
    dateRangeStart: start,
    dateRangeEnd: end,
    socialData: data.socialData || 'No social data available for this period.',
    webData: data.webData,
    buzzwords: data.buzzwords,
    dailyEngagement: dailyEngagementText,
    topPosts: topPostsText,
    postTypeBreakdown: postTypeText,
  });

  const inputHash = hashInput({ clientSlug, start, end });
  const cacheKey = computeCacheKey({
    feature: 'report-draft',
    clientId: data.client.id,
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
        chartData: data.chartData,
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
    clientId: data.client.id,
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
    chartData: data.chartData,
    cached: false,
    usage: result.usage,
    generatedAt: now.toISOString(),
    model: MODEL,
  };
}
