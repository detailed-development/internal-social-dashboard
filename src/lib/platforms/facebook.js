import axios from 'axios';
const GRAPH_API = 'https://graph.facebook.com/v19.0';

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

export async function syncFacebook(prisma, account) {
  const { accessToken, platformUserId } = account;

  // Follower count — always fetch, single quick call
  try {
    const pageRes = await axios.get(`${GRAPH_API}/${platformUserId}`, {
      params: { fields: 'fan_count,followers_count', access_token: accessToken },
    });
    const followerCount = pageRes.data.followers_count ?? pageRes.data.fan_count ?? null;
    if (followerCount !== null) {
      await prisma.socialAccount.update({ where: { id: account.id }, data: { followerCount } });
    }
  } catch (_) {}

  // Only fetch posts newer than last sync (first sync: last 30 days)
  const since = account.lastSyncedAt
    ? Math.floor(new Date(account.lastSyncedAt).getTime() / 1000)
    : Math.floor((Date.now() - THIRTY_DAYS) / 1000);

  const feedRes = await axios.get(`${GRAPH_API}/${platformUserId}/posts`, {
    params: {
      fields: 'id,message,created_time,permalink_url,attachments{media_type,media{image{src}},url}',
      limit: 25,
      since,
      access_token: accessToken,
    },
  });

  const items = feedRes.data?.data ?? [];
  if (items.length === 0) return; // nothing new

  for (const item of items) {
    const attachment = item.attachments?.data?.[0];
    const mediaType  = attachment?.media_type === 'video' ? 'VIDEO' : 'POST';
    const mediaUrl   = attachment?.media?.image?.src ?? null;

    const isNew = !(await prisma.post.findUnique({
      where: { socialAccountId_platformPostId: { socialAccountId: account.id, platformPostId: item.id } },
      select: { id: true },
    }));

    const post = await prisma.post.upsert({
      where: { socialAccountId_platformPostId: { socialAccountId: account.id, platformPostId: item.id } },
      update: { caption: item.message ?? null },
      create: {
        socialAccountId: account.id,
        platformPostId:  item.id,
        mediaType,
        caption:      item.message     ?? null,
        permalink:    item.permalink_url ?? null,
        mediaUrl,
        thumbnailUrl: mediaUrl,
        publishedAt:  new Date(item.created_time),
      },
    });

    // Engagement counts (always fetch for recent posts — likes/comments change)
    let likes = 0, comments = 0, shares = 0;
    try {
      const countsRes = await axios.get(`${GRAPH_API}/${item.id}`, {
        params: { fields: 'likes.summary(true),comments.summary(true),shares', access_token: accessToken },
      });
      likes    = countsRes.data.likes?.summary?.total_count    || 0;
      comments = countsRes.data.comments?.summary?.total_count || 0;
      shares   = countsRes.data.shares?.count                  || 0;
    } catch (err) {
      console.error(`    FB engagement fetch failed for post ${item.id}:`, err.response?.data ?? err.message);
    }

    // Insights — only for posts < 30 days old
    let impressions = 0, reach = 0;
    const postAge = Date.now() - new Date(item.created_time).getTime();
    if (postAge < THIRTY_DAYS) {
      try {
        const insightsRes = await axios.get(`${GRAPH_API}/${item.id}/insights`, {
          params: { metric: 'post_impressions,post_impressions_unique', access_token: accessToken },
        });
        for (const m of insightsRes.data.data ?? []) {
          if (m.name === 'post_impressions')        impressions = m.values?.[0]?.value || 0;
          if (m.name === 'post_impressions_unique') reach       = m.values?.[0]?.value || 0;
        }
      } catch (err) {
        console.error(`    FB insights fetch failed for post ${item.id}:`, err.response?.data ?? err.message);
      }
    }

    // Upsert metric
    const existing = await prisma.postMetric.findFirst({
      where: { postId: post.id },
      orderBy: { recordedAt: 'desc' },
      select: { id: true },
    });
    if (existing) {
      await prisma.postMetric.update({
        where: { id: existing.id },
        data: { likes, commentsCount: comments, shares, impressions, reach },
      });
    } else {
      await prisma.postMetric.create({
        data: { postId: post.id, likes, commentsCount: comments, shares, impressions, reach, saves: 0, videoPlays: 0 },
      });
    }

    // Comments — only for new posts
    if (isNew) {
      try {
        const commentsRes = await axios.get(`${GRAPH_API}/${item.id}/comments`, {
          params: { fields: 'id,message,from,created_time', limit: 50, access_token: accessToken },
        });
        for (const c of commentsRes.data.data ?? []) {
          const body = typeof c.message === 'string' ? c.message : '';
          if (!body.trim()) continue;

          await prisma.comment.upsert({
            where: { postId_platformCommentId: { postId: post.id, platformCommentId: c.id } },
            update: { body },
            create: { postId: post.id, platformCommentId: c.id, authorName: c.from?.name ?? null, body, postedAt: new Date(c.created_time) },
          });
        }
      } catch (_) {}
    }
  }
}
