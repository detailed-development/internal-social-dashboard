// src/lib/analytics/social-overview.js
//
// Builds platformTotals, dailyEngagement, topPosts, and postTypeBreakdown.
// Provides two code paths:
//   - fromReadModel: reads ClientPlatformDailyMetric + ClientPostPerformance
//   - fromRaw: re-aggregates Post + PostMetric + SocialAccount (fallback)
//
// Both paths return the same shape so the feature flag can toggle without
// any downstream consumer change.

import { toIsoDate } from '../reporting/date-utils.js';

const EMPTY = Object.freeze({
  platformTotals: [],
  dailyEngagement: [],
  topPosts: [],
  postTypeBreakdown: [],
});

/** Read-model path — fast, precomputed. */
export async function buildSocialOverviewFromReadModel(prisma, { clientId, windowStart, windowEnd }) {
  const [dailyRows, topRows, mediaGroup] = await Promise.all([
    prisma.clientPlatformDailyMetric.findMany({
      where: { clientId, date: { gte: windowStart, lte: windowEnd } },
      orderBy: [{ date: 'asc' }, { platform: 'asc' }],
    }),
    prisma.clientPostPerformance.findMany({
      where: { clientId, date: { gte: windowStart, lte: windowEnd } },
      orderBy: [{ engagement: 'desc' }, { date: 'desc' }],
      take: 10,
    }),
    prisma.clientPostPerformance.groupBy({
      by: ['mediaType', 'platform'],
      where: { clientId, date: { gte: windowStart, lte: windowEnd } },
      _count: { _all: true },
      _avg: { engagement: true },
      _sum: { engagement: true },
    }),
  ]);

  if (dailyRows.length === 0 && topRows.length === 0) return { ...EMPTY };

  // Platform totals: one row per (socialAccountId, platform, handle).
  const platformAgg = new Map();
  for (const r of dailyRows) {
    const key = `${r.platform}|${r.handle || ''}|${r.socialAccountId || ''}`;
    if (!platformAgg.has(key)) {
      platformAgg.set(key, {
        platform: r.platform, handle: r.handle, followers: r.followerCount ?? 0,
        posts: 0, likes: 0, comments: 0, shares: 0, saves: 0, reach: 0, impressions: 0,
      });
    }
    const p = platformAgg.get(key);
    p.posts       += r.postsCount;
    p.likes       += r.likes;
    p.comments    += r.commentsCount;
    p.shares      += r.shares;
    p.saves       += r.saves;
    p.reach       += r.reach;
    p.impressions += r.impressions;
  }

  // Daily engagement: [{ date, instagram_likes, instagram_comments, ... }]
  const dailyMap = new Map();
  for (const r of dailyRows) {
    const day = toIsoDate(r.date);
    if (!dailyMap.has(day)) dailyMap.set(day, { date: day });
    const e = dailyMap.get(day);
    const p = r.platform.toLowerCase();
    e[`${p}_likes`]       = (e[`${p}_likes`]       || 0) + r.likes;
    e[`${p}_comments`]    = (e[`${p}_comments`]    || 0) + r.commentsCount;
    e[`${p}_reach`]       = (e[`${p}_reach`]       || 0) + r.reach;
    e[`${p}_impressions`] = (e[`${p}_impressions`] || 0) + r.impressions;
  }

  const topPosts = topRows.map((r) => ({
    caption: (r.captionPreview || '').slice(0, 100).replace(/\n/g, ' '),
    platform: r.platform,
    mediaType: r.mediaType,
    publishedAt: toIsoDate(r.date),
    likes: r.likes,
    comments: r.commentsCount,
    shares: r.shares,
    saves: r.saves,
    reach: r.reach,
    impressions: r.impressions,
    engagement: r.engagement,
  }));

  const postTypeBreakdown = mediaGroup
    .map((g) => ({
      type: g.mediaType,
      platform: g.platform,
      count: g._count._all,
      avgEngagement: Math.round(g._avg.engagement ?? 0),
      totalEngagement: g._sum.engagement ?? 0,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    platformTotals: [...platformAgg.values()],
    dailyEngagement: [...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date)),
    topPosts,
    postTypeBreakdown,
  };
}

/** Raw-table fallback — mirrors gatherClientAnalytics() semantics exactly. */
export async function buildSocialOverviewFromRaw(prisma, { clientId, windowStart, windowEnd }) {
  const accounts = await prisma.socialAccount.findMany({
    where: { clientId, tokenStatus: 'ACTIVE' },
    include: {
      posts: {
        where: { publishedAt: { gte: windowStart, lte: endOfDay(windowEnd) } },
        orderBy: { publishedAt: 'desc' },
        include: { metrics: { orderBy: { recordedAt: 'desc' }, take: 1 } },
      },
    },
  });

  const platformTotals = [];
  const dailyMap = new Map();
  const allPosts = [];

  for (const account of accounts) {
    const posts = account.posts;
    if (posts.length === 0) continue;

    const t = posts.reduce(
      (acc, p) => {
        const m = p.metrics[0] || {};
        acc.likes       += m.likes         || 0;
        acc.comments    += m.commentsCount || 0;
        acc.shares      += m.shares        || 0;
        acc.saves       += m.saves         || 0;
        acc.reach       += m.reach         || 0;
        acc.impressions += m.impressions   || 0;
        return acc;
      },
      { likes: 0, comments: 0, shares: 0, saves: 0, reach: 0, impressions: 0 }
    );

    platformTotals.push({
      platform: account.platform,
      handle: account.handle,
      followers: account.followerCount ?? 0,
      posts: posts.length,
      ...t,
    });

    const p = account.platform.toLowerCase();
    for (const post of posts) {
      const m = post.metrics[0] || {};
      const day = toIsoDate(post.publishedAt);
      if (!dailyMap.has(day)) dailyMap.set(day, { date: day });
      const e = dailyMap.get(day);
      e[`${p}_likes`]       = (e[`${p}_likes`]       || 0) + (m.likes         || 0);
      e[`${p}_comments`]    = (e[`${p}_comments`]    || 0) + (m.commentsCount || 0);
      e[`${p}_reach`]       = (e[`${p}_reach`]       || 0) + (m.reach         || 0);
      e[`${p}_impressions`] = (e[`${p}_impressions`] || 0) + (m.impressions   || 0);

      allPosts.push({
        caption: (post.caption || '').slice(0, 100).replace(/\n/g, ' '),
        platform: account.platform,
        mediaType: post.mediaType,
        publishedAt: day,
        likes:       m.likes         || 0,
        comments:    m.commentsCount || 0,
        shares:      m.shares        || 0,
        saves:       m.saves         || 0,
        reach:       m.reach         || 0,
        impressions: m.impressions   || 0,
        engagement:  (m.likes || 0) + (m.commentsCount || 0) + (m.shares || 0) + (m.saves || 0),
      });
    }
  }

  const typeMap = {};
  for (const p of allPosts) {
    const key = `${p.platform}|${p.mediaType}`;
    if (!typeMap[key]) typeMap[key] = { type: p.mediaType, platform: p.platform, count: 0, totalEngagement: 0 };
    typeMap[key].count++;
    typeMap[key].totalEngagement += p.engagement;
  }

  return {
    platformTotals,
    dailyEngagement: [...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date)),
    topPosts: allPosts.sort((a, b) => b.engagement - a.engagement).slice(0, 10),
    postTypeBreakdown: Object.values(typeMap)
      .map((t) => ({
        type: t.type,
        platform: t.platform,
        count: t.count,
        avgEngagement: t.count > 0 ? Math.round(t.totalEngagement / t.count) : 0,
        totalEngagement: t.totalEngagement,
      }))
      .sort((a, b) => b.count - a.count),
  };
}

function endOfDay(d) {
  const e = new Date(d);
  e.setUTCHours(23, 59, 59, 999);
  return e;
}
