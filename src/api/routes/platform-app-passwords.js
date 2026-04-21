import { Router } from 'express';

const router = Router();

async function getClientBySlug(prisma, slug) {
  return prisma.client.findUnique({
    where: { slug },
    select: { id: true, slug: true },
  });
}

async function getClientPlatformPasswordRecord(prisma, clientId, platform) {
  return prisma.platformAppPassword.findUnique({
    where: {
      clientId_platform: { clientId, platform },
    },
    include: {
      history: {
        orderBy: { changedAt: 'desc' },
        take: 20,
      },
    },
  });
}

// GET /api/platform-app-passwords/:slug/:platform
// Returns the current (possibly null) password + recent history for a client/platform pair.
router.get('/:slug/:platform', async (req, res) => {
  const prisma = req.app.get('prisma');
  const { slug, platform } = req.params;
  try {
    const client = await getClientBySlug(prisma, slug);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const record = await getClientPlatformPasswordRecord(prisma, client.id, platform);
    res.json(record || { clientId: client.id, platform, password: null, history: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/platform-app-passwords/:slug/:platform
// Upsert the password for a client/platform pair and append a version snapshot.
router.put('/:slug/:platform', async (req, res) => {
  const prisma = req.app.get('prisma');
  const { slug, platform } = req.params;
  const { password, changedBy } = req.body;
  try {
    const client = await getClientBySlug(prisma, slug);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const record = await prisma.platformAppPassword.upsert({
      where: {
        clientId_platform: { clientId: client.id, platform },
      },
      create: {
        clientId: client.id,
        platform,
        password: password ?? null,
      },
      update: {
        password: password ?? null,
      },
    });

    await prisma.platformAppPasswordHistory.create({
      data: {
        platformAppPasswordId: record.id,
        platform,
        password: password ?? null,
        changedBy: changedBy || null,
      },
    });

    const full = await getClientPlatformPasswordRecord(prisma, client.id, platform);
    res.json(full);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/platform-app-passwords/:slug/:platform/history/:historyId
// Removes a previous saved version while protecting the latest snapshot.
router.delete('/:slug/:platform/history/:historyId', async (req, res) => {
  const prisma = req.app.get('prisma');
  const { slug, platform, historyId } = req.params;
  try {
    const client = await getClientBySlug(prisma, slug);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const record = await getClientPlatformPasswordRecord(prisma, client.id, platform);
    if (!record) {
      return res.status(404).json({ error: 'No password history found for this client platform.' });
    }

    const historyEntry = record.history.find(entry => entry.id === historyId);
    if (!historyEntry) {
      return res.status(404).json({ error: 'Password history entry not found.' });
    }

    if (record.history[0]?.id === historyId) {
      return res.status(400).json({ error: 'Cannot remove the current password version.' });
    }

    await prisma.platformAppPasswordHistory.delete({
      where: { id: historyId },
    });

    const full = await getClientPlatformPasswordRecord(prisma, client.id, platform);
    return res.json(full || { clientId: client.id, platform, password: null, history: [] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
