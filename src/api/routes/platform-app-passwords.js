import { Router } from 'express';
const router = Router();

// GET /api/platform-app-passwords/:platform
// Returns the current (possibly null) password + recent history.
router.get('/:platform', async (req, res) => {
  const prisma = req.app.get('prisma');
  const platform = req.params.platform;
  try {
    const record = await prisma.platformAppPassword.findUnique({
      where: { platform },
      include: {
        history: {
          orderBy: { changedAt: 'desc' },
          take: 20,
        },
      },
    });
    res.json(record || { platform, password: null, history: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/platform-app-passwords/:platform
// Upsert the password and append a history entry capturing the previous value.
router.put('/:platform', async (req, res) => {
  const prisma = req.app.get('prisma');
  const platform = req.params.platform;
  const { password, changedBy } = req.body;
  try {
    const record = await prisma.platformAppPassword.upsert({
      where: { platform },
      create: { platform, password: password ?? null },
      update: { password: password ?? null },
    });
    await prisma.platformAppPasswordHistory.create({
      data: {
        platformAppPasswordId: record.id,
        platform,
        password: password ?? null,
        changedBy: changedBy || null,
      },
    });
    const full = await prisma.platformAppPassword.findUnique({
      where: { platform },
      include: { history: { orderBy: { changedAt: 'desc' }, take: 20 } },
    });
    res.json(full);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
