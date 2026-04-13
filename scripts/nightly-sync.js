// scripts/nightly-sync.js
//
// One-shot runner invoked by the GitHub Actions nightly-sync workflow (and
// available locally as `npm run sync:nightly`). It does not schedule; it runs
// runFullSync() once and exits. The summary is printed as a single-line JSON
// blob on stdout so the GH Actions log is easy to parse and artifact.

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { runFullSync } from '../src/workers/sync-core.js';

async function main() {
  const prisma = new PrismaClient();
  try {
    const summary = await runFullSync({ prisma, logger: console, mode: 'nightly' });
    // Single-line JSON for easy grep/parse in logs:
    console.log('[sync-summary]', JSON.stringify(summary));
    // Exit 0 even when per-account failures occurred — those are recorded in
    // summary.errors and handled by ops/alerting, not a process-level failure.
    return 0;
  } catch (err) {
    console.error('[sync-summary] fatal error:', err.message);
    console.error(err.stack);
    return 1;
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
