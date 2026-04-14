import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rebuildSocialRollups } from '../lib/reporting/social-rollup.js';
import { rebuildWebRollups } from '../lib/reporting/web-rollup.js';
import { refreshClientReportingWindow } from '../lib/reporting/refresh-window.js';
import { toUtcDateOnly, toIsoDate, dateWindows } from '../lib/reporting/date-utils.js';

function makePrisma() {
  // Track all createMany inputs and $transaction payloads for assertions.
  const writes = {
    platformDaily: [],
    postPerformance: [],
    webDaily: [],
    trafficSource: [],
    device: [],
    page: [],
    buzzword: [],
  };

  const captureCreateMany = (bucket) =>
    vi.fn(({ data }) => {
      writes[bucket].push(...(Array.isArray(data) ? data : [data]));
      return Promise.resolve({ count: Array.isArray(data) ? data.length : 1 });
    });

  const prisma = {
    post: { findMany: vi.fn() },
    webAnalytic: { findMany: vi.fn() },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(async (ops) => {
      for (const op of ops) await op;
    }),
    clientPlatformDailyMetric: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      createMany: captureCreateMany('platformDaily'),
    },
    clientPostPerformance: {
      upsert: vi.fn(({ create }) => {
        writes.postPerformance.push(create);
        return Promise.resolve(create);
      }),
    },
    clientWebDailyMetric: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      createMany: captureCreateMany('webDaily'),
    },
    clientTrafficSourceDaily: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      createMany: captureCreateMany('trafficSource'),
    },
    clientDeviceDaily: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      createMany: captureCreateMany('device'),
    },
    clientPageDaily: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      createMany: captureCreateMany('page'),
    },
    clientBuzzwordDaily: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      createMany: captureCreateMany('buzzword'),
    },
  };

  return { prisma, writes };
}

describe('date-utils', () => {
  it('toUtcDateOnly strips time to 00:00 UTC', () => {
    const d = toUtcDateOnly('2026-04-12T14:23:45.678Z');
    expect(d.toISOString()).toBe('2026-04-12T00:00:00.000Z');
  });

  it('dateWindows splits a range into inclusive batches', () => {
    const windows = [...dateWindows('2026-04-01', '2026-04-30', 10)];
    expect(windows.length).toBe(3);
    expect(toIsoDate(windows[0][0])).toBe('2026-04-01');
    expect(toIsoDate(windows[0][1])).toBe('2026-04-10');
    expect(toIsoDate(windows[1][0])).toBe('2026-04-11');
    expect(toIsoDate(windows[1][1])).toBe('2026-04-20');
    expect(toIsoDate(windows[2][0])).toBe('2026-04-21');
    expect(toIsoDate(windows[2][1])).toBe('2026-04-30');
  });
});

describe('rebuildSocialRollups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('aggregates posts into per-account daily rows and emits one performance row per post', async () => {
    const { prisma, writes } = makePrisma();
    prisma.post.findMany.mockResolvedValueOnce([
      // Two Instagram posts on the same day
      {
        id: 'p1', socialAccountId: 'a1', publishedAt: new Date('2026-04-10T10:00:00Z'),
        mediaType: 'REEL', caption: 'cap1',
        metrics: [{ likes: 10, commentsCount: 2, shares: 1, saves: 0, reach: 100, impressions: 200 }],
        socialAccount: { id: 'a1', platform: 'INSTAGRAM', handle: 'acme', followerCount: 1000, clientId: 'c1' },
      },
      {
        id: 'p2', socialAccountId: 'a1', publishedAt: new Date('2026-04-10T15:00:00Z'),
        mediaType: 'POST', caption: 'cap2',
        metrics: [{ likes: 5, commentsCount: 0, shares: 0, saves: 3, reach: 80, impressions: 150 }],
        socialAccount: { id: 'a1', platform: 'INSTAGRAM', handle: 'acme', followerCount: 1000, clientId: 'c1' },
      },
      // One Facebook post on a different day
      {
        id: 'p3', socialAccountId: 'a2', publishedAt: new Date('2026-04-11T08:00:00Z'),
        mediaType: 'POST', caption: 'cap3',
        metrics: [{ likes: 20, commentsCount: 4, shares: 2, saves: 0, reach: 500, impressions: 900 }],
        socialAccount: { id: 'a2', platform: 'FACEBOOK', handle: 'acme-fb', followerCount: 500, clientId: 'c1' },
      },
    ]);

    const res = await rebuildSocialRollups(prisma, {
      clientId: 'c1',
      dateStart: '2026-04-10',
      dateEnd: '2026-04-11',
    });

    expect(res.postsWritten).toBe(3);
    expect(res.dailyMetricsWritten).toBe(2);

    // One row per (account, day). Instagram: 2 posts combined; Facebook: 1 post.
    const ig = writes.platformDaily.find((r) => r.platform === 'INSTAGRAM');
    expect(ig).toMatchObject({
      clientId: 'c1', socialAccountId: 'a1', platform: 'INSTAGRAM',
      postsCount: 2,
      likes: 15, commentsCount: 2, shares: 1, saves: 3,
      reach: 180, impressions: 350,
    });

    const fb = writes.platformDaily.find((r) => r.platform === 'FACEBOOK');
    expect(fb.postsCount).toBe(1);
    expect(fb.likes).toBe(20);

    // engagement = likes + commentsCount + shares + saves
    expect(writes.postPerformance.find((r) => r.postId === 'p1').engagement).toBe(10 + 2 + 1 + 0);
    expect(writes.postPerformance.find((r) => r.postId === 'p3').engagement).toBe(20 + 4 + 2 + 0);

    // Caption preview truncated to 160 chars
    expect(writes.postPerformance[0].captionPreview.length).toBeLessThanOrEqual(160);
  });

  it('handles posts with no metric row (treats values as 0)', async () => {
    const { prisma, writes } = makePrisma();
    prisma.post.findMany.mockResolvedValueOnce([
      {
        id: 'p1', socialAccountId: 'a1', publishedAt: new Date('2026-04-10T10:00:00Z'),
        mediaType: 'POST', caption: null,
        metrics: [],
        socialAccount: { id: 'a1', platform: 'INSTAGRAM', handle: 'acme', followerCount: null, clientId: 'c1' },
      },
    ]);

    const res = await rebuildSocialRollups(prisma, {
      clientId: 'c1',
      dateStart: '2026-04-10',
      dateEnd: '2026-04-10',
    });

    expect(res.postsWritten).toBe(1);
    const row = writes.postPerformance[0];
    expect(row).toMatchObject({ likes: 0, engagement: 0 });
    expect(row.captionPreview).toBeNull();
  });
});

