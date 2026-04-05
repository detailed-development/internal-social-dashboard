import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { persistToken, exchangeToken } from '../lib/meta-token-refresh.js';
import fs from 'fs';

vi.mock('fs');

describe('persistToken', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  it('replaces existing META_USER_TOKEN line in .env', () => {
    const original = 'PORT=3001\nMETA_USER_TOKEN=old_token\nNODE_ENV=production\n';
    fs.readFileSync.mockReturnValue(original);
    fs.writeFileSync.mockImplementation(() => {});

    persistToken('new_shiny_token');

    const [, written] = fs.writeFileSync.mock.calls[0];
    expect(written).toContain('META_USER_TOKEN=new_shiny_token');
    expect(written).not.toContain('old_token');
    expect(process.env.META_USER_TOKEN).toBe('new_shiny_token');
  });

  it('appends META_USER_TOKEN when the key is absent from .env', () => {
    const original = 'PORT=3001\nNODE_ENV=production\n';
    fs.readFileSync.mockReturnValue(original);
    fs.writeFileSync.mockImplementation(() => {});

    persistToken('brand_new_token');

    const [, written] = fs.writeFileSync.mock.calls[0];
    expect(written).toContain('META_USER_TOKEN=brand_new_token');
  });
});

describe('exchangeToken', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.META_APP_ID;
    delete process.env.META_APP_SECRET;
    delete process.env.META_USER_TOKEN;
  });

  it('throws when required env vars are missing', async () => {
    await expect(exchangeToken()).rejects.toThrow(/META_APP_ID/);
  });

  it('returns access_token on success', async () => {
    process.env.META_APP_ID = 'app-id';
    process.env.META_APP_SECRET = 'app-secret';
    process.env.META_USER_TOKEN = 'short-token';

    globalThis.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ access_token: 'long-lived-token' }),
    });

    const token = await exchangeToken();
    expect(token).toBe('long-lived-token');
  });

  it('throws when the Meta API returns an error object', async () => {
    process.env.META_APP_ID = 'app-id';
    process.env.META_APP_SECRET = 'app-secret';
    process.env.META_USER_TOKEN = 'short-token';

    globalThis.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ error: { message: 'Invalid OAuth access token' } }),
    });

    await expect(exchangeToken()).rejects.toThrow('Invalid OAuth access token');
  });
});
