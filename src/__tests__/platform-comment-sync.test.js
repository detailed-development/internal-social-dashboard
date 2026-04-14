import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
  },
}));

vi.mock('../lib/transcribe.js', () => ({
  transcribeReel: vi.fn(),
}));

const { syncInstagram } = await import('../lib/platforms/instagram.js');
const { syncFacebook } = await import('../lib/platforms/facebook.js');
const { syncMessages } = await import('../lib/platforms/messages.js');

const makePrisma = () => ({
  socialAccount: {
    update: vi.fn().mockResolvedValue({}),
  },
  post: {
    findUnique: vi.fn().mockResolvedValue(null),
    upsert: vi.fn().mockResolvedValue({ id: 'post-1', mediaType: 'POST' }),
  },
  postMetric: {
    findFirst: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
  },
  conversation: {
    upsert: vi.fn().mockResolvedValue({ id: 'conversation-1' }),
    update: vi.fn().mockResolvedValue({}),
  },
  comment: {
    upsert: vi.fn().mockResolvedValue({}),
  },
  directMessage: {
    upsert: vi.fn().mockResolvedValue({}),
  },
});

describe('platform comment sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-14T18:05:50.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('skips Instagram comments with missing or blank text', async () => {
    const prisma = makePrisma();

    axios.get
      .mockResolvedValueOnce({ data: { followers_count: 120 } })
      .mockResolvedValueOnce({
        data: {
          data: [{
            id: 'ig-post-1',
            caption: 'caption',
            media_type: 'IMAGE',
            media_url: 'https://example.com/image.jpg',
            permalink: 'https://instagram.com/p/1',
            timestamp: '2026-04-14T17:00:00.000Z',
            like_count: 4,
            comments_count: 3,
          }],
        },
      })
      .mockResolvedValueOnce({ data: { data: [] } })
      .mockResolvedValueOnce({
        data: {
          data: [
            { id: 'ig-comment-1', username: 'blank', text: '   ', timestamp: '2026-04-14T17:01:00.000Z' },
            { id: 'ig-comment-2', username: 'missing', timestamp: '2026-04-14T17:02:00.000Z' },
            { id: 'ig-comment-3', username: 'valid', text: 'Nice post', timestamp: '2026-04-14T17:03:00.000Z' },
          ],
        },
      });

    await syncInstagram(prisma, {
      id: 'account-1',
      handle: 'test-ig',
      platformUserId: 'ig-user-1',
      accessToken: 'token',
      lastSyncedAt: new Date('2026-04-14T00:00:00.000Z'),
    });

    expect(prisma.comment.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.comment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { body: 'Nice post' },
        create: expect.objectContaining({
          platformCommentId: 'ig-comment-3',
          body: 'Nice post',
        }),
      }),
    );
  });

  it('skips Facebook comments with missing or blank messages', async () => {
    const prisma = makePrisma();

    axios.get
      .mockResolvedValueOnce({ data: { followers_count: 80 } })
      .mockResolvedValueOnce({
        data: {
          data: [{
            id: 'fb-post-1',
            message: 'hello',
            created_time: '2026-03-01T12:00:00.000Z',
            permalink_url: 'https://facebook.com/p/1',
          }],
        },
      })
      .mockResolvedValueOnce({
        data: {
          likes: { summary: { total_count: 2 } },
          comments: { summary: { total_count: 3 } },
          shares: { count: 1 },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: [
            { id: 'fb-comment-1', from: { name: 'blank' }, message: '', created_time: '2026-03-01T12:01:00.000Z' },
            { id: 'fb-comment-2', from: { name: 'missing' }, created_time: '2026-03-01T12:02:00.000Z' },
            { id: 'fb-comment-3', from: { name: 'valid' }, message: 'Looks good', created_time: '2026-03-01T12:03:00.000Z' },
          ],
        },
      });

    await syncFacebook(prisma, {
      id: 'account-2',
      handle: 'test-fb',
      platformUserId: 'fb-user-1',
      accessToken: 'token',
      lastSyncedAt: new Date('2026-04-14T00:00:00.000Z'),
    });

    expect(prisma.comment.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.comment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { body: 'Looks good' },
        create: expect.objectContaining({
          platformCommentId: 'fb-comment-3',
          body: 'Looks good',
        }),
      }),
    );
  });

  it('skips message sync when Meta denies the messaging capability', async () => {
    const prisma = makePrisma();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    axios.get.mockRejectedValueOnce({
      response: {
        data: {
          error: {
            code: 3,
            message: 'Application does not have the capability to make this API call.',
          },
        },
      },
    });

    await expect(syncMessages(prisma, {
      id: 'account-3',
      handle: 'test-dm',
      platform: 'INSTAGRAM',
      platformUserId: 'ig-user-1',
      accessToken: 'token',
    })).resolves.toBeUndefined();

    expect(prisma.conversation.upsert).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      '    Skipping message sync for @test-dm (INSTAGRAM): insufficient token permissions or app capability',
    );

    consoleSpy.mockRestore();
  });
});
