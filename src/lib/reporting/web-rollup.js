// src/lib/reporting/web-rollup.js
//
// Rebuild GA4-side reporting aggregates. Reads the WebAnalytic table and
// routes rows into four specific tables based on the source sentinel encoding
// already used by the GA4 sync code:
//
//   source='all' AND medium='all'              → client_web_daily_metrics
//   source='_device'                            → client_device_daily
//   source='_page'                              → client_page_daily
//   otherwise                                   → client_traffic_source_daily
//
// Delete-and-rebuild per (client, date-window, table). Idempotent and safe
// to rerun.

import { toUtcDateOnly } from './date-utils.js';

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ clientId: string, dateStart: Date, dateEnd: Date }} params
 * @returns {Promise<{ overviewWritten: number, sourcesWritten: number, devicesWritten: number, pagesWritten: number }>}
 */
export async function rebuildWebRollups(prisma, { clientId, dateStart, dateEnd }) {
  const windowStart = toUtcDateOnly(dateStart);
  const windowEnd   = toUtcDateOnly(dateEnd);

  const rows = await prisma.webAnalytic.findMany({
    where: {
      clientId,
      date: { gte: windowStart, lte: windowEnd },
    },
    orderBy: { date: 'asc' },
  });

  const overviewRows = [];
  const sourceRows = [];
  const deviceRows = [];
  const pageRows = [];

  for (const r of rows) {
    const date = toUtcDateOnly(r.date);
    const base = {
      clientId,
      date,
      sessions: r.sessions,
      users: r.users,
      pageviews: r.pageviews,
    };

    if (r.source === 'all' && r.medium === 'all') {
      overviewRows.push({
        ...base,
        newUsers: r.newUsers,
        bounceRateAvg: r.bounceRate != null ? round2(r.bounceRate) : null,
        avgSessionDuration: r.avgSessionDuration != null ? round2(r.avgSessionDuration) : null,
      });
    } else if (r.source === '_device') {
      deviceRows.push({ ...base, device: r.medium || 'unknown' });
    } else if (r.source === '_page') {
      pageRows.push({ ...base, path: r.medium || '/' });
    } else if (r.source && r.medium) {
      sourceRows.push({ ...base, source: r.source, medium: r.medium });
    }
    // Anything else (null source/medium, unrecognized sentinel) is ignored —
    // the data contract is documented and the GA4 sync only emits these four
    // categories.
  }

  // Delete-and-rebuild per table. Each table gets its own transaction to
  // keep locks narrow.
  await prisma.$transaction([
    prisma.clientWebDailyMetric.deleteMany({
      where: { clientId, date: { gte: windowStart, lte: windowEnd } },
    }),
    ...(overviewRows.length > 0
      ? [prisma.clientWebDailyMetric.createMany({ data: overviewRows, skipDuplicates: true })]
      : []),
  ]);

  await prisma.$transaction([
    prisma.clientTrafficSourceDaily.deleteMany({
      where: { clientId, date: { gte: windowStart, lte: windowEnd } },
    }),
    ...(sourceRows.length > 0
      ? [prisma.clientTrafficSourceDaily.createMany({ data: sourceRows, skipDuplicates: true })]
      : []),
  ]);

  await prisma.$transaction([
    prisma.clientDeviceDaily.deleteMany({
      where: { clientId, date: { gte: windowStart, lte: windowEnd } },
    }),
    ...(deviceRows.length > 0
      ? [prisma.clientDeviceDaily.createMany({ data: deviceRows, skipDuplicates: true })]
      : []),
  ]);

  await prisma.$transaction([
    prisma.clientPageDaily.deleteMany({
      where: { clientId, date: { gte: windowStart, lte: windowEnd } },
    }),
    ...(pageRows.length > 0
      ? [prisma.clientPageDaily.createMany({ data: pageRows, skipDuplicates: true })]
      : []),
  ]);

  return {
    overviewWritten: overviewRows.length,
    sourcesWritten: sourceRows.length,
    devicesWritten: deviceRows.length,
    pagesWritten: pageRows.length,
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
