// src/lib/reporting/date-utils.js
//
// Shared date helpers for reporting rollups. All rollup dates are UTC
// calendar dates (matching the current gatherClientAnalytics behavior which
// uses `publishedAt.toISOString().split('T')[0]`).

/**
 * Return a Date at 00:00:00.000 UTC for the same calendar day as the input.
 * Accepts Date | string (YYYY-MM-DD or ISO).
 */
export function toUtcDateOnly(input) {
  if (input instanceof Date) {
    return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
  }
  // String — accept YYYY-MM-DD or full ISO.
  const s = String(input);
  const ymd = /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : s.slice(0, 10);
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * Return ISO YYYY-MM-DD for a Date.
 */
export function toIsoDate(d) {
  return d.toISOString().slice(0, 10);
}

/**
 * Iterate UTC dates from start to end (inclusive) in chunks of N days.
 * Yields [windowStart, windowEnd] pairs as Date objects.
 */
export function* dateWindows(start, end, batchDays = 30) {
  const s = toUtcDateOnly(start);
  const e = toUtcDateOnly(end);
  let cur = s;
  while (cur <= e) {
    const next = new Date(cur);
    next.setUTCDate(next.getUTCDate() + batchDays - 1);
    const windowEnd = next > e ? e : next;
    yield [cur, windowEnd];
    const after = new Date(windowEnd);
    after.setUTCDate(after.getUTCDate() + 1);
    cur = after;
  }
}
