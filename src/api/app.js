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

// Auth is enforced client-side: AuthGate calls the WordPress endpoint directly
// from the browser so WP session cookies are included automatically.
// requireAuth (server-side cookie proxy) is imported but not mounted because
// the dashboard runs on a different origin from WordPress and the browser
// won't send WP cookies to this domain.
//
// Re-enable once the WP endpoint sends CORS headers + sets cookies on
// .neoncactusmedia.com (so the browser forwards them here too):
//   app.use(requireAuth);

app.use('/api/clients', clientRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ga4-properties', ga4PropertiesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/ai', aiRoutes);

export default app;
