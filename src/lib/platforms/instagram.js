import axios from 'axios';
const GRAPH_API = 'https://graph.facebook.com/v19.0';

export async function syncInstagram(prisma, account) {
  const { accessToken, platformUserId } = account;

  // Fetch recent media
  const mediaRes = await axios.get(`${GRAPH_API}/${platformUserId}/media`, {
    params: {
      fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp',
      limit: 25,
      access_token: accessToken,
    },
  });

  for (const item of mediaRes.data.data) {
    const post = await prisma.post.upsert({
      where: { socialAccountId_platformPostId: { socialAccountId: account.id, platformPostId: item.id } },
      update: { caption: item.caption, mediaUrl: item.media_url },
      create: {
        socialAccountId: account.id,
        platformPostId: item.id,
        mediaType: item.media_type === 'VIDEO' ? 'REEL' : 'POST',
        caption: item.caption || null,
        permalink: item.permalink,
        mediaUrl: item.media_url || null,
        thumbnailUrl: item.thumbnail_url || null,
        publishedAt: new Date(item.timestamp),
      },
    });

    // Fetch insights
    try {
      const insightsRes = await axios.get(`${GRAPH_API}/${item.id}/insights`, {
        params: { metric: 'impressions,reach,saved,shares', access_token: accessToken },
      });
      const metrics = {};
      for (const m of insightsRes.data.data) metrics[m.name] = m.values[0]?.value || 0;

      const basicRes = await axios.get(`${GRAPH_API}/${item.id}`, {
        params: { fields: 'like_count,comments_count', access_token: accessToken },
      });

      await prisma.postMetric.create({
        data: {
          postId: post.id,
          impressions: metrics.impressions || 0,
          reach: metrics.reach || 0,
          likes: basicRes.data.like_count || 0,
          commentsCount: basicRes.data.comments_count || 0,
          shares: metrics.shares || 0,
          saves: metrics.saved || 0,
          videoPlays: metrics.plays || 0,
        },
      });
    } catch (e) {
      console.log(`    Insights unavailable for ${item.id}: ${e.message}`);
    }

    // Fetch comments
    try {
      const commentsRes = await axios.get(`${GRAPH_API}/${item.id}/comments`, {
        params: { fields: 'id,text,username,timestamp', limit: 50, access_token: accessToken },
      });
      for (const c of commentsRes.data.data) {
        await prisma.comment.upsert({
          where: { postId_platformCommentId: { postId: post.id, platformCommentId: c.id } },
          update: { body: c.text },
          create: { postId: post.id, platformCommentId: c.id, authorName: c.username || null, body: c.text, postedAt: new Date(c.timestamp) },
        });
      }
    } catch (e) {
      console.log(`    Comments unavailable for ${item.id}: ${e.message}`);
    }
  }
}
