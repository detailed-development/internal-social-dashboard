import express from 'express';
import cors from 'cors';
import requireAuth from './middleware/requireAuth.js';
import clientRoutes from './routes/clients.js';
import postRoutes from './routes/posts.js';
import analyticsRoutes from './routes/analytics.js';
import ga4PropertiesRoutes from './routes/ga4-properties.js';
import adminRoutes from './routes/admin.js';
import messagesRoutes from './routes/messages.js';
import socialRoutes from './routes/social.js';
import aiRoutes from './routes/ai.js';

const app = express();

app.use(cors());
app.use(express.json());

// Health check — no auth required (used by container orchestration)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth gate — every route below this point is protected
app.use(requireAuth);

// Lightweight endpoint the frontend polls to verify session status.
// The middleware above handles 401/403; if we reach here the session is valid.
app.get('/api/auth/check', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/clients', clientRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ga4-properties', ga4PropertiesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/ai', aiRoutes);

export default app;
