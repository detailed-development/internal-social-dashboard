import { beforeEach, describe, expect, it, vi } from 'vitest';
import router from '../api/routes/platform-app-passwords.js';

const mockPrisma = {
  client: {
    findUnique: vi.fn(),
  },
  platformAppPassword: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  platformAppPasswordHistory: {
    create: vi.fn(),
    delete: vi.fn(),
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

const deleteHistoryHandler = router.stack.find(
  layer => layer.route?.path === '/:slug/:platform/history/:historyId' && layer.route.methods.delete,
)?.route.stack[0].handle;

function makeReq(params) {
  return {
    params,
    app: {
      get: vi.fn(key => (key === 'prisma' ? mockPrisma : undefined)),
    },
  };
}

function makeRes() {
  const res = {};
  res.status = vi.fn(code => {
    res.statusCode = code;
    return res;
  });
  res.json = vi.fn(body => {
    res.body = body;
    return res;
  });
  return res;
}

describe('DELETE /api/platform-app-passwords/:slug/:platform/history/:historyId', () => {
  it('removes a previous client-scoped password version and returns the refreshed record', async () => {
    const req = makeReq({ slug: 'acme', platform: 'FACEBOOK', historyId: 'history-previous' });
    const res = makeRes();

    mockPrisma.client.findUnique.mockResolvedValue({ id: 'client-1', slug: 'acme' });
    mockPrisma.platformAppPassword.findUnique
      .mockResolvedValueOnce({
        id: 'record-1',
        clientId: 'client-1',
        platform: 'FACEBOOK',
        password: 'current-secret',
        history: [
          { id: 'history-current', changedAt: '2026-04-17T12:00:00.000Z', password: 'current-secret' },
          { id: 'history-previous', changedAt: '2026-04-16T12:00:00.000Z', password: 'previous-secret' },
        ],
      })
      .mockResolvedValueOnce({
        id: 'record-1',
        clientId: 'client-1',
        platform: 'FACEBOOK',
        password: 'current-secret',
        history: [
          { id: 'history-current', changedAt: '2026-04-17T12:00:00.000Z', password: 'current-secret' },
        ],
      });

    await deleteHistoryHandler(req, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(mockPrisma.platformAppPasswordHistory.delete).toHaveBeenCalledWith({
      where: { id: 'history-previous' },
    });
    expect(mockPrisma.platformAppPassword.findUnique).toHaveBeenCalledWith({
      where: {
        clientId_platform: { clientId: 'client-1', platform: 'FACEBOOK' },
      },
      include: {
        history: {
          orderBy: { changedAt: 'desc' },
          take: 20,
        },
      },
    });
    expect(res.body.password).toBe('current-secret');
    expect(res.body.history).toHaveLength(1);
    expect(res.body.history[0].id).toBe('history-current');
  });

  it('rejects attempts to remove the current password version', async () => {
    const req = makeReq({ slug: 'acme', platform: 'FACEBOOK', historyId: 'history-current' });
    const res = makeRes();

    mockPrisma.client.findUnique.mockResolvedValue({ id: 'client-1', slug: 'acme' });
    mockPrisma.platformAppPassword.findUnique.mockResolvedValue({
      id: 'record-1',
      clientId: 'client-1',
      platform: 'FACEBOOK',
      password: 'current-secret',
      history: [
        { id: 'history-current', changedAt: '2026-04-17T12:00:00.000Z', password: 'current-secret' },
        { id: 'history-previous', changedAt: '2026-04-16T12:00:00.000Z', password: 'previous-secret' },
      ],
    });

    await deleteHistoryHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.error).toBe('Cannot remove the current password version.');
    expect(mockPrisma.platformAppPasswordHistory.delete).not.toHaveBeenCalled();
  });
});