describe('rebuildWebRollups', () => {
  beforeEach(() => vi.clearAllMocks());

  it('routes rows to the correct table based on source sentinels', async () => {
    const { prisma, writes } = makePrisma();
    prisma.webAnalytic.findMany.mockResolvedValueOnce([
      { date: new Date('2026-04-10T00:00:00Z'), source: 'all',       medium: 'all',     sessions: 100, users: 80,  pageviews: 200, newUsers: 15, bounceRate: 0.42, avgSessionDuration: 65.3 },
      { date: new Date('2026-04-10T00:00:00Z'), source: 'google',    medium: 'organic', sessions: 40,  users: 30,  pageviews: 90,  newUsers: 8,  bounceRate: null, avgSessionDuration: null },
      { date: new Date('2026-04-10T00:00:00Z'), source: '_device',   medium: 'mobile',  sessions: 60,  users: 50,  pageviews: 120, newUsers: 10, bounceRate: null, avgSessionDuration: null },
      { date: new Date('2026-04-10T00:00:00Z'), source: '_page',     medium: '/home',   sessions: 35,  users: 25,  pageviews: 35,  newUsers: 5,  bounceRate: null, avgSessionDuration: null },
    ]);

    const res = await rebuildWebRollups(prisma, {
      clientId: 'c1',
      dateStart: '2026-04-10',
      dateEnd: '2026-04-10',
    });

    expect(res).toEqual({ overviewWritten: 1, sourcesWritten: 1, devicesWritten: 1, pagesWritten: 1 });

    expect(writes.webDaily[0]).toMatchObject({ sessions: 100, users: 80, pageviews: 200, newUsers: 15 });
    expect(writes.trafficSource[0]).toMatchObject({ source: 'google', medium: 'organic', sessions: 40 });
    expect(writes.device[0]).toMatchObject({ device: 'mobile', sessions: 60 });
    expect(writes.page[0]).toMatchObject({ path: '/home', sessions: 35 });
  });

  it('ignores rows with null source/medium or unknown sentinels', async () => {
    const { prisma, writes } = makePrisma();
    prisma.webAnalytic.findMany.mockResolvedValueOnce([
      { date: new Date('2026-04-10T00:00:00Z'), source: null, medium: null, sessions: 1, users: 1, pageviews: 1, newUsers: 0, bounceRate: null, avgSessionDuration: null },
    ]);

    const res = await rebuildWebRollups(prisma, {
      clientId: 'c1', dateStart: '2026-04-10', dateEnd: '2026-04-10',
    });

    expect(res).toEqual({ overviewWritten: 0, sourcesWritten: 0, devicesWritten: 0, pagesWritten: 0 });
    expect(writes.webDaily.length).toBe(0);
  });
});

describe('refreshClientReportingWindow', () => {
  beforeEach(() => vi.clearAllMocks());

  it('aggregates all three rollups and collects per-scope errors without aborting', async () => {
    const { prisma } = makePrisma();
    prisma.post.findMany.mockRejectedValueOnce(new Error('social boom'));
    prisma.webAnalytic.findMany.mockResolvedValueOnce([]);
    prisma.$queryRaw.mockResolvedValueOnce([]);

    const res = await refreshClientReportingWindow(prisma, {
      clientId: 'c1', dateStart: '2026-04-10', dateEnd: '2026-04-10',
    });

    expect(res.social).toBeNull();
    expect(res.errors).toEqual([{ scope: 'social', message: 'social boom' }]);
    // Web + buzzwords still ran:
    expect(res.web).toMatchObject({ overviewWritten: 0 });
    expect(res.buzzwords).toMatchObject({ rowsWritten: 0 });
  });
});
