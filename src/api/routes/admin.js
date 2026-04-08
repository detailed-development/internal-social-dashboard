import { Router } from 'express';
import { runFullRefresh, refreshAccounts, exchangeTokenFrom, persistToken } from '../../lib/meta-token-refresh.js';

const router = Router();

// GET /api/admin/refresh-meta-tokens
// Exchanges META_USER_TOKEN for a fresh long-lived token, writes it to .env,
// then upserts all FB/IG accounts. Safe to call from a cron or monitoring tool.
router.get('/refresh-meta-tokens', async (req, res) => {
  const prisma = req.app.get('prisma');
  try {
    const { updated, errors, total, newToken } = await runFullRefresh(prisma);
    // newToken is returned so the admin can copy it into container environment
    // settings (META_USER_TOKEN) to persist it across restarts.
    res.json({ tokenRefreshed: true, newToken, updated, errors, total });
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

// POST /api/admin/exchange-short-token
// Body: { shortToken: "<short-lived user access token>" }
// Exchanges the short-lived token for a long-lived one, saves it to .env as
// META_USER_TOKEN, then upserts all FB/IG accounts. Use this when re-authorizing
// with new scopes — the resulting long-lived token will include the new scopes.
router.post('/exchange-short-token', async (req, res) => {
  const prisma = req.app.get('prisma');
  const { shortToken } = req.body;

  if (!shortToken) return res.status(400).json({ error: 'shortToken is required' });

  try {
    const longLivedToken = await exchangeTokenFrom(shortToken);
    persistToken(longLivedToken);
    const { updated, errors, total } = await refreshAccounts(prisma, longLivedToken);
    res.json({ tokenRefreshed: true, updated, errors, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
