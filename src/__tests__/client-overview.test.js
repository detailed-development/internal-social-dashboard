import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildClientOverview } from '../lib/analytics/client-overview.js';
import { buildRuleInsights } from '../lib/analytics/rule-insights.js';
import { computePriorWindow, pctChange } from '../lib/analytics/comparison.js';
import { serializeOverviewResponse } from '../lib/analytics/serializers/overview-response.js';

// Shared in-memory Prisma stub that satisfies both code paths from the same
// underlying fixture data. The goal is to prove the read-model and raw-table
// paths produce identical chartData / summary for the same fixture.
function buildFixturePrisma() {
  const windowStart = new Date('2026-04-10T00:00:00Z');
  const windowEnd   = new Date('2026-04-11T00:00:00Z');

  // Raw-side fixtures
  const posts = [
    {
      id: 'p1', socialAccountId: 'a1', publishedAt: new Date('2026-04-10T10:00:00Z'),
      mediaType: 'REEL', caption: 'Cap 1',
      metrics: [{ likes: 10, commentsCount: 2, shares: 1, saves: 0, reach: 100, impressions: 200 }],
      socialAccount: { id: 'a1', platform: 'INSTAGRAM', handle: 'acme-ig', followerCount: 1000, clientId: 'c1' },
    },
    {
      id: 'p2', socialAccountId: 'a1', publishedAt: new Date('2026-04-10T15:00:00Z'),
      mediaType: 'POST', caption: 'Cap 2',
      metrics: [{ likes: 5, commentsCount: 0, shares: 0, saves: 3, reach: 80, impressions: 150 }],
      socialAccount: { id: 'a1', platform: 'INSTAGRAM', handle: 'acme-ig', followerCount: 1000, clientId: 'c1' },
    },
    {
      id: 'p3', socialAccountId: 'a2', publishedAt: new Date('2026-04-11T08:00:00Z'),
      mediaType: 'POST', caption: 'Cap 3',
      metrics: [{ likes: 20, commentsCount: 4, shares: 2, saves: 0, reach: 500, impressions: 900 }],
      socialAccount: { id: 'a2', platform: 'FACEBOOK', handle: 'acme-fb', followerCount: 500, clientId: 'c1' },
    },
  ];

  const socialAccounts = [
    { id: 'a1', clientId: 'c1', platform: 'INSTAGRAM', handle: 'acme-ig', tokenStatus: 'ACTIVE', followerCount: 1000,
      posts: posts.filter((p) => p.socialAccountId === 'a1') },
    { id: 'a2', clientId: 'c1', platform: 'FACEBOOK', handle: 'acme-fb', tokenStatus: 'ACTIVE', followerCount: 500,
      posts: posts.filter((p) => p.socialAccountId === 'a2') },
  ];

  const webAnalytics = [
    { date: new Date('2026-04-10'), source: 'all', medium: 'all', sessions: 100, users: 80, pageviews: 200, newUsers: 15, bounceRate: 0.42, avgSessionDuration: 65.3 },
    { date: new Date('2026-04-11'), source: 'all', medium: 'all', sessions: 110, users: 90, pageviews: 220, newUsers: 18, bounceRate: 0.38, avgSessionDuration: 72.1 },
    { date: new Date('2026-04-10'), source: 'google', medium: 'organic', sessions: 40, users: 30, pageviews: 90, newUsers: 8,  bounceRate: null, avgSessionDuration: null },
    { date: new Date('2026-04-11'), source: 'google', medium: 'organic', sessions: 50, users: 35, pageviews: 110, newUsers: 9, bounceRate: null, avgSessionDuration: null },
    { date: new Date('2026-04-10'), source: '_device', medium: 'mobile', sessions: 60, users: 50, pageviews: 120, newUsers: 10, bounceRate: null, avgSessionDuration: null },
    { date: new Date('2026-04-10'), source: '_page',  medium: '/home',  sessions: 35, users: 25, pageviews: 35,  newUsers: 5,  bounceRate: null, avgSessionDuration: null },
  ];

  // Precomputed read-model fixtures derived from the same raw data
  const platformDaily = [
    { clientId: 'c1', socialAccountId: 'a1', date: new Date('2026-04-10'), platform: 'INSTAGRAM', handle: 'acme-ig', followerCount: 1000, postsCount: 2, likes: 15, commentsCount: 2, shares: 1, saves: 3, reach: 180, impressions: 350 },
    { clientId: 'c1', socialAccountId: 'a2', date: new Date('2026-04-11'), platform: 'FACEBOOK',  handle: 'acme-fb', followerCount: 500,  postsCount: 1, likes: 20, commentsCount: 4, shares: 2, saves: 0, reach: 500, impressions: 900 },
  ];
  const postPerf = [
    { clientId: 'c1', socialAccountId: 'a1', postId: 'p1', date: new Date('2026-04-10'), platform: 'INSTAGRAM', mediaType: 'REEL', captionPreview: 'Cap 1', likes: 10, commentsCount: 2, shares: 1, saves: 0, reach: 100, impressions: 200, engagement: 13 },
    { clientId: 'c1', socialAccountId: 'a1', postId: 'p2', date: new Date('2026-04-10'), platform: 'INSTAGRAM', mediaType: 'POST', captionPreview: 'Cap 2', likes: 5,  commentsCount: 0, shares: 0, saves: 3, reach: 80,  impressions: 150, engagement: 8  },
    { clientId: 'c1', socialAccountId: 'a2', postId: 'p3', date: new Date('2026-04-11'), platform: 'FACEBOOK',  mediaType: 'POST', captionPreview: 'Cap 3', likes: 20, commentsCount: 4, shares: 2, saves: 0, reach: 500, impressions: 900, engagement: 26 },
  ];
  const webDaily = [
    { clientId: 'c1', date: new Date('2026-04-10'), sessions: 100, users: 80, pageviews: 200, newUsers: 15, bounceRateAvg: 0.42, avgSessionDuration: 65.30 },
    { clientId: 'c1', date: new Date('2026-04-11'), sessions: 110, users: 90, pageviews: 220, newUsers: 18, bounceRateAvg: 0.38, avgSessionDuration: 72.10 },
  ];
  const trafficSource = [
    { clientId: 'c1', date: new Date('2026-04-10'), source: 'google', medium: 'organic', sessions: 40, users: 30, pageviews: 90 },
    { clientId: 'c1', date: new Date('2026-04-11'), source: 'google', medium: 'organic', sessions: 50, users: 35, pageviews: 110 },
  ];
  const deviceDaily = [
    { clientId: 'c1', date: new Date('2026-04-10'), device: 'mobile', sessions: 60, users: 50, pageviews: 120 },
  ];
  const pageDaily = [
    { clientId: 'c1', date: new Date('2026-04-10'), path: '/home', sessions: 35, users: 25, pageviews: 35 },
  ];

  return {
    client: {
      findUnique: vi.fn(({ where }) =>
        Promise.resolve(where.slug === 'acme'
          ? { id: 'c1', slug: 'acme', name: 'Acme', websiteUrl: 'https://acme.test', gaPropertyId: '123' }
          : null
        )
      ),
    },
    socialAccount: {
      findMany: vi.fn(({ where, include }) => {
        // Raw path passes: where: { clientId, tokenStatus: 'ACTIVE' },
        // include: { posts: { where: { publishedAt: { gte, lte } } } }.
        const postFilter = include?.posts?.where?.publishedAt || {};
        const accounts = socialAccounts
          .filter((a) => a.clientId === where.clientId && a.tokenStatus === where.tokenStatus)
          .map((a) => ({
            ...a,
            posts: a.posts
              .filter((p) => (postFilter.gte ? p.publishedAt >= postFilter.gte : true))
              .filter((p) => (postFilter.lte ? p.publishedAt <= postFilter.lte : true))
              .sort((a, b) => b.publishedAt - a.publishedAt),
          }));
        return Promise.resolve(accounts);
      }),
      aggregate: vi.fn().mockResolvedValue({ _max: { lastSyncedAt: new Date() } }),
    },
    conversation: { aggregate: vi.fn().mockResolvedValue({ _max: { lastSyncedAt: null } }) },
    webAnalytic: {
      findMany: vi.fn(({ where }) => {
        let filtered = webAnalytics.filter((w) => {
          if (where.date?.gte && w.date < where.date.gte) return false;
          if (where.date?.lte && w.date > where.date.lte) return false;
          if (where.source === 'all' && where.medium === 'all') return w.source === 'all' && w.medium === 'all';
          if (where.source?.notIn) return !where.source.notIn.includes(w.source);
          if (where.source === '_device') return w.source === '_device';
          if (where.source === '_page') return w.source === '_page';
          return false;
        });
        return Promise.resolve(filtered);
      }),
      aggregate: vi.fn().mockResolvedValue({ _max: { date: new Date() } }),
    },
    post: {
      findMany: vi.fn(({ where }) => {
        // Used by read-model social rollup (not called here) AND freshness
        // coverage calc. For freshness, caller passes mediaType filter.
        return Promise.resolve([]);
      }),
      count: vi.fn().mockResolvedValue(0),
    },
    clientPlatformDailyMetric: {
      findMany: vi.fn(({ where }) => Promise.resolve(
        platformDaily.filter((r) =>
          r.clientId === where.clientId &&
          r.date >= where.date.gte && r.date <= where.date.lte
        )
      )),
    },
    clientPostPerformance: {
      findMany: vi.fn(({ where, take, orderBy }) => {
        let arr = postPerf.filter((r) =>
          r.clientId === where.clientId &&
          r.date >= where.date.gte && r.date <= where.date.lte
        );
        if (orderBy) {
          arr = arr.sort((a, b) => b.engagement - a.engagement);
        }
        return Promise.resolve(take ? arr.slice(0, take) : arr);
      }),
      groupBy: vi.fn(({ where }) => {
        const counts = {};
        for (const r of postPerf) {
          if (r.clientId !== where.clientId) continue;
          if (r.date < where.date.gte || r.date > where.date.lte) continue;
          counts[r.mediaType] = (counts[r.mediaType] || 0) + 1;
        }
        return Promise.resolve(Object.entries(counts).map(([mediaType, n]) => ({ mediaType, _count: { _all: n } })));
      }),
    },
    clientWebDailyMetric: {
      findMany: vi.fn(({ where }) => Promise.resolve(
        webDaily.filter((r) => r.clientId === where.clientId && r.date >= where.date.gte && r.date <= where.date.lte)
      )),
    },
    clientTrafficSourceDaily: {
      findMany: vi.fn(({ where }) => Promise.resolve(
        trafficSource.filter((r) => r.clientId === where.clientId && r.date >= where.date.gte && r.date <= where.date.lte)
      )),
    },
    clientDeviceDaily: {
      findMany: vi.fn(({ where }) => Promise.resolve(
        deviceDaily.filter((r) => r.clientId === where.clientId && r.date >= where.date.gte && r.date <= where.date.lte)
      )),
    },
    clientPageDaily: {
      findMany: vi.fn(({ where }) => Promise.resolve(
        pageDaily.filter((r) => r.clientId === where.clientId && r.date >= where.date.gte && r.date <= where.date.lte)
      )),
    },
    clientBuzzwordDaily: {
      groupBy: vi.fn().mockResolvedValue([{ word: 'amazing', _sum: { frequency: 12 } }, { word: 'launch', _sum: { frequency: 5 } }]),
    },
    $queryRaw: vi.fn().mockResolvedValue([{ word: 'amazing', frequency: 12 }, { word: 'launch', frequency: 5 }]),
    windowStart, windowEnd,
  };
}

