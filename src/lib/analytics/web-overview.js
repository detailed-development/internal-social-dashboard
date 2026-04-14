// src/lib/analytics/web-overview.js
//
// Builds dailyTraffic, trafficSources, deviceBreakdown, topPages from either
// the reporting read-model or the raw WebAnalytic table.
// Both paths return the same shape; values are shaped for direct use in
// existing frontend charts.

import { toIsoDate } from '../reporting/date-utils.js';

const EMPTY = Object.freeze({
  dailyTraffic: [],
  trafficSources: [],
  deviceBreakdown: [],
  topPages: [],
});

/** Read-model path. */
export async function buildWebOverviewFromReadModel(prisma, { clientId, windowStart, windowEnd }) {
  const [dailyRows, sourceRows, deviceRows, pageRows] = await Promise.all([
    prisma.clientWebDailyMetric.findMany({
      where: { clientId, date: { gte: windowStart, lte: windowEnd } },
      orderBy: { date: 'asc' },
    }),
    prisma.clientTrafficSourceDaily.findMany({
      where: { clientId, date: { gte: windowStart, lte: windowEnd } },
    }),
    prisma.clientDeviceDaily.findMany({
      where: { clientId, date: { gte: windowStart, lte: windowEnd } },
    }),
    prisma.clientPageDaily.findMany({
      where: { clientId, date: { gte: windowStart, lte: windowEnd } },
    }),
  ]);

  if (dailyRows.length === 0 && sourceRows.length === 0 && deviceRows.length === 0 && pageRows.length === 0) {
    return { ...EMPTY };
  }

  const dailyTraffic = dailyRows.map((r) => ({
    date: toIsoDate(r.date),
    sessions: r.sessions,
    users: r.users,
    pageviews: r.pageviews,
    bounceRate: r.bounceRateAvg != null ? Number(r.bounceRateAvg) : null,
    avgSessionDuration: r.avgSessionDuration != null ? Number(r.avgSessionDuration) : null,
  }));

  const trafficSources = sumBy(
    sourceRows,
    (r) => `${r.source}||${r.medium}`,
    (r, acc) => ({
      source: r.source,
      medium: r.medium,
      sessions: (acc?.sessions || 0) + r.sessions,
      users:    (acc?.users    || 0) + r.users,
    })
  ).sort((a, b) => b.sessions - a.sessions).slice(0, 10);

  const deviceBreakdown = sumBy(
    deviceRows,
    (r) => r.device,
    (r, acc) => ({
      device: r.device,
      sessions: (acc?.sessions || 0) + r.sessions,
      users:    (acc?.users    || 0) + r.users,
    })
  ).sort((a, b) => b.sessions - a.sessions);

  const topPages = sumBy(
    pageRows,
    (r) => r.path,
    (r, acc) => ({
      path: r.path,
      sessions:  (acc?.sessions  || 0) + r.sessions,
      pageviews: (acc?.pageviews || 0) + r.pageviews,
    })
  ).sort((a, b) => b.sessions - a.sessions).slice(0, 10);

  return { dailyTraffic, trafficSources, deviceBreakdown, topPages };
}

/** Raw-table fallback — mirrors current gatherClientAnalytics logic. */
export async function buildWebOverviewFromRaw(prisma, { clientId, windowStart, windowEnd }) {
  const [dailyRows, sourceRows, deviceRows, pageRows] = await Promise.all([
    prisma.webAnalytic.findMany({
      where: { clientId, date: { gte: windowStart, lte: windowEnd }, source: 'all', medium: 'all' },
      orderBy: { date: 'asc' },
    }),
    prisma.webAnalytic.findMany({
      where: {
        clientId,
        date: { gte: windowStart, lte: windowEnd },
        source: { notIn: ['all', '_device', '_page'] },
      },
      orderBy: { sessions: 'desc' },
      take: 50,
    }),
    prisma.webAnalytic.findMany({
      where: { clientId, date: { gte: windowStart, lte: windowEnd }, source: '_device' },
    }),
    prisma.webAnalytic.findMany({
      where: { clientId, date: { gte: windowStart, lte: windowEnd }, source: '_page' },
    }),
  ]);

  const dailyTraffic = dailyRows.map((r) => ({
    date: toIsoDate(r.date),
    sessions: r.sessions,
    users: r.users,
    pageviews: r.pageviews,
    bounceRate: r.bounceRate != null ? Math.round(r.bounceRate * 100) / 100 : null,
    avgSessionDuration: r.avgSessionDuration != null ? Math.round(r.avgSessionDuration * 100) / 100 : null,
  }));

  const trafficSources = sumBy(
    sourceRows,
    (r) => `${r.source}||${r.medium}`,
    (r, acc) => ({
      source: r.source,
      medium: r.medium,
      sessions: (acc?.sessions || 0) + r.sessions,
      users:    (acc?.users    || 0) + r.users,
    })
  ).sort((a, b) => b.sessions - a.sessions).slice(0, 10);

  const deviceBreakdown = sumBy(
    deviceRows,
    (r) => r.medium || 'unknown',
    (r, acc) => ({
      device: r.medium || 'unknown',
      sessions: (acc?.sessions || 0) + r.sessions,
      users:    (acc?.users    || 0) + r.users,
    })
  ).sort((a, b) => b.sessions - a.sessions);

  const topPages = sumBy(
    pageRows,
    (r) => r.medium || '/',
    (r, acc) => ({
      path: r.medium || '/',
      sessions:  (acc?.sessions  || 0) + r.sessions,
      pageviews: (acc?.pageviews || 0) + r.pageviews,
    })
  ).sort((a, b) => b.sessions - a.sessions).slice(0, 10);

  return { dailyTraffic, trafficSources, deviceBreakdown, topPages };
}

/**
 * Group rows by `keyFn`, folding each row into an accumulator via `foldFn`.
 */
function sumBy(rows, keyFn, foldFn) {
  const map = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    map.set(k, foldFn(r, map.get(k)));
  }
  return [...map.values()];
}
