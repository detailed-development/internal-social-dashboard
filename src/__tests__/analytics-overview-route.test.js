import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../api/app.js';

// Stub just enough Prisma surface for buildClientOverview's raw fallback.
const mockPrisma = {
  client: {
    findUnique: vi.fn(),
  },
  socialAccount: {
    findMany: vi.fn().mockResolvedValue([]),
    aggregate: vi.fn().mockResolvedValue({ _max: { lastSyncedAt: null } }),
  },
  conversation: {
    aggregate: vi.fn().mockResolvedValue({ _max: { lastSyncedAt: null, lastMessageAt: null } }),
  },
  webAnalytic: {
    findMany: vi.fn().mockResolvedValue([]),
    aggregate: vi.fn().mockResolvedValue({ _max: { date: null } }),
  },
  post: {
    aggregate: vi.fn().mockResolvedValue({ _max: { publishedAt: null } }),
    count: vi.fn().mockResolvedValue(0),
  },
  postMetric: {
    aggregate: vi.fn().mockResolvedValue({ _max: { recordedAt: null } }),
  },
  comment: {
    aggregate: vi.fn().mockResolvedValue({ _max: { postedAt: null } }),
  },
  $queryRaw: vi.fn().mockResolvedValue([]),
  // read-model tables (unused when flag is off, but guard against crashes)
  clientPlatformDailyMetric: { findMany: vi.fn().mockResolvedValue([]) },
  clientPostPerformance: {
    findMany: vi.fn().mockResolvedValue([]),
    groupBy: vi.fn().mockResolvedValue([]),
  },
  clientWebDailyMetric: { findMany: vi.fn().mockResolvedValue([]) },
  clientTrafficSourceDaily: { findMany: vi.fn().mockResolvedValue([]) },
  clientDeviceDaily: { findMany: vi.fn().mockResolvedValue([]) },
  clientPageDaily: { findMany: vi.fn().mockResolvedValue([]) },
  clientBuzzwordDaily: { groupBy: vi.fn().mockResolvedValue([]) },
};

beforeEach(() => {
  vi.clearAllMocks();
  app.set('prisma', mockPrisma);
  delete process.env.USE_REPORTING_READ_MODEL;
});

describe('GET /api/analytics/clients/:slug/overview', () => {
  it('returns 404 for unknown slug', async () => {
    mockPrisma.client.findUnique.mockResolvedValueOnce(null);
    const res = await request(app).get('/api/analytics/clients/nope/overview');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('returns 200 with canonical overview shape for valid slug', async () => {
    mockPrisma.client.findUnique.mockResolvedValueOnce({
      id: 'c1', slug: 'acme', name: 'Acme', websiteUrl: null, gaPropertyId: null,
    });
    // Prior-period call (second findUnique call returns same client)
    mockPrisma.client.findUnique.mockResolvedValueOnce({
      id: 'c1', slug: 'acme', name: 'Acme', websiteUrl: null, gaPropertyId: null,
    });

    const res = await request(app)
      .get('/api/analytics/clients/acme/overview?start=2026-04-01&end=2026-04-10');

    expect(res.status).toBe(200);
    expect(res.body.apiVersion).toBe('overview/v1');
    expect(res.body.client.slug).toBe('acme');
    expect(res.body.range).toMatchObject({ start: '2026-04-01', end: '2026-04-10' });
    expect(res.body.summary).toHaveProperty('totalPosts');
    expect(res.body.summary).toHaveProperty('totalEngagement');
    expect(res.body.summary).toHaveProperty('totalSessions');
    expect(res.body.chartData).toHaveProperty('platformTotals');
    expect(res.body.chartData).toHaveProperty('dailyTraffic');
    expect(res.body.ruleInsights).toHaveProperty('wins');
    expect(res.body.freshness).toHaveProperty('socialLastSyncedAt');
    expect(res.body.freshness).toHaveProperty('socialLastChangedAt');
    expect(res.body.freshness).toHaveProperty('socialMetricsLastRefreshedAt');
    expect(res.body.freshness).toHaveProperty('messagesLastChangedAt');
    // promptContext must be omitted from public API
    expect(res.body.promptContext).toBeUndefined();
  });

  it('does not call OpenAI or any AI modules', async () => {
    mockPrisma.client.findUnique.mockResolvedValue({
      id: 'c1', slug: 'acme', name: 'Acme', websiteUrl: null, gaPropertyId: null,
    });

    // No mock for OpenAI — if it were called, the request would blow up.
    const res = await request(app)
      .get('/api/analytics/clients/acme/overview?start=2026-04-01&end=2026-04-10');

    expect(res.status).toBe(200);
  });
});
