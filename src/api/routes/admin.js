import { Router } from 'express';
import { runFullRefresh, refreshAccounts } from '../../lib/meta-token-refresh.js';

const router = Router();

// GET /api/admin/refresh-meta-tokens
// Exchanges META_USER_TOKEN for a fresh long-lived token, writes it to .env,
// then upserts all FB/IG accounts. Safe to call from a cron or monitoring tool.
router.get('/refresh-meta-tokens', async (req, res) => {
  const prisma = req.app.get('prisma');
  try {
    const { updated, errors, total } = await runFullRefresh(prisma);
    res.json({ tokenRefreshed: true, updated, errors, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/refresh-meta-tokens
// Body: { token: "<long-lived user access token>" }
// Upserts all FB/IG accounts without touching .env.
router.post('/refresh-meta-tokens', async (req, res) => {
  const prisma = req.app.get('prisma');
  const { token } = req.body;

  if (!token) return res.status(400).json({ error: 'token is required' });

  try {
    const { updated, errors, total } = await refreshAccounts(prisma, token);
    res.json({ updated, errors, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
