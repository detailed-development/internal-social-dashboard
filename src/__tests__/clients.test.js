import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../api/app.js';

// ─── Mock Prisma ──────────────────────────────────────────────────────────────
const mockPrisma = {
  client: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  socialAccount: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  app.set('prisma', mockPrisma);
});

// ─── GET /api/clients ─────────────────────────────────────────────────────────
describe('GET /api/clients', () => {
  it('returns 200 with client list', async () => {
    mockPrisma.client.findMany.mockResolvedValue([
      { id: '1', name: 'Acme', slug: 'acme', socialAccounts: [] },
    ]);
    const res = await request(app).get('/api/clients');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].slug).toBe('acme');
  });

  // RED: no try/catch in the route — DB error causes unhandled rejection, not a 500
  it('returns 500 when the database throws', async () => {
    mockPrisma.client.findMany.mockRejectedValue(new Error('DB connection lost'));
    const res = await request(app).get('/api/clients');
    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
  });
});

// ─── POST /api/clients ────────────────────────────────────────────────────────
describe('POST /api/clients', () => {
  it('creates a client and returns 201', async () => {
    mockPrisma.client.create.mockResolvedValue({ id: '2', name: 'Beta Co', slug: 'beta-co' });
    const res = await request(app)
      .post('/api/clients')
      .send({ name: 'Beta Co', slug: 'beta-co' });
    expect(res.status).toBe(201);
    expect(res.body.slug).toBe('beta-co');
  });

  // RED: no validation — missing name/slug goes straight to Prisma which throws
  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/clients')
      .send({ slug: 'no-name' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/i);
  });

  // RED: no validation — missing slug
  it('returns 400 when slug is missing', async () => {
    const res = await request(app)
      .post('/api/clients')
      .send({ name: 'No Slug' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/slug/i);
  });

  // RED: no try/catch — unique constraint violation from Prisma bubbles up uncaught
  it('returns 409 when slug already exists', async () => {
    const uniqueError = new Error('Unique constraint failed on the fields: (`slug`)');
    uniqueError.code = 'P2002';
    mockPrisma.client.create.mockRejectedValue(uniqueError);

    const res = await request(app)
      .post('/api/clients')
      .send({ name: 'Dupe', slug: 'dupe' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already exists/i);
  });
});

// ─── GET /api/clients/:slug ───────────────────────────────────────────────────
describe('GET /api/clients/:slug', () => {
  it('returns the client when found', async () => {
    mockPrisma.client.findUnique.mockResolvedValue({
      id: '1', name: 'Acme', slug: 'acme', socialAccounts: [],
    });
    const res = await request(app).get('/api/clients/acme');
    expect(res.status).toBe(200);
    expect(res.body.slug).toBe('acme');
  });

  it('returns 404 when client is not found', async () => {
    mockPrisma.client.findUnique.mockResolvedValue(null);
    const res = await request(app).get('/api/clients/ghost');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  // RED: no try/catch
  it('returns 500 when the database throws', async () => {
    mockPrisma.client.findUnique.mockRejectedValue(new Error('timeout'));
    const res = await request(app).get('/api/clients/acme');
    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
  });
});

// ─── POST /api/clients/:slug/add-social ──────────────────────────────────────
describe('POST /api/clients/:slug/add-social', () => {
  it('returns 400 when platform or handle is missing', async () => {
    const res = await request(app)
      .post('/api/clients/acme/add-social')
      .send({ platform: 'INSTAGRAM' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('returns 404 when client slug does not exist', async () => {
    mockPrisma.client.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post('/api/clients/ghost/add-social')
      .send({ platform: 'INSTAGRAM', handle: 'ghost_ig' });
    expect(res.status).toBe(404);
  });

  it('creates a new PENDING social account', async () => {
    mockPrisma.client.findUnique.mockResolvedValue({ id: '1', slug: 'acme' });
    mockPrisma.socialAccount.findFirst.mockResolvedValue(null);
    const created = {
      id: 'sa-1', clientId: '1', platform: 'INSTAGRAM',
      handle: 'acme_ig', tokenStatus: 'PENDING',
    };
    mockPrisma.socialAccount.create.mockResolvedValue(created);

    const res = await request(app)
      .post('/api/clients/acme/add-social')
      .send({ platform: 'INSTAGRAM', handle: '@acme_ig' });
    expect(res.status).toBe(200);
    expect(res.body.handle).toBe('acme_ig');
    expect(res.body.tokenStatus).toBe('PENDING');
  });

  // RED: no try/catch around the DB calls inside the handler
  it('returns 500 when the database throws during lookup', async () => {
    mockPrisma.client.findUnique.mockRejectedValue(new Error('DB down'));
    const res = await request(app)
      .post('/api/clients/acme/add-social')
      .send({ platform: 'INSTAGRAM', handle: 'acme_ig' });
    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
  });
});

// ─── PATCH /api/clients/:slug ─────────────────────────────────────────────────
describe('PATCH /api/clients/:slug', () => {
  it('updates GA4 fields and returns updated client', async () => {
    mockPrisma.client.findUnique.mockResolvedValue({ id: '1', slug: 'acme' });
    mockPrisma.client.update.mockResolvedValue({
      id: '1', slug: 'acme', gaPropertyId: 'GA-123',
    });
    const res = await request(app)
      .patch('/api/clients/acme')
      .send({ gaPropertyId: 'GA-123' });
    expect(res.status).toBe(200);
    expect(res.body.gaPropertyId).toBe('GA-123');
  });

  it('returns 404 when client is not found', async () => {
    mockPrisma.client.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .patch('/api/clients/ghost')
      .send({ gaPropertyId: 'GA-123' });
    expect(res.status).toBe(404);
  });

  // RED: no try/catch
  it('returns 500 when the database throws', async () => {
    mockPrisma.client.findUnique.mockRejectedValue(new Error('timeout'));
    const res = await request(app)
      .patch('/api/clients/acme')
      .send({ gaPropertyId: 'GA-123' });
    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
  });
});
