import 'dotenv/config';
import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { decrypt } from '../lib/encryption.js';

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
      // Include PENDING so that newly-added YouTube accounts (which start PENDING
      // and resolve their handle → channel ID on first sync) are not skipped.
      where: { tokenStatus: { in: ['ACTIVE', 'PENDING'] } },
      include: { client: true },
    });

    for (const account of accounts) {
      // Decrypt OAuth tokens before passing to platform functions.
      // decrypt() is a no-op on plaintext tokens (backward-compatible).
      const account_ = {
        ...account,
        accessToken:  decrypt(account.accessToken),
        refreshToken: decrypt(account.refreshToken),
      };
      try {
        console.log(`  Syncing ${account_.client.name} / ${account_.platform} (@${account_.handle})`);
        switch (account_.platform) {
          case 'INSTAGRAM': {
            const { syncInstagram } = await import('../lib/platforms/instagram.js');
            await syncInstagram(prisma, account_);
            break;
          }
          case 'FACEBOOK': {
            const { syncFacebook } = await import('../lib/platforms/facebook.js');
            await syncFacebook(prisma, account_);
            break;
          }
          case 'YOUTUBE': {
            const { syncYouTube } = await import('../lib/platforms/youtube.js');
            await syncYouTube(prisma, account_);
            break;
          }
          default:
            console.log(`    Skipping ${account_.platform} (not yet implemented)`);
        }
        await prisma.socialAccount.update({ where: { id: account_.id }, data: { lastSyncedAt: new Date() } });
      } catch (err) {
        const detail = err.response?.data?.error?.message || err.message;
        console.error(`  ERROR syncing ${account_.handle} [${account_.platform}]: ${detail}`);
        if (err.response?.data?.error?.code === 190 || detail?.includes('token')) {
          await prisma.socialAccount.update({ where: { id: account_.id }, data: { tokenStatus: 'EXPIRED' } });
        }
      }
    }
  } catch (err) {
    console.error('  ERROR in social sync block:', err.message);
  }

  // Sync DM conversations for Instagram and Facebook accounts
  try {
    const { syncMessages } = await import('../lib/platforms/messages.js');
    const messagingAccounts = await prisma.socialAccount.findMany({
      where: {
        tokenStatus: { in: ['ACTIVE', 'PENDING'] },
        platform: { in: ['INSTAGRAM', 'FACEBOOK'] },
      },
      include: { client: true },
    });
    for (const account of messagingAccounts) {
      const account_ = {
        ...account,
        accessToken:  decrypt(account.accessToken),
        refreshToken: decrypt(account.refreshToken),
      };
      try {
        console.log(`  Syncing messages for ${account_.client.name} / ${account_.platform} (@${account_.handle})`);
        await syncMessages(prisma, account_);
      } catch (err) {
        const detail = err.response?.data?.error?.message || err.message;
        console.error(`  ERROR syncing messages for @${account.handle} [${account.platform}]: ${detail}`);
      }
    }
  } catch (err) {
    console.error('  ERROR in message sync block:', err.message);
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

  // Transcription catch-up: process any video posts missed by the inline trigger
  // (first sync after feature deploy, transient API errors, etc.)
  // Limit to 3 per platform (up to 6 total) per cycle to stay within Whisper rate limits.
  try {
    const { transcribeReel, transcribeYouTubeVideo } = await import('../lib/transcribe.js');

    // Query scoped by platform so Facebook VIDEO posts are never sent to
    // transcribeYouTubeVideo(), and the 5-per-cycle budget isn't wasted on them.
    const [reels, ytVideos] = await Promise.all([
      prisma.post.findMany({
        where: {
          mediaType: 'REEL',
          transcription: null,
          socialAccount: { platform: 'INSTAGRAM' },
        },
        take: 3,
        orderBy: { publishedAt: 'desc' },
        select: { id: true, mediaType: true, mediaUrl: true, platformPostId: true },
      }),
      prisma.post.findMany({
        where: {
          mediaType: { in: ['VIDEO', 'SHORT'] },
          transcription: null,
          socialAccount: { platform: 'YOUTUBE' },
        },
        take: 3,
        orderBy: { publishedAt: 'desc' },
        select: { id: true, mediaType: true, mediaUrl: true, platformPostId: true },
      }),
    ]);

    const untranscribed = [...reels, ...ytVideos];
    if (untranscribed.length > 0) {
      console.log(`  Transcription catch-up: ${untranscribed.length} post(s) pending...`);
      for (const post of untranscribed) {
        try {
          if (post.mediaType === 'REEL') {
            await transcribeReel(prisma, post);
          } else {
            await transcribeYouTubeVideo(prisma, post);
          }
        } catch (err) {
          console.error(`  Transcription catch-up error (${post.id}): ${err.message}`);
        }
      }
    }
  } catch (err) {
    console.error('  Transcription catch-up block error:', err.message);
  }

  console.log(`[${new Date().toISOString()}] Sync cycle complete.`);
}

cron.schedule('0 */4 * * *', syncAllAccounts);
syncAllAccounts();
