// scripts/backfill-reporting-read-model.js
//
// One-time (or repair) backfill of the reporting read-model tables.
// Iterates historical dates in batches, calling refreshClientReportingWindow
// per (client, window). Safe to rerun — the underlying rollups are
// delete-and-rebuild per window.
//
// Usage:
//   node scripts/backfill-reporting-read-model.js \
//     [--clientSlug=<slug>] \
//     [--dateStart=YYYY-MM-DD] \
//     [--dateEnd=YYYY-MM-DD] \
//     [--batchDays=30]
//
// Defaults: all active clients, last 90 days, 30-day batches.

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { refreshClientReportingWindow } from '../src/lib/reporting/refresh-window.js';
import { dateWindows, toIsoDate, toUtcDateOnly } from '../src/lib/reporting/date-utils.js';

function parseArgs(argv) {
  const out = {};
  for (const a of argv.slice(2)) {
    const m = /^--([^=]+)=(.*)$/.exec(a);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  const batchDays = Number(args.batchDays || 30);

  const today = toUtcDateOnly(new Date());
  const defaultStart = new Date(today);
  defaultStart.setUTCDate(defaultStart.getUTCDate() - 90);

  const dateStart = toUtcDateOnly(args.dateStart || defaultStart);
  const dateEnd   = toUtcDateOnly(args.dateEnd   || today);

  const prisma = new PrismaClient();
  try {
    const where = args.clientSlug ? { slug: args.clientSlug } : {};
    const clients = await prisma.client.findMany({
      where,
      select: { id: true, slug: true, name: true },
      orderBy: { name: 'asc' },
    });

    if (clients.length === 0) {
      console.log('[backfill] No clients matched. Exiting.');
      return 0;
    }

    console.log(`[backfill] Targets: ${clients.length} client(s)`);
    console.log(`[backfill] Range:   ${toIsoDate(dateStart)} → ${toIsoDate(dateEnd)} (batch=${batchDays} days)`);

    const summary = {
      clientsProcessed: 0,
      windowsProcessed: 0,
      failures: [],
    };

    for (const c of clients) {
      console.log(`[backfill] ${c.name} (${c.slug})`);
      for (const [ws, we] of dateWindows(dateStart, dateEnd, batchDays)) {
        const label = `${toIsoDate(ws)}..${toIsoDate(we)}`;
        try {
          const res = await refreshClientReportingWindow(prisma, {
            clientId: c.id,
            dateStart: ws,
            dateEnd: we,
          });
          summary.windowsProcessed += 1;
          console.log(
            `  ${label}  social=${res.social?.dailyMetricsWritten ?? '?'}/${res.social?.postsWritten ?? '?'} ` +
            `web=${res.web?.overviewWritten ?? '?'}/${res.web?.sourcesWritten ?? '?'}/${res.web?.devicesWritten ?? '?'}/${res.web?.pagesWritten ?? '?'} ` +
            `buzz=${res.buzzwords?.rowsWritten ?? '?'} ` +
            `${res.errors.length ? `errors=${res.errors.length}` : ''} ` +
            `(${res.durationMs}ms)`
          );
          if (res.errors.length > 0) {
            summary.failures.push({ clientSlug: c.slug, window: label, errors: res.errors });
          }
        } catch (err) {
          console.error(`  ${label}  FAILED: ${err.message}`);
          summary.failures.push({ clientSlug: c.slug, window: label, errors: [{ scope: 'unknown', message: err.message }] });
        }
      }
      summary.clientsProcessed += 1;
    }

    console.log('[backfill]', JSON.stringify(summary));
    return summary.failures.length > 0 ? 2 : 0;
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