describe('buildClientOverview', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null for unknown slug', async () => {
    const prisma = buildFixturePrisma();
    const res = await buildClientOverview(prisma, { clientSlug: 'nope', start: '2026-04-10', end: '2026-04-11' });
    expect(res).toBeNull();
  });

  it('returns the canonical payload shape', async () => {
    const prisma = buildFixturePrisma();
    const res = await buildClientOverview(prisma, {
      clientSlug: 'acme', start: '2026-04-10', end: '2026-04-11',
      opts: { useReadModel: true, includePriorPeriod: false },
    });
    expect(res.client).toMatchObject({ slug: 'acme', name: 'Acme' });
    expect(res.range).toEqual({ start: '2026-04-10', end: '2026-04-11' });
    expect(res.summary).toMatchObject({
      totalPosts: 3,
      totalEngagement: 13 + 8 + 26,
      totalSessions: 210,
      totalUsers: 170,
      totalPageviews: 420,
    });
    expect(res.chartData.platformTotals.length).toBe(2);
    expect(res.chartData.topPosts.length).toBeGreaterThan(0);
    expect(res.chartData.trafficSources.length).toBe(1);
    expect(res.ruleInsights).toHaveProperty('wins');
    expect(res.ruleInsights).toHaveProperty('risks');
    expect(res.promptContext.socialData).toContain('acme-ig');
  });

  it('read-model and raw paths produce matching summary + chartData counts', async () => {
    const prisma = buildFixturePrisma();

    const readModel = await buildClientOverview(prisma, {
      clientSlug: 'acme', start: '2026-04-10', end: '2026-04-11',
      opts: { useReadModel: true, includePriorPeriod: false },
    });
    const raw = await buildClientOverview(prisma, {
      clientSlug: 'acme', start: '2026-04-10', end: '2026-04-11',
      opts: { useReadModel: false, includePriorPeriod: false },
    });

    // Parity gate: key aggregate values must match across paths.
    expect(readModel.summary.totalPosts).toBe(raw.summary.totalPosts);
    expect(readModel.summary.totalEngagement).toBe(raw.summary.totalEngagement);
    expect(readModel.summary.totalReach).toBe(raw.summary.totalReach);
    expect(readModel.summary.totalSessions).toBe(raw.summary.totalSessions);
    expect(readModel.chartData.platformTotals.length).toBe(raw.chartData.platformTotals.length);
    expect(readModel.chartData.topPosts.length).toBe(raw.chartData.topPosts.length);
    expect(readModel.chartData.postTypeBreakdown.length).toBe(raw.chartData.postTypeBreakdown.length);
    expect(readModel.chartData.trafficSources.length).toBe(raw.chartData.trafficSources.length);
    expect(readModel.chartData.deviceBreakdown.length).toBe(raw.chartData.deviceBreakdown.length);
    expect(readModel.chartData.topPages.length).toBe(raw.chartData.topPages.length);
  });
});

