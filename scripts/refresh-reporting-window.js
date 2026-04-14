// scripts/refresh-reporting-window.js
//
// Ad-hoc refresh for a single (client, window). Handy for manual testing or
// when a specific window is known to need recomputation without running the
// full backfill.
//
// Usage:
//   node scripts/refresh-reporting-window.js \
//     --clientSlug=acme \
//     --dateStart=2026-03-01 \
//     --dateEnd=2026-04-01

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { refreshClientReportingWindow } from '../src/lib/reporting/refresh-window.js';

function parseArgs(argv) {
  const out = {};
  for (const a of argv.slice(2)) {
    const m = /^--([^=]+)=(.*)$/.exec(a);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

async function main() {
  const { clientSlug, dateStart, dateEnd } = parseArgs(process.argv);
  if (!clientSlug || !dateStart || !dateEnd) {
    console.error('Usage: refresh-reporting-window.js --clientSlug=<slug> --dateStart=YYYY-MM-DD --dateEnd=YYYY-MM-DD');
    return 1;
  }
  const prisma = new PrismaClient();
  try {
    const client = await prisma.client.findUnique({ where: { slug: clientSlug }, select: { id: true } });
    if (!client) {
      console.error(`Client not found: ${clientSlug}`);
      return 1;
    }
    const result = await refreshClientReportingWindow(prisma, {
      clientId: client.id,
      dateStart,
      dateEnd,
    });
    console.log(JSON.stringify(result, null, 2));
    return result.errors.length > 0 ? 2 : 0;
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
