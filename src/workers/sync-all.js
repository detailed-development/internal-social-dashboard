// src/workers/sync-all.js
//
// In-process cron wrapper. This file must stay thin: it only schedules runs
// and delegates all work to runFullSync() in sync-core.js. The canonical
// nightly runner is the GitHub Actions workflow at
// .github/workflows/nightly-sync.yml; this process provides intra-day
// refreshes for deployments that also run the long-lived worker.

import cron from 'node-cron';
import { runFullSync } from './sync-core.js';

process.on('uncaughtException', (err) => {
  console.error('[CRASH] uncaughtException:', err.message);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason) => {
  console.error('[CRASH] unhandledRejection:', reason);
});

async function tick(mode) {
  try {
    const summary = await runFullSync({ mode });
    console.log('[sync-summary]', JSON.stringify(summary));
  } catch (err) {
    console.error('[sync-summary] fatal error:', err.message);
    console.error(err.stack);
  }
}

// Every 4 hours, on the hour. Provides intra-day freshness; the nightly GitHub
// Actions workflow is still the authoritative daily runner.
cron.schedule('0 */4 * * *', () => tick('intraday'));

// Run once on startup so a fresh worker container immediately begins syncing.
tick('intraday');
