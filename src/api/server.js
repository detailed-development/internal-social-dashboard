import 'dotenv/config';
import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import app from './app.js';
import { runFullRefresh } from '../lib/meta-token-refresh.js';

const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.set('prisma', prisma);

app.listen(PORT, () => {
  console.log(`NCM Social Dashboard API running on port ${PORT}`);
});

// Refresh Meta tokens every Sunday at 2 AM.
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

const shutdown = async () => {
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
