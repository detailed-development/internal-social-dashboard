import axios from 'axios';
import { transcribeReel } from '../transcribe.js';
const GRAPH_API = 'https://graph.facebook.com/v19.0';

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

const CORE_MEDIA_METRICS = ['reach', 'saved', 'shares', 'views', 'total_interactions'];
const OPTIONAL_ACTION_METRICS = ['profile_visits', 'follows'];
const UNSUPPORTED_LOGGED = new Set();

function logUnsupportedMetricOnce(metricName, mediaProductType, err) {
  const key = `${mediaProductType || 'UNKNOWN'}:${metricName}`;
  if (UNSUPPORTED_LOGGED.has(key)) return;
  UNSUPPORTED_LOGGED.add(key);
  console.warn(
    `[instagram] insight metric ${metricName} unavailable for ${mediaProductType || 'unknown media type'}; suppressing repeat logs:`,
    err.response?.data ?? err.message,
  );
}

async function fetchMediaInsights(mediaId, metricNames, accessToken, mediaProductType) {
  const values = {};

  for (const metricName of metricNames) {
    try {
      const insightsRes = await axios.get(`${GRAPH_API}/${mediaId}/insights`, {
        params: { metric: metricName, access_token: accessToken },
      });
      for (const metric of insightsRes.data.data ?? []) {
        values[metric.name] = metric.values?.[0]?.value || 0;
      }
    } catch (err) {
      // Meta's current Media Insights matrix is media-type dependent. In v22+
      // impressions is no longer supported for queried media, and profile action
      // metrics only exist for some product types. Unsupported metrics should not
      // block supported reach/views/saves/shares from syncing.
      logUnsupportedMetricOnce(metricName, mediaProductType, err);
    }
  }

  return values;
}

export async function syncInstagram(prisma, account) {
  const { accessToken, platformUserId } = account;

  // Only fetch posts newer than the last sync (first sync: last 30 days)
  const since = account.lastSyncedAt
    ? Math.floor(new Date(account.lastSyncedAt).getTime() / 1000)
    : Math.floor((Date.now() - THIRTY_DAYS) / 1000);

  // Fetch follower count (always quick, single field)
  try {
    const infoRes = await axios.get(`${GRAPH_API}/${platformUserId}`, {
      params: { fields: 'followers_count', access_token: accessToken },
    });
    if (infoRes.data.followers_count != null) {
      await prisma.socialAccount.update({
        where: { id: account.id },
        data: { followerCount: infoRes.data.followers_count },
      });
    }
  } catch (err) {
    console.warn(`[instagram] follower count fetch failed for ${account.handle}:`, err.message);
  }

  // Fetch only new media since last sync
  const mediaRes = await axios.get(`${GRAPH_API}/${platformUserId}/media`, {
    params: {
      fields: 'id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
      limit: 25,
      since,
      access_token: accessToken,
    },
  });

  const items = mediaRes.data?.data ?? [];
  if (items.length === 0) return; // nothing new

  for (const item of items) {
    const isNew = !(await prisma.post.findUnique({
      where: { socialAccountId_platformPostId: { socialAccountId: account.id, platformPostId: item.id } },
      select: { id: true },
    }));

    const post = await prisma.post.upsert({
      where: { socialAccountId_platformPostId: { socialAccountId: account.id, platformPostId: item.id } },
      update: { caption: item.caption ?? null, mediaUrl: item.media_url ?? null },
      create: {
        socialAccountId: account.id,
        platformPostId: item.id,
        mediaType: item.media_type === 'VIDEO' ? 'REEL' : 'POST',
        caption: item.caption ?? null,
        permalink: item.permalink,
        mediaUrl: item.media_url ?? null,
        thumbnailUrl: item.thumbnail_url ?? null,
        publishedAt: new Date(item.timestamp),
      },
    });

    const likes = item.like_count || 0;
    const comments = item.comments_count || 0;

    // Richer insights only for posts < 30 days old (older ones don't update).
    // Do not request legacy impressions for Instagram media. Meta v22+ rejects
    // impressions for multiple product types; views is the supported top-funnel
    // replacement where available.
    const postAge = Date.now() - new Date(item.timestamp).getTime();
    let reach = 0, shares = 0, saves = 0, views = 0, profileVisits = 0, followersGained = 0;
    if (postAge < THIRTY_DAYS) {
      const insights = await fetchMediaInsights(
        item.id,
        [...CORE_MEDIA_METRICS, ...OPTIONAL_ACTION_METRICS],
        accessToken,
        item.media_product_type || item.media_type,
      );
      reach = insights.reach || 0;
      saves = insights.saved || 0;
      shares = insights.shares || 0;
      views = insights.views || 0;
      profileVisits = insights.profile_visits || 0;
      followersGained = insights.follows || 0;
    }

    // Upsert metric — update latest row if exists, otherwise create. Keep
    // impressions untouched for existing rows because it is now legacy data.
    const existing = await prisma.postMetric.findFirst({
      where: { postId: post.id },
      orderBy: { recordedAt: 'desc' },
      select: { id: true },
    });
    const metricData = {
      likes,
      commentsCount: comments,
      reach,
      shares,
      saves,
      videoPlays: views,
      profileVisits,
      followersGained,
      recordedAt: new Date(),
    };

    if (existing) {
      await prisma.postMetric.update({
        where: { id: existing.id },
        data: metricData,
      });
    } else {
      await prisma.postMetric.create({
        data: { postId: post.id, ...metricData },
      });
    }

    // Background transcription for new Reels (fire and forget)
    if (isNew && post.mediaType === 'REEL') {
      transcribeReel(prisma, post).catch(err =>
        console.error(`    Transcription error (Reel ${post.id}): ${err.message}`)
      );
    }

    // Only fetch comments for new posts (no point re-scanning old ones every cycle)
    if (isNew) {
      try {
        const commentsRes = await axios.get(`${GRAPH_API}/${item.id}/comments`, {
          params: { fields: 'id,text,username,timestamp', limit: 50, access_token: accessToken },
        });
        for (const c of commentsRes.data.data ?? []) {
          const body = typeof c.text === 'string' ? c.text : '';
          if (!body.trim()) continue;

          await prisma.comment.upsert({
            where: { postId_platformCommentId: { postId: post.id, platformCommentId: c.id } },
            update: { body },
            create: { postId: post.id, platformCommentId: c.id, authorName: c.username ?? null, body, postedAt: new Date(c.timestamp) },
          });
        }
      } catch (err) {
        console.warn(`[instagram] comments fetch failed for post ${item.id}:`, err.message);
      }
    }
  }
}
