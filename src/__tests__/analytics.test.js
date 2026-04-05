import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../api/app.js';

const mockPrisma = {
  post: { count: vi.fn() },
  postMetric: { aggregate: vi.fn() },
  client: { count: vi.fn(), findUnique: vi.fn() },
  webAnalytic: { findMany: vi.fn() },
  $queryRaw: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  app.set('prisma', mockPrisma);
});

// ─── GET /api/analytics/overview ─────────────────────────────────────────────
describe('GET /api/analytics/overview', () => {
  it('returns 30-day summary totals', async () => {
    mockPrisma.post.count.mockResolvedValue(42);
    mockPrisma.postMetric.aggregate.mockResolvedValue({
      _sum: { likes: 100, shares: 20, saves: 10, commentsCount: 30 },
    });
    mockPrisma.client.count.mockResolvedValue(5);

    const res = await request(app).get('/api/analytics/overview');
    expect(res.status).toBe(200);
    expect(res.body.totalPosts).toBe(42);
    expect(res.body.totalEngagement).toBe(160); // 100+20+10+30
    expect(res.body.activeClients).toBe(5);
    expect(res.body.period).toBe('30d');
  });

  it('handles null sums gracefully (no data yet)', async () => {
    mockPrisma.post.count.mockResolvedValue(0);
    mockPrisma.postMetric.aggregate.mockResolvedValue({
      _sum: { likes: null, shares: null, saves: null, commentsCount: null },
    });
    mockPrisma.client.count.mockResolvedValue(0);

    const res = await request(app).get('/api/analytics/overview');
    expect(res.status).toBe(200);
    expect(res.body.totalEngagement).toBe(0);
  });

  // RED: no try/catch — DB error causes unhandled rejection
  it('returns 500 when the database throws', async () => {
    mockPrisma.post.count.mockRejectedValue(new Error('DB down'));
    const res = await request(app).get('/api/analytics/overview');
    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
  });
});

// ─── GET /api/analytics/client/:slug/buzzwords ───────────────────────────────
describe('GET /api/analytics/client/:slug/buzzwords', () => {
  it('returns buzzwords list', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([
      { word: 'awesome', total_freq: 5, avg_relevance: 0.9 },
    ]);
    const res = await request(app).get('/api/analytics/client/acme/buzzwords');
    expect(res.status).toBe(200);
    expect(res.body[0].word).toBe('awesome');
  });

  // RED: no try/catch
  it('returns 500 when the database throws', async () => {
    mockPrisma.$queryRaw.mockRejectedValue(new Error('query error'));
    const res = await request(app).get('/api/analytics/client/acme/buzzwords');
    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
  });
});

// ─── GET /api/analytics/client/:slug/web ─────────────────────────────────────
describe('GET /api/analytics/client/:slug/web', () => {
  const dailyRows = [
    { date: '2026-03-05', sessions: 100, users: 80, newUsers: 30, pageviews: 200, bounceRate: 0.4, avgSessionDuration: 90 },
    { date: '2026-03-06', sessions: 120, users: 95, newUsers: 40, pageviews: 240, bounceRate: 0.35, avgSessionDuration: 100 },
  ];

  it('returns web analytics with computed totals', async () => {
    mockPrisma.client.findUnique.mockResolvedValue({ id: '1', slug: 'acme', gaPropertyId: 'GA-1', websiteUrl: 'https://acme.com' });
    mockPrisma.webAnalytic.findMany.mockResolvedValueOnce(dailyRows).mockResolvedValueOnce([]);

    const res = await request(app).get('/api/analytics/client/acme/web');
    expect(res.status).toBe(200);
    expect(res.body.totals.sessions).toBe(220);
    expect(res.body.totals.users).toBe(175);
    expect(res.body.daily).toHaveLength(2);
  });

  it('returns 404 when client is not found', async () => {
    mockPrisma.client.findUnique.mockResolvedValue(null);
    const res = await request(app).get('/api/analytics/client/ghost/web');
    expect(res.status).toBe(404);
  });

  // RED: no try/catch
  it('returns 500 when the database throws', async () => {
    mockPrisma.client.findUnique.mockRejectedValue(new Error('timeout'));
    const res = await request(app).get('/api/analytics/client/acme/web');
    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
  });
});
