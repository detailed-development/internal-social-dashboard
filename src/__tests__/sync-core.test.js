import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Mock all platform sync modules before importing sync-core so the dynamic
// imports inside runFullSync pick up the mocks.
vi.mock('../lib/platforms/instagram.js', () => ({ syncInstagram: vi.fn() }));
vi.mock('../lib/platforms/facebook.js',  () => ({ syncFacebook:  vi.fn() }));
vi.mock('../lib/platforms/youtube.js',   () => ({ syncYouTube:   vi.fn() }));
vi.mock('../lib/platforms/messages.js',  () => ({ syncMessages:  vi.fn() }));
vi.mock('../lib/platforms/google-analytics.js', () => ({ syncGoogleAnalytics: vi.fn() }));
vi.mock('../lib/transcribe.js', () => ({
  transcribeReel: vi.fn(),
  transcribeYouTubeVideo: vi.fn(),
}));
// Encryption is a no-op on plaintext; no need to mock decrypt semantics.
vi.mock('../lib/encryption.js', () => ({ decrypt: (x) => x }));

// Force the GA key-existence check to fail so the GA block is skipped cleanly
// in tests (the block catches ENOENT gracefully).
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    readFileSync: vi.fn((path, ...rest) => {
      if (typeof path === 'string' && path.endsWith('google-service-account.json')) {
        const e = new Error('ENOENT');
        e.code = 'ENOENT';
        throw e;
      }
      return actual.readFileSync(path, ...rest);
    }),
  };
});

const makeLogger = () => ({ log: vi.fn(), error: vi.fn() });

const makePrisma = (overrides = {}) => ({
  socialAccount: {
    findMany: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue({}),
  },
  client: {
    findMany: vi.fn().mockResolvedValue([]),
  },
  post: {
    findMany: vi.fn().mockResolvedValue([]),
  },
  ...overrides,
});

// Import after mocks are registered.
const { runFullSync, syncAllAccounts } = await import('../workers/sync-core.js');

describe('runFullSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.USE_REPORTING_READ_MODEL;
  });

  afterEach(() => {
    delete process.env.USE_REPORTING_READ_MODEL;
  });

  it('returns a structured summary with all expected keys', async () => {
    const prisma = makePrisma();
    const logger = makeLogger();

    const summary = await runFullSync({ prisma, logger, mode: 'nightly' });

    expect(summary).toMatchObject({
      mode: 'nightly',
      accountsProcessed: 0,
      accountsSynced: 0,
      accountSyncFailures: 0,
      conversationsProcessed: 0,
      conversationsSyncFailures: 0,
      gaClientsProcessed: 0,
      gaSyncFailures: 0,
      gaSkipped: true,
      transcriptionsAttempted: 0,
      transcriptionsCreated: 0,
      transcriptionFailures: 0,
      reportingRefreshes: 0,
      reportingRefreshFailures: 0,
    });
    expect(summary.startedAt).toBeDefined();
    expect(summary.finishedAt).toBeDefined();
    expect(typeof summary.durationMs).toBe('number');
    expect(Array.isArray(summary.errors)).toBe(true);
    expect(Array.isArray(summary.affectedClientIds)).toBe(true);
  });

  it('counts accounts processed/synced and records per-account failures', async () => {
    const { syncInstagram } = await import('../lib/platforms/instagram.js');
    const { syncYouTube }   = await import('../lib/platforms/youtube.js');
    syncInstagram.mockResolvedValueOnce();
    syncYouTube.mockRejectedValueOnce(new Error('boom'));

    const prisma = makePrisma({
      socialAccount: {
        findMany: vi
          .fn()
          // first call: social account sync
          .mockResolvedValueOnce([
            { id: 'a1', clientId: 'c1', platform: 'INSTAGRAM', handle: 'ig', accessToken: 't', refreshToken: null, client: { id: 'c1', name: 'C1' } },
            { id: 'a2', clientId: 'c2', platform: 'YOUTUBE',   handle: 'yt', accessToken: 't', refreshToken: null, client: { id: 'c2', name: 'C2' } },
          ])
          // second call: messaging accounts
          .mockResolvedValueOnce([]),
        update: vi.fn().mockResolvedValue({}),
      },
    });

    const summary = await runFullSync({ prisma, logger: makeLogger(), mode: 'manual' });

    expect(summary.accountsProcessed).toBe(2);
    expect(summary.accountsSynced).toBe(1);
    expect(summary.accountSyncFailures).toBe(1);
    expect(summary.errors.some((e) => e.scope === 'social' && e.platform === 'YOUTUBE')).toBe(true);
    expect(summary.affectedClientIds).toEqual(['c1']);
  });

  it('does not abort the run when one platform sync throws', async () => {
    const { syncInstagram } = await import('../lib/platforms/instagram.js');
    const { syncFacebook }  = await import('../lib/platforms/facebook.js');
    syncInstagram.mockRejectedValueOnce(new Error('insta fail'));
    syncFacebook.mockResolvedValueOnce();

    const prisma = makePrisma({
      socialAccount: {
        findMany: vi.fn()
          .mockResolvedValueOnce([
            { id: 'a1', clientId: 'c1', platform: 'INSTAGRAM', handle: 'ig', accessToken: 't', refreshToken: null, client: { id: 'c1', name: 'C1' } },
            { id: 'a2', clientId: 'c2', platform: 'FACEBOOK',  handle: 'fb', accessToken: 't', refreshToken: null, client: { id: 'c2', name: 'C2' } },
          ])
          .mockResolvedValueOnce([]),
        update: vi.fn().mockResolvedValue({}),
      },
    });

    const summary = await runFullSync({ prisma, logger: makeLogger() });

    expect(summary.accountsSynced).toBe(1);
    expect(summary.accountSyncFailures).toBe(1);
    // Facebook still ran even though Instagram failed:
    expect(syncFacebook).toHaveBeenCalled();
  });
});

describe('sync-core source integrity', () => {
  it('does not import from src/lib/ai/** (Layer A must not trigger AI)', () => {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(__dirname, '..', 'workers', 'sync-core.js'), 'utf8');
    // Match import/require strings only; comments are fine.
    const importLineRegex = /^\s*import\s.+from\s+['"]([^'"]+)['"]/gm;
    const imports = Array.from(source.matchAll(importLineRegex)).map((m) => m[1]);
    const dynamicImportRegex = /await\s+import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    const dynamic = Array.from(source.matchAll(dynamicImportRegex)).map((m) => m[1]);

    const all = [...imports, ...dynamic];
    const aiImports = all.filter((i) => i.includes('/lib/ai/') || i.includes('\\lib\\ai\\'));

    expect(aiImports).toEqual([]);
  });
});

describe('syncAllAccounts alias', () => {
  it('is an alias for runFullSync', () => {
    expect(syncAllAccounts).toBe(runFullSync);
  });
});