describe('buildRuleInsights', () => {
  it('flags STALE_SYNC for >24h-old social data', () => {
    const hoursAgo = (h) => new Date(Date.now() - h * 3600_000).toISOString();
    const insights = buildRuleInsights({
      summary: { totalPosts: 3, totalEngagement: 100 },
      priorSummary: null,
      chartData: { topPosts: [], trafficSources: [] },
      freshness: { socialLastSyncedAt: hoursAgo(30), messagesLastSyncedAt: null, webAnalyticsLastSyncedAt: null, transcriptionCoveragePct: null },
    });
    expect(insights.risks.find((r) => r.code === 'STALE_SYNC')).toBeDefined();
  });

  it('flags NO_POSTS_IN_RANGE when posts==0', () => {
    const insights = buildRuleInsights({
      summary: { totalPosts: 0, totalEngagement: 0 },
      priorSummary: null,
      chartData: { topPosts: [], trafficSources: [] },
      freshness: { socialLastSyncedAt: null, messagesLastSyncedAt: null, webAnalyticsLastSyncedAt: null, transcriptionCoveragePct: null },
    });
    expect(insights.risks.find((r) => r.code === 'NO_POSTS_IN_RANGE')).toBeDefined();
    expect(insights.recommendations.length).toBeGreaterThan(0);
  });

  it('flags STRONG_ENGAGEMENT_WEEK when +20%+ vs prior', () => {
    const insights = buildRuleInsights({
      summary: { totalPosts: 10, totalEngagement: 200 },
      priorSummary: { totalPosts: 10, totalEngagement: 100 },
      chartData: { topPosts: [], trafficSources: [] },
      freshness: { socialLastSyncedAt: new Date().toISOString(), transcriptionCoveragePct: null },
    });
    expect(insights.wins.find((w) => w.code === 'STRONG_ENGAGEMENT_WEEK')).toBeDefined();
  });
});

