import { Router } from 'express';
const router = Router();

router.get('/', async (req, res) => {
  const prisma = req.app.get('prisma');
  const clients = await prisma.client.findMany({
    include: {
      socialAccounts: {
        select: { id: true, platform: true, handle: true, tokenStatus: true, lastSyncedAt: true, followerCount: true },
      },
    },
    orderBy: { name: 'asc' },
  });
  res.json(clients);
});

router.post('/', async (req, res) => {
  const prisma = req.app.get('prisma');
  const { name, slug, avatarColor } = req.body;
  const client = await prisma.client.create({ data: { name, slug, avatarColor } });
  res.status(201).json(client);
});

router.get('/:slug', async (req, res) => {
  const prisma = req.app.get('prisma');
  const client = await prisma.client.findUnique({
    where: { slug: req.params.slug },
    include: {
      socialAccounts: {
        include: {
          posts: {
            orderBy: { publishedAt: 'desc' },
            take: 20,
            include: {
              metrics: { orderBy: { recordedAt: 'desc' }, take: 1 },
              comments: { orderBy: { postedAt: 'desc' }, take: 5 },
              transcription: true,
            },
          },
        },
      },
    },
  });
  if (!client) return res.status(404).json({ error: 'Client not found' });
  res.json(client);
});

export default router;
