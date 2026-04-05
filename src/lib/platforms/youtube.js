import axios from 'axios';
import { transcribeYouTubeVideo } from '../transcribe.js';

const YT_API = 'https://www.googleapis.com/youtube/v3';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/** Parse ISO 8601 duration string to total seconds (e.g. "PT4M13S" → 253) */
function parseDuration(iso) {
  if (!iso) return 0;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (parseInt(m[1] || 0) * 3600) + (parseInt(m[2] || 0) * 60) + parseInt(m[3] || 0);
}

/** Resolve a PENDING account's handle → real YouTube channel via the Data API. */
async function resolveChannel(apiKey, rawHandle) {
  const handle = rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`;
  for (const params of [
    { forHandle: handle, part: 'id,snippet,statistics', key: apiKey },
    { forUsername: rawHandle.replace(/^@/, ''), part: 'id,snippet,statistics', key: apiKey },
  ]) {
    try {
      const res = await axios.get(`${YT_API}/channels`, { params, timeout: 15_000 });
      if (res.data.items?.length) return res.data.items[0];
    } catch (_) {}
  }
  return null;
}

export async function syncYouTube(prisma, account) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.log('    YouTube sync: YOUTUBE_API_KEY not set, skipping');
    return;
  }

  let channelId = account.platformUserId;

  // --- Resolve pending stub accounts (handle → channel ID) ---
  if (channelId.startsWith('pending:')) {
    const channel = await resolveChannel(apiKey, account.handle);
    if (!channel) {
      console.log(`    YouTube: could not resolve channel for "${account.handle}"`);
      return;
    }
    channelId = channel.id;
    await prisma.socialAccount.update({
      where: { id: account.id },
      data: {
        platformUserId: channelId,
        displayName: channel.snippet?.title ?? null,
        followerCount: parseInt(channel.statistics?.subscriberCount) || null,
        tokenStatus: 'ACTIVE',
      },
    });
  }

  // --- Refresh channel stats ---
  try {
    const chanRes = await axios.get(`${YT_API}/channels`, {
      params: { id: channelId, part: 'statistics,snippet', key: apiKey },
      timeout: 15_000,
    });
    const ch = chanRes.data.items?.[0];
    if (ch) {
      await prisma.socialAccount.update({
        where: { id: account.id },
        data: {
          followerCount: parseInt(ch.statistics?.subscriberCount) || null,
          displayName: ch.snippet?.title ?? null,
          tokenStatus: 'ACTIVE',
        },
      });
    }
  } catch (_) {}

  // --- Fetch videos published since last sync ---
  const publishedAfter = account.lastSyncedAt
    ? new Date(account.lastSyncedAt).toISOString()
    : new Date(Date.now() - THIRTY_DAYS_MS).toISOString();

  const videoItems = [];
  let pageToken = '';

  do {
    const searchRes = await axios.get(`${YT_API}/search`, {
      params: {
        channelId,
        type: 'video',
        order: 'date',
        publishedAfter,
        part: 'id,snippet',
        maxResults: 25,
        ...(pageToken ? { pageToken } : {}),
        key: apiKey,
      },
      timeout: 20_000,
    });
    for (const item of searchRes.data.items ?? []) {
      videoItems.push({ id: item.id.videoId, snippet: item.snippet });
    }
    pageToken = searchRes.data.nextPageToken ?? '';
  } while (pageToken && videoItems.length < 50);

  if (videoItems.length === 0) return;

  // --- Batch-fetch video details (duration + stats) ---
  const detailsRes = await axios.get(`${YT_API}/videos`, {
    params: {
      id: videoItems.map(v => v.id).join(','),
      part: 'statistics,contentDetails',
      key: apiKey,
    },
    timeout: 20_000,
  });

  const detailsMap = {};
  for (const v of detailsRes.data.items ?? []) {
    detailsMap[v.id] = v;
  }

  // --- Upsert posts + metrics, then trigger transcription ---
  for (const video of videoItems) {
    const details = detailsMap[video.id];
    const stats = details?.statistics ?? {};
    const durationSecs = parseDuration(details?.contentDetails?.duration);
    const snippet = video.snippet;
    const thumbnailUrl =
      snippet.thumbnails?.maxres?.url ??
      snippet.thumbnails?.high?.url ??
      snippet.thumbnails?.default?.url ??
      null;

    const post = await prisma.post.upsert({
      where: {
        socialAccountId_platformPostId: {
          socialAccountId: account.id,
          platformPostId: video.id,
        },
      },
      update: {
        caption: snippet.title ?? null,
        thumbnailUrl,
      },
      create: {
        socialAccountId: account.id,
        platformPostId: video.id,
        mediaType: durationSecs > 0 && durationSecs <= 60 ? 'SHORT' : 'VIDEO',
        caption: snippet.title ?? null,
        permalink: `https://www.youtube.com/watch?v=${video.id}`,
        mediaUrl: `https://www.youtube.com/watch?v=${video.id}`,
        thumbnailUrl,
        publishedAt: new Date(snippet.publishedAt),
      },
    });

    // Upsert metrics
    const likes = parseInt(stats.likeCount) || 0;
    const commentsCount = parseInt(stats.commentCount) || 0;
    const videoPlays = parseInt(stats.viewCount) || 0;

    const existingMetric = await prisma.postMetric.findFirst({
      where: { postId: post.id },
      orderBy: { recordedAt: 'desc' },
      select: { id: true },
    });
    if (existingMetric) {
      await prisma.postMetric.update({
        where: { id: existingMetric.id },
        data: { likes, commentsCount, videoPlays },
      });
    } else {
      await prisma.postMetric.create({
        data: { postId: post.id, likes, commentsCount, videoPlays },
      });
    }

    // Background transcription (fire and forget)
    transcribeYouTubeVideo(prisma, post).catch(err =>
      console.error(`    Transcription error (YouTube ${video.id}): ${err.message}`)
    );
  }
}
