import express from 'express';
import cors from 'cors';
import axios from 'axios';
import clientRoutes from './routes/clients.js';
import postRoutes from './routes/posts.js';
import analyticsRoutes from './routes/analytics.js';
import ga4PropertiesRoutes from './routes/ga4-properties.js';
import adminRoutes from './routes/admin.js';
import messagesRoutes from './routes/messages.js';
import socialRoutes from './routes/social.js';
import aiRoutes from './routes/ai.js';
import contentPillarsRoutes from './routes/content-pillars.js';

const app = express();

app.use(cors());
app.use(express.json());

// Health check — no auth required
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth check — proxied server-side to WordPress so the browser never needs
// to make a cross-origin request. The browser's WP session cookies are sent
// to app.neoncactusmedia.com (same registrable domain as neoncactusmedia.com)
// and are forwarded here to WordPress for validation. No CORS configuration
// on the WP side is required.
app.get('/api/auth/check', async (req, res) => {
  const url = process.env.AUTH_CHECK_URL;
  if (!url) return res.json({ ok: true }); // dev: no WP configured

  try {
    const { status, data } = await axios.get(url, {
      headers: { cookie: req.headers.cookie ?? '' },
      validateStatus: () => true,
      timeout: 5000,
    });
    return res.status(status).json(data);
  } catch {
    return res.status(503).json({ error: 'auth_unavailable' });
  }
});

app.use('/api/clients', clientRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ga4-properties', ga4PropertiesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/content-pillars', contentPillarsRoutes);

export default app;
