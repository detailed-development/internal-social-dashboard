// src/lib/analytics/comparison.js
//
// Helpers for "previous period" comparisons used by rule insights and KPI
// delta badges. A "previous period" is a same-length window ending the day
// before the current window starts.

import { toUtcDateOnly } from '../reporting/date-utils.js';

/**
 * Compute the previous-period window given a current window.
 *   current = [start, end]
 *   prior   = [start - N, end - N]  where N = days in current window
 */
export function computePriorWindow(start, end) {
  const s = toUtcDateOnly(start);
  const e = toUtcDateOnly(end);
  const days = Math.round((e.getTime() - s.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  const priorEnd = new Date(s);
  priorEnd.setUTCDate(priorEnd.getUTCDate() - 1);
  const priorStart = new Date(priorEnd);
  priorStart.setUTCDate(priorStart.getUTCDate() - (days - 1));
  return { priorStart, priorEnd, days };
}

/**
 * Signed percentage change vs a baseline, rounded to 1 decimal.
 * Returns null when baseline is 0 (undefined delta).
 */
export function pctChange(current, baseline) {
  if (baseline == null || baseline === 0) return null;
  return Math.round(((current - baseline) / baseline) * 1000) / 10;
}
