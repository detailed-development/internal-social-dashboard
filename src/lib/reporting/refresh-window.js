// src/lib/reporting/refresh-window.js
//
// Orchestrator: rebuild all reporting read-model tables for a (client,
// date-range) window. Called at the end of each sync cycle (from
// runFullSync()) and by the backfill script. Idempotent; safe to rerun.
//
// Each rollup runs in its own transaction (see the individual files) so
// locks are narrow and a rollup failing in one dataset doesn't abort the
// others.

import { rebuildSocialRollups } from './social-rollup.js';
import { rebuildWebRollups } from './web-rollup.js';
import { rebuildBuzzwordRollups } from './buzzword-rollup.js';
import { toUtcDateOnly } from './date-utils.js';

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {object} params
 * @param {string} params.clientId
 * @param {Date|string} params.dateStart - inclusive
 * @param {Date|string} params.dateEnd   - inclusive
 * @param {{log?: Function, error?: Function}} [params.logger]
 * @returns {Promise<RefreshSummary>}
 */
export async function refreshClientReportingWindow(prisma, {
  clientId,
  dateStart,
  dateEnd,
  logger = console,
} = {}) {
  const windowStart = toUtcDateOnly(dateStart);
  const windowEnd   = toUtcDateOnly(dateEnd);
  const t0 = Date.now();

  const result = {
    clientId,
    dateStart: windowStart.toISOString().slice(0, 10),
    dateEnd:   windowEnd.toISOString().slice(0, 10),
    social: null,
    web: null,
    buzzwords: null,
    errors: [],
    durationMs: 0,
  };

  try {
    result.social = await rebuildSocialRollups(prisma, { clientId, dateStart: windowStart, dateEnd: windowEnd });
  } catch (err) {
    logger.error?.(`[reporting] social rollup failed for ${clientId}: ${err.message}`);
    result.errors.push({ scope: 'social', message: err.message });
  }

  try {
    result.web = await rebuildWebRollups(prisma, { clientId, dateStart: windowStart, dateEnd: windowEnd });
  } catch (err) {
    logger.error?.(`[reporting] web rollup failed for ${clientId}: ${err.message}`);
    result.errors.push({ scope: 'web', message: err.message });
  }

  try {
    result.buzzwords = await rebuildBuzzwordRollups(prisma, { clientId, dateStart: windowStart, dateEnd: windowEnd });
  } catch (err) {
    logger.error?.(`[reporting] buzzword rollup failed for ${clientId}: ${err.message}`);
    result.errors.push({ scope: 'buzzwords', message: err.message });
  }

  result.durationMs = Date.now() - t0;
  return result;
}