describe('comparison helpers', () => {
  it('pctChange handles zero baseline', () => {
    expect(pctChange(10, 0)).toBeNull();
    expect(pctChange(10, null)).toBeNull();
    expect(pctChange(120, 100)).toBe(20);
    expect(pctChange(80, 100)).toBe(-20);
  });

  it('computePriorWindow produces matching-length window', () => {
    const { priorStart, priorEnd, days } = computePriorWindow('2026-04-10', '2026-04-16');
    expect(days).toBe(7);
    expect(priorEnd.toISOString().slice(0, 10)).toBe('2026-04-09');
    expect(priorStart.toISOString().slice(0, 10)).toBe('2026-04-03');
  });
});

describe('serializeOverviewResponse', () => {
  it('omits promptContext by default', () => {
    const out = serializeOverviewResponse({
      client: {}, range: {}, freshness: {}, summary: {}, priorSummary: null,
      chartData: {}, ruleInsights: {}, promptContext: { socialData: 'secret' },
    });
    expect(out.apiVersion).toBe('overview/v1');
    expect(out.promptContext).toBeUndefined();
  });

  it('includes promptContext when opt-in', () => {
    const out = serializeOverviewResponse(
      { client: {}, range: {}, freshness: {}, summary: {}, priorSummary: null, chartData: {}, ruleInsights: {}, promptContext: { socialData: 's' } },
      { includePromptContext: true }
    );
    expect(out.promptContext).toEqual({ socialData: 's' });
  });
});
