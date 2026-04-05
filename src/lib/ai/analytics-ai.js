import { chatCompletion } from './ai-client.js';
import { renderTemplate } from './prompt-template.js';
import { computeCacheKey, hashInput, getCachedResponse, setCachedResponse } from './cache.js';

const MODEL = 'gpt-4o';

/**
 * Gather analytics data for a client, formatted as compact text for prompt injection.
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
            take: 20,
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

  // Social summary
  const socialLines = [];
  for (const account of client.socialAccounts) {
    const posts = account.posts;
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

    socialLines.push(
      `${account.platform} @${account.handle} (${account.followerCount ?? '?'} followers):`,
      `  Posts: ${posts.length} | Likes: ${totalLikes} | Comments: ${totalComments} | Shares: ${totalShares} | Saves: ${totalSaves}`,
      `  Reach: ${totalReach} | Impressions: ${totalImpressions}`,
    );

    // Top 3 posts by engagement
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
  const socialData = socialLines.join('\n');

  // Web analytics (GA4)
  let webData = '';
  if (client.gaPropertyId) {
    const webRows = await prisma.webAnalytic.findMany({
      where: {
        clientId: client.id,
        date: { gte: new Date(dateStart), lte: new Date(dateEnd) },
        source: 'all',
        medium: 'all',
      },
      orderBy: { date: 'desc' },
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
    }

    // Traffic sources
    const sources = await prisma.webAnalytic.findMany({
      where: {
        clientId: client.id,
        date: { gte: new Date(dateStart), lte: new Date(dateEnd) },
        NOT: { source: 'all' },
      },
      orderBy: { sessions: 'desc' },
      take: 10,
    });

    if (sources.length > 0) {
      webData += '\nTop traffic sources:\n';
      webData += sources.map(s => `  ${s.source}/${s.medium}: ${s.sessions} sessions`).join('\n');
    }
  }

  // Buzzwords
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

  return { client, socialData, webData, buzzwords };
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
    maxTokens: 2048,
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
 * Generate a full client-facing report draft.
 */
export async function generateReportDraft(prisma, { clientSlug, dateRangeStart, dateRangeEnd, forceRefresh = false }) {
  const now = new Date();
  const start = dateRangeStart || new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const end = dateRangeEnd || now.toISOString().split('T')[0];

  const data = await gatherClientAnalytics(prisma, clientSlug, start, end);
  if (!data) return { error: 'Client not found', code: 'CLIENT_NOT_FOUND' };

  const { systemMessage, userMessage, version } = renderTemplate('report-draft', {
    clientName: data.client.name,
    dateRangeStart: start,
    dateRangeEnd: end,
    socialData: data.socialData || 'No social data available for this period.',
    webData: data.webData,
    buzzwords: data.buzzwords,
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
    maxTokens: 4096,
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
    cached: false,
    usage: result.usage,
    generatedAt: now.toISOString(),
    model: MODEL,
  };
}
