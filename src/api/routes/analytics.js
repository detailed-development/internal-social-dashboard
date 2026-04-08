import { Router } from 'express';
const router = Router();

router.get('/overview', async (req, res) => {
  const prisma = req.app.get('prisma');
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  try {
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/client/:slug/buzzwords', async (req, res) => {
  const prisma = req.app.get('prisma');
  const limit = parseInt(req.query.limit) || 20;
  try {
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/client/:slug/web', async (req, res) => {
  const prisma = req.app.get('prisma');
  try {
    const client = await prisma.client.findUnique({ where: { slug: req.params.slug } });
    if (!client) return res.status(404).json({ error: 'Client not found' });

    // Daily totals (last 30 days)
    const daily = await prisma.webAnalytic.findMany({
      where: { clientId: client.id, source: 'all', medium: 'all' },
      orderBy: { date: 'asc' },
      take: 30,
    });

    // Traffic source breakdown
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sources = await prisma.webAnalytic.findMany({
      where: {
        clientId: client.id,
        date: today,
        source: { notIn: ['all', '_device', '_page'] },
      },
      orderBy: { sessions: 'desc' },
      take: 10,
    });

    // Device breakdown
    const devices = await prisma.webAnalytic.findMany({
      where: { clientId: client.id, date: today, source: '_device' },
      orderBy: { sessions: 'desc' },
    });

    // Top landing pages
    const pages = await prisma.webAnalytic.findMany({
      where: { clientId: client.id, date: today, source: '_page' },
      orderBy: { sessions: 'desc' },
      take: 10,
    });

    // 30-day totals
    const totals = daily.reduce((acc, row) => ({
      sessions:  acc.sessions  + row.sessions,
      users:     acc.users     + row.users,
      newUsers:  acc.newUsers  + row.newUsers,
      pageviews: acc.pageviews + row.pageviews,
    }), { sessions: 0, users: 0, newUsers: 0, pageviews: 0 });

    const avgBounceRate = daily.length
      ? daily.reduce((s, r) => s + (r.bounceRate || 0), 0) / daily.length
      : null;

    const avgSessionDuration = daily.length
      ? daily.reduce((s, r) => s + (r.avgSessionDuration || 0), 0) / daily.length
      : null;

    const engagementRate = avgBounceRate != null ? 1 - avgBounceRate : null;

    res.json({
      gaPropertyId: client.gaPropertyId,
      websiteUrl:   client.websiteUrl,
      totals:       { ...totals, avgBounceRate, avgSessionDuration, engagementRate },
      daily,
      sources,
      devices: devices.map(d => ({ device: d.medium, sessions: d.sessions, users: d.users, pageviews: d.pageviews })),
      pages: pages.map(p => ({ path: p.medium, sessions: p.sessions, users: p.users, pageviews: p.pageviews })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
