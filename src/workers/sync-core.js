// src/workers/sync-core.js
//
// Reusable sync orchestrator. This is Layer A's core: it owns external fetches,
// token handling, incremental sync behavior, and deterministic enrichment
// (transcription catch-up). It must NOT import from src/lib/ai/**.
//
// Two runners call in here:
//   - src/workers/sync-all.js    — in-process node-cron (every 4 hours)
//   - scripts/nightly-sync.js    — one-shot runner used by GitHub Actions
//
// After a successful cycle, when USE_REPORTING_READ_MODEL=true, this function
// triggers reporting rollups for clients that had sync activity so the Layer B
// read model stays fresh without a second schedule.

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { decrypt } from '../lib/encryption.js';

const defaultPrisma = new PrismaClient();

/**
 * Run one full sync cycle across all active accounts and clients.
 *
 * @param {object} [options]
 * @param {import('@prisma/client').PrismaClient} [options.prisma] - Prisma client; default singleton.
 * @param {{log: Function, error: Function}} [options.logger] - logger with log/error; default console.
 * @param {'nightly'|'intraday'|'manual'} [options.mode] - labels the run for observability.
 * @returns {Promise<SyncSummary>} structured summary of the run.
 */
export async function runFullSync({
  prisma = defaultPrisma,
  logger = console,
  mode = 'intraday',
} = {}) {
  const startedAt = new Date();
  const summary = {
    mode,
    startedAt: startedAt.toISOString(),
    finishedAt: null,
    durationMs: 0,
    accountsProcessed: 0,
    accountsSynced: 0,
    accountSyncFailures: 0,
    conversationsProcessed: 0,
    conversationsSyncFailures: 0,
    gaClientsProcessed: 0,
    gaSyncFailures: 0,
    gaSkipped: false,
    transcriptionsAttempted: 0,
    transcriptionsCreated: 0,
    transcriptionFailures: 0,
    reportingRefreshes: 0,
    reportingRefreshFailures: 0,
    errors: [],
    affectedClientIds: new Set(),
  };

  const addError = (scope, ctx, err) => {
    const detail = err?.response?.data?.error?.message || err?.message || String(err);
    summary.errors.push({ scope, ...ctx, message: detail });
  };

  logger.log(`[${startedAt.toISOString()}] Starting sync cycle (mode=${mode})...`);

  // ─── Meta token refresh (preventive) ──────────────────────────────────────
  // Exchange the current long-lived token for a fresh one BEFORE social sync.
  // This keeps the 60-day clock from expiring. If the token is already dead,
  // this will fail gracefully and social sync will fail too — but GA4 and
  // transcription still proceed. The admin will need to re-auth via OAuth.
  try {
    const { runFullRefresh } = await import('../lib/meta-token-refresh.js');
    const refresh = await runFullRefresh(prisma);
    logger.log(`  Meta token refreshed. ${refresh.updated?.length || 0} accounts updated.`);
    summary.metaTokenRefreshed = true;
  } catch (err) {
    const detail = err?.message || String(err);
    logger.error(`  Meta token refresh failed (social sync will likely fail): ${detail}`);
    summary.metaTokenRefreshed = false;
    addError('meta-token-refresh', {}, err);
  }

  // ─── Social account sync ──────────────────────────────────────────────────
  try {
    const accounts = await prisma.socialAccount.findMany({
      // Include PENDING so that newly-added YouTube accounts (which start PENDING
      // and resolve their handle → channel ID on first sync) are not skipped.
      where: { tokenStatus: { in: ['ACTIVE', 'PENDING'] } },
      include: { client: true },
    });

    summary.accountsProcessed = accounts.length;

    for (const account of accounts) {
      // Decrypt OAuth tokens before passing to platform functions.
      // decrypt() is a no-op on plaintext tokens (backward-compatible).
      const account_ = {
        ...account,
        accessToken: decrypt(account.accessToken),
        refreshToken: decrypt(account.refreshToken),
      };
      try {
        logger.log(`  Syncing ${account_.client.name} / ${account_.platform} (@${account_.handle})`);
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
            logger.log(`    Skipping ${account_.platform} (not yet implemented)`);
        }
        await prisma.socialAccount.update({ where: { id: account_.id }, data: { lastSyncedAt: new Date() } });
        summary.accountsSynced += 1;
        summary.affectedClientIds.add(account_.clientId);
      } catch (err) {
        const detail = err.response?.data?.error?.message || err.message;
        logger.error(`  ERROR syncing ${account_.handle} [${account_.platform}]: ${detail}`);
        summary.accountSyncFailures += 1;
        addError('social', { handle: account_.handle, platform: account_.platform }, err);
        if (err.response?.data?.error?.code === 190 || detail?.includes('token')) {
          await prisma.socialAccount.update({ where: { id: account_.id }, data: { tokenStatus: 'EXPIRED' } });
        }
      }
    }
  } catch (err) {
    logger.error('  ERROR in social sync block:', err.message);
    addError('social-block', {}, err);
  }

  // ─── DM sync (Instagram + Facebook) ───────────────────────────────────────
  try {
    const { syncMessages } = await import('../lib/platforms/messages.js');
    const messagingAccounts = await prisma.socialAccount.findMany({
      where: {
        tokenStatus: { in: ['ACTIVE', 'PENDING'] },
        platform: { in: ['INSTAGRAM', 'FACEBOOK'] },
      },
      include: { client: true },
    });
    summary.conversationsProcessed = messagingAccounts.length;
    for (const account of messagingAccounts) {
      const account_ = {
        ...account,
        accessToken: decrypt(account.accessToken),
        refreshToken: decrypt(account.refreshToken),
      };
      try {
        logger.log(`  Syncing messages for ${account_.client.name} / ${account_.platform} (@${account_.handle})`);
        await syncMessages(prisma, account_);
        summary.affectedClientIds.add(account_.clientId);
      } catch (err) {
        const detail = err.response?.data?.error?.message || err.message;
        logger.error(`  ERROR syncing messages for @${account.handle} [${account.platform}]: ${detail}`);
        summary.conversationsSyncFailures += 1;
        addError('messages', { handle: account_.handle, platform: account_.platform }, err);
      }
    }
  } catch (err) {
    logger.error('  ERROR in message sync block:', err.message);
    addError('messages-block', {}, err);
  }

  // ─── Google Analytics (only if service account key exists) ────────────────
  try {
    const { readFileSync } = await import('fs');
    const { join, dirname } = await import('path');
    const { fileURLToPath } = await import('url');
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const keyPath = join(__dirname, '../../google-service-account.json');
    readFileSync(keyPath); // will throw if missing

    const { syncGoogleAnalytics } = await import('../lib/platforms/google-analytics.js');
    const clients = await prisma.client.findMany({ where: { gaPropertyId: { not: null } } });
    summary.gaClientsProcessed = clients.length;
    logger.log(`  Syncing GA4 for ${clients.length} clients...`);
    for (const client of clients) {
      try {
        await syncGoogleAnalytics(prisma, client);
        summary.affectedClientIds.add(client.id);
      } catch (err) {
        logger.error(`  ERROR syncing GA4 for ${client.name}: ${err.message}`);
        summary.gaSyncFailures += 1;
        addError('ga4', { clientSlug: client.slug }, err);
      }
    }
  } catch (e) {
    if (e.code === 'ENOENT') {
      logger.log('  Skipping GA4 sync (google-service-account.json not found)');
      summary.gaSkipped = true;
    } else {
      logger.error('  GA4 sync error:', e.message);
      addError('ga4-block', {}, e);
    }
  }

  // ─── Transcription catch-up ───────────────────────────────────────────────
  // Processes video posts missed by the inline trigger (first sync after
  // feature deploy, transient API errors, etc.). Limited to 3 per platform
  // (up to 6 total) per cycle to stay within Whisper rate limits.
  try {
    const { transcribeReel, transcribeYouTubeVideo } = await import('../lib/transcribe.js');

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
    summary.transcriptionsAttempted = untranscribed.length;
    if (untranscribed.length > 0) {
      logger.log(`  Transcription catch-up: ${untranscribed.length} post(s) pending...`);
      for (const post of untranscribed) {
        try {
          if (post.mediaType === 'REEL') {
            await transcribeReel(prisma, post);
          } else {
            await transcribeYouTubeVideo(prisma, post);
          }
          summary.transcriptionsCreated += 1;
        } catch (err) {
          logger.error(`  Transcription catch-up error (${post.id}): ${err.message}`);
          summary.transcriptionFailures += 1;
          addError('transcription', { postId: post.id }, err);
        }
      }
    }
  } catch (err) {
    logger.error('  Transcription catch-up block error:', err.message);
    addError('transcription-block', {}, err);
  }

  // ─── Reporting read-model refresh (feature-flagged) ───────────────────────
  // Keeps Layer B's precomputed daily aggregates fresh. Only runs when the
  // flag is on AND after Phase 2 migration has shipped. Safe no-op otherwise.
  if (process.env.USE_REPORTING_READ_MODEL === 'true' && summary.affectedClientIds.size > 0) {
    try {
      const { refreshClientReportingWindow } = await import('../lib/reporting/refresh-window.js');
      const windowDays = Number(process.env.REPORTING_REFRESH_WINDOW_DAYS || 35);
      const dateEnd = new Date();
      const dateStart = new Date(dateEnd.getTime() - windowDays * 24 * 60 * 60 * 1000);

      for (const clientId of summary.affectedClientIds) {
        try {
          await refreshClientReportingWindow(prisma, { clientId, dateStart, dateEnd });
          summary.reportingRefreshes += 1;
        } catch (err) {
          logger.error(`  Reporting refresh error for client ${clientId}: ${err.message}`);
          summary.reportingRefreshFailures += 1;
          addError('reporting-refresh', { clientId }, err);
        }
      }
    } catch (err) {
      // Module not yet present (Phase 2 not merged). Treat as no-op.
      if (err.code !== 'ERR_MODULE_NOT_FOUND') {
        logger.error('  Reporting refresh block error:', err.message);
        addError('reporting-block', {}, err);
      }
    }
  }

  const finishedAt = new Date();
  summary.finishedAt = finishedAt.toISOString();
  summary.durationMs = finishedAt.getTime() - startedAt.getTime();

  // Convert Set → array for serialization.
  summary.affectedClientIds = Array.from(summary.affectedClientIds);

  logger.log(
    `[${finishedAt.toISOString()}] Sync cycle complete. ` +
    `accounts=${summary.accountsSynced}/${summary.accountsProcessed} ` +
    `failures=${summary.accountSyncFailures} ` +
    `transcriptions=${summary.transcriptionsCreated}/${summary.transcriptionsAttempted} ` +
    `duration=${Math.round(summary.durationMs / 1000)}s`
  );

  return summary;
}

// Backward-compatible alias. Existing callers still work during the rollout;
// remove in a follow-up PR after sync-all.js and scripts/nightly-sync.js are
// confirmed on the new name.
export const syncAllAccounts = runFullSync;
