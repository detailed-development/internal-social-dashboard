import { Router } from 'express';
const router = Router();

router.get('/', async (req, res) => {
  const prisma = req.app.get('prisma');
  try {
    const clients = await prisma.client.findMany({
      include: {
        group: { select: { id: true, name: true, slug: true, avatarColor: true, sortOrder: true } },
        socialAccounts: {
          select: { id: true, platform: true, handle: true, tokenStatus: true, lastSyncedAt: true, followerCount: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const prisma = req.app.get('prisma');
  const { name, slug, avatarColor } = req.body;

  if (!name) return res.status(400).json({ error: 'name is required' });
  if (!slug) return res.status(400).json({ error: 'slug is required' });

  try {
    const client = await prisma.client.create({ data: { name, slug, avatarColor } });
    res.status(201).json(client);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: `A client with that slug already exists` });
    }
    res.status(500).json({ error: err.message });
  }
});

// Add or claim a social account for a client by platform + handle.
// If an account with that platform+handle already exists in the DB, it gets reassigned.
// Otherwise a stub record is created (PENDING status; sync will fill in the rest).
router.post('/:slug/add-social', async (req, res) => {
  const prisma = req.app.get('prisma');
  const { platform, handle } = req.body;

  if (!platform || !handle) {
    return res.status(400).json({ error: 'platform and handle are required' });
  }

  try {
    const client = await prisma.client.findUnique({ where: { slug: req.params.slug } });
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const normalized = handle.replace(/^@/, '').trim();

    const existing = await prisma.socialAccount.findFirst({
      where: { platform, handle: { equals: normalized, mode: 'insensitive' } },
    });

    let account;
    if (existing) {
      account = await prisma.socialAccount.update({
        where: { id: existing.id },
        data: { clientId: client.id },
      });
    } else {
      account = await prisma.socialAccount.create({
        data: {
          clientId: client.id,
          platform,
          platformUserId: `pending:${platform.toLowerCase()}:${normalized}`,
          handle: normalized,
          tokenStatus: 'PENDING',
        },
      });
    }

    res.json(account);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:slug', async (req, res) => {
  const prisma = req.app.get('prisma');
  try {
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
                pillars: { select: { contentPillarId: true } },
              },
            },
          },
        },
      },
    });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(client);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:slug', async (req, res) => {
  const prisma = req.app.get('prisma');
  const { gaPropertyId, websiteUrl, gtmContainerId } = req.body;

  try {
    const client = await prisma.client.findUnique({ where: { slug: req.params.slug } });
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const updated = await prisma.client.update({
      where: { slug: req.params.slug },
      data: {
        ...(gaPropertyId !== undefined && { gaPropertyId: gaPropertyId || null }),
        ...(websiteUrl !== undefined && { websiteUrl: websiteUrl || null }),
        ...(gtmContainerId !== undefined && { gtmContainerId: gtmContainerId || null }),
      },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
