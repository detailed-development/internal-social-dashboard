import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import clientRoutes from './routes/clients.js';
import postRoutes from './routes/posts.js';
import analyticsRoutes from './routes/analytics.js';
import ga4PropertiesRoutes from './routes/ga4-properties.js';
import adminRoutes from './routes/admin.js';
import messagesRoutes from './routes/messages.js';
import { runFullRefresh } from '../lib/meta-token-refresh.js';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.set('prisma', prisma);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/clients', clientRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ga4-properties', ga4PropertiesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/messages', messagesRoutes);

app.listen(PORT, () => {
  console.log(`NCM Social Dashboard API running on port ${PORT}`);
});

// Refresh Meta tokens every Sunday at 2 AM.
// Meta long-lived tokens last 60 days; weekly keeps them perpetually fresh.
cron.schedule('0 2 * * 0', async () => {
  console.log('[cron] Starting weekly Meta token refresh...');
  try {
    const { updated, errors, total } = await runFullRefresh(prisma);
    console.log(`[cron] Meta refresh complete — ${updated.length}/${total} accounts updated, ${errors.length} errors`);
    if (errors.length) console.error('[cron] Errors:', errors);
  } catch (err) {
    console.error('[cron] Meta token refresh failed:', err.message);
  }
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
