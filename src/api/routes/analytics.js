import { Router } from 'express';
const router = Router();

router.get('/overview', async (req, res) => {
  const prisma = req.app.get('prisma');
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [totalPosts, totalEngagement, clientCount] = await Promise.all([
    prisma.post.count({ where: { publishedAt: { gte: thirtyDaysAgo } } }),
    prisma.postMetric.aggregate({
      _sum: { likes: true, shares: true, saves: true, commentsCount: true },
      where: { post: { publishedAt: { gte: thirtyDaysAgo } } },
    }),
    prisma.client.count(),
  ]);
  const e = totalEngagement._sum;
  res.json({
    period: '30d',
    totalPosts,
    totalEngagement: (e.likes || 0) + (e.shares || 0) + (e.saves || 0) + (e.commentsCount || 0),
    activeClients: clientCount,
  });
});

router.get('/client/:slug/buzzwords', async (req, res) => {
  const prisma = req.app.get('prisma');
  const limit = parseInt(req.query.limit) || 20;
  const buzzwords = await prisma.$queryRaw`
    SELECT b.word, SUM(b.frequency)::int as total_freq, AVG(b.relevance_score) as avg_relevance
    FROM buzzwords b
    LEFT JOIN comments c ON b.comment_id = c.id
    LEFT JOIN transcriptions t ON b.transcription_id = t.id
    LEFT JOIN posts p ON (c.post_id = p.id OR t.post_id = p.id)
    LEFT JOIN social_accounts sa ON p.social_account_id = sa.id
    LEFT JOIN clients cl ON sa.client_id = cl.id
    WHERE cl.slug = ${req.params.slug}
    GROUP BY b.word ORDER BY total_freq DESC LIMIT ${limit}
  `;
  res.json(buzzwords);
});

export default router;
