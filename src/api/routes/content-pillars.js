import { Router } from 'express';
const router = Router();

async function validatePostBelongsToPillarClient(prisma, pillarId, postId) {
  const [pillar, post] = await Promise.all([
    prisma.contentPillar.findUnique({
      where: { id: pillarId },
      select: { id: true, clientId: true },
    }),
    prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        socialAccount: {
          select: { clientId: true },
        },
      },
    }),
  ]);

  if (!pillar) return { status: 404, error: 'Pillar not found' };
  if (!post) return { status: 404, error: 'Post not found' };

  const postClientId = post.socialAccount?.clientId;
  if (postClientId !== pillar.clientId) {
    return { status: 400, error: 'Post does not belong to this pillar client' };
  }

  return { pillar, post };
}

// GET /api/content-pillars?clientId=:clientId
// List all persisted content pillars for a client, with post count.
router.get('/', async (req, res) => {
  const prisma = req.app.get('prisma');
  const { clientId } = req.query;
  if (!clientId) return res.status(400).json({ error: 'clientId is required' });
  try {
    const pillars = await prisma.contentPillar.findMany({
      where: { clientId },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { posts: true } } },
    });
    res.json(pillars);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/content-pillars
// Create a new persisted content pillar for a client.
router.post('/', async (req, res) => {
  const prisma = req.app.get('prisma');
  const { clientId, name, description, color } = req.body;
  if (!clientId || !name) return res.status(400).json({ error: 'clientId and name are required' });
  try {
    const pillar = await prisma.contentPillar.create({
      data: { clientId, name, description, color },
    });
    res.status(201).json(pillar);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/content-pillars/:id
// Update pillar name, description, or color.
router.patch('/:id', async (req, res) => {
  const prisma = req.app.get('prisma');
  const { name, description, color } = req.body;
  try {
    const pillar = await prisma.contentPillar.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(color !== undefined && { color }),
      },
    });
    res.json(pillar);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Pillar not found' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/content-pillars/:id
router.delete('/:id', async (req, res) => {
  const prisma = req.app.get('prisma');
  try {
    await prisma.contentPillar.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Pillar not found' });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/content-pillars/:id/posts/:postId
// Assign a post to a pillar (idempotent). The post must belong to the same client as the pillar.
router.post('/:id/posts/:postId', async (req, res) => {
  const prisma = req.app.get('prisma');
  try {
    const validation = await validatePostBelongsToPillarClient(prisma, req.params.id, req.params.postId);
    if (validation.error) return res.status(validation.status).json({ error: validation.error });

    await prisma.postContentPillar.upsert({
      where: { postId_contentPillarId: { postId: req.params.postId, contentPillarId: req.params.id } },
      create: { postId: req.params.postId, contentPillarId: req.params.id },
      update: {},
    });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/content-pillars/:id/posts/:postId
// Unassign a post from a pillar. The post must belong to the same client as the pillar.
router.delete('/:id/posts/:postId', async (req, res) => {
  const prisma = req.app.get('prisma');
  try {
    const validation = await validatePostBelongsToPillarClient(prisma, req.params.id, req.params.postId);
    if (validation.error) return res.status(validation.status).json({ error: validation.error });

    await prisma.postContentPillar.delete({
      where: { postId_contentPillarId: { postId: req.params.postId, contentPillarId: req.params.id } },
    });
    res.status(204).end();
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Assignment not found' });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/content-pillars/:id/analytics
// Returns aggregate engagement stats for all posts in a pillar.
router.get('/:id/analytics', async (req, res) => {
  const prisma = req.app.get('prisma');
  try {
    const assignments = await prisma.postContentPillar.findMany({
      where: { contentPillarId: req.params.id },
      include: {
        post: {
          include: { metrics: { orderBy: { recordedAt: 'desc' }, take: 1 } },
        },
      },
    });

    let totalLikes = 0, totalComments = 0, totalShares = 0, totalSaves = 0, totalReach = 0;
    for (const a of assignments) {
      const m = a.post.metrics[0] || {};
      totalLikes    += m.likes         || 0;
      totalComments += m.commentsCount || 0;
      totalShares   += m.shares        || 0;
      totalSaves    += m.saves         || 0;
      totalReach    += m.reach         || 0;
    }
    const postCount = assignments.length;
    const totalEngagement = totalLikes + totalComments + totalShares + totalSaves;

    res.json({
      pillarId: req.params.id,
      postCount,
      totalEngagement,
      avgEngagement: postCount > 0 ? Math.round(totalEngagement / postCount) : 0,
      totalLikes,
      totalComments,
      totalShares,
      totalSaves,
      totalReach,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
