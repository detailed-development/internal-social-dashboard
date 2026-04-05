import axios from 'axios';
import { transcribeReel } from '../transcribe.js';
const GRAPH_API = 'https://graph.facebook.com/v19.0';

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS  =  7 * 24 * 60 * 60 * 1000;

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
      fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
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

    const likes    = item.like_count    || 0;
    const comments = item.comments_count || 0;

    // Richer insights only for posts < 30 days old (older ones don't update)
    const postAge = Date.now() - new Date(item.timestamp).getTime();
    let impressions = 0, reach = 0, shares = 0, saves = 0;
    if (postAge < THIRTY_DAYS) {
      try {
        const insightsRes = await axios.get(`${GRAPH_API}/${item.id}/insights`, {
          params: { metric: 'impressions,reach,saved,shares', access_token: accessToken },
        });
        for (const m of insightsRes.data.data) {
          if (m.name === 'impressions') impressions = m.values?.[0]?.value || 0;
          if (m.name === 'reach')       reach       = m.values?.[0]?.value || 0;
          if (m.name === 'saved')       saves       = m.values?.[0]?.value || 0;
          if (m.name === 'shares')      shares      = m.values?.[0]?.value || 0;
        }
      } catch (err) {
        console.warn(`[instagram] insights fetch failed for post ${item.id}:`, err.message);
      }
    }

    // Upsert metric — update latest row if exists, otherwise create
    const existing = await prisma.postMetric.findFirst({
      where: { postId: post.id },
      orderBy: { recordedAt: 'desc' },
      select: { id: true },
    });
    if (existing) {
      await prisma.postMetric.update({
        where: { id: existing.id },
        data: { likes, commentsCount: comments, impressions, reach, shares, saves },
      });
    } else {
      await prisma.postMetric.create({
        data: { postId: post.id, likes, commentsCount: comments, impressions, reach, shares, saves, videoPlays: 0 },
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
          await prisma.comment.upsert({
            where: { postId_platformCommentId: { postId: post.id, platformCommentId: c.id } },
            update: { body: c.text },
            create: { postId: post.id, platformCommentId: c.id, authorName: c.username ?? null, body: c.text, postedAt: new Date(c.timestamp) },
          });
        }
      } catch (err) {
        console.warn(`[instagram] comments fetch failed for post ${item.id}:`, err.message);
      }
    }
  }
}
