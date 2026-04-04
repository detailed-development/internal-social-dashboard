import 'dotenv/config';
import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

process.on('uncaughtException', (err) => {
  console.error('[CRASH] uncaughtException:', err.message);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason) => {
  console.error('[CRASH] unhandledRejection:', reason);
});

const prisma = new PrismaClient();

async function syncAllAccounts() {
  console.log(`[${new Date().toISOString()}] Starting sync cycle...`);

  // Sync social accounts
  try {
    const accounts = await prisma.socialAccount.findMany({
      where: { tokenStatus: 'ACTIVE' },
      include: { client: true },
    });

    for (const account of accounts) {
      try {
        console.log(`  Syncing ${account.client.name} / ${account.platform} (@${account.handle})`);
        switch (account.platform) {
          case 'INSTAGRAM': {
            const { syncInstagram } = await import('../lib/platforms/instagram.js');
            await syncInstagram(prisma, account);
            break;
          }
          case 'FACEBOOK': {
            const { syncFacebook } = await import('../lib/platforms/facebook.js');
            await syncFacebook(prisma, account);
            break;
          }
          case 'YOUTUBE': {
            const { syncYouTube } = await import('../lib/platforms/youtube.js');
            await syncYouTube(prisma, account);
            break;
          }
          default:
            console.log(`    Skipping ${account.platform} (not yet implemented)`);
        }
        await prisma.socialAccount.update({ where: { id: account.id }, data: { lastSyncedAt: new Date() } });
      } catch (err) {
        const detail = err.response?.data?.error?.message || err.message;
        console.error(`  ERROR syncing ${account.handle} [${account.platform}]: ${detail}`);
        if (err.response?.data?.error?.code === 190 || detail?.includes('token')) {
          await prisma.socialAccount.update({ where: { id: account.id }, data: { tokenStatus: 'EXPIRED' } });
        }
      }
    }
  } catch (err) {
    console.error('  ERROR in social sync block:', err.message);
  }

  // Sync Google Analytics (only if service account key exists)
  try {
    const { readFileSync } = await import('fs');
    const { join, dirname } = await import('path');
    const { fileURLToPath } = await import('url');
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const keyPath = join(__dirname, '../../google-service-account.json');
    readFileSync(keyPath); // will throw if missing

    const { syncGoogleAnalytics } = await import('../lib/platforms/google-analytics.js');
    const clients = await prisma.client.findMany({ where: { gaPropertyId: { not: null } } });
    console.log(`  Syncing GA4 for ${clients.length} clients...`);
    for (const client of clients) {
      try {
        await syncGoogleAnalytics(prisma, client);
      } catch (err) {
        console.error(`  ERROR syncing GA4 for ${client.name}: ${err.message}`);
      }
    }
  } catch (e) {
    if (e.code === 'ENOENT') {
      console.log('  Skipping GA4 sync (google-service-account.json not found)');
    } else {
      console.error('  GA4 sync error:', e.message);
    }
  }

  console.log(`[${new Date().toISOString()}] Sync cycle complete.`);
}

cron.schedule('0 */4 * * *', syncAllAccounts);
syncAllAccounts();
