import 'dotenv/config';
import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function syncAllAccounts() {
  console.log(`[${new Date().toISOString()}] Starting sync cycle...`);
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
          console.log(`    Skipping ${account.platform} (CSV import only for now)`);
      }
      await prisma.socialAccount.update({ where: { id: account.id }, data: { lastSyncedAt: new Date() } });
    } catch (err) {
      console.error(`  ERROR syncing ${account.handle}:`, err.message);
      if (err.message.includes('token')) {
        await prisma.socialAccount.update({ where: { id: account.id }, data: { tokenStatus: 'EXPIRED' } });
      }
    }
  }
  console.log(`[${new Date().toISOString()}] Sync cycle complete.`);
}

cron.schedule('0 */4 * * *', syncAllAccounts);
syncAllAccounts();
