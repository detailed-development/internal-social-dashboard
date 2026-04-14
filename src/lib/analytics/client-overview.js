// src/lib/analytics/client-overview.js
//
// Primary Layer B export. Produces the canonical deterministic payload for a
// client and date range. Consumes precomputed read-model rows when
// USE_REPORTING_READ_MODEL=true; otherwise falls back to raw-table
// aggregation (identical to the current gatherClientAnalytics semantics).
//
// The returned payload is the single source of truth for both:
//   - the non-AI overview HTTP endpoint (frontend default)
//   - Layer C AI generators (weekly-insights, report-draft)

import { toUtcDateOnly } from '../reporting/date-utils.js';
import { computePriorWindow } from './comparison.js';
import {
  buildSocialOverviewFromReadModel,
  buildSocialOverviewFromRaw,
} from './social-overview.js';
import {
  buildWebOverviewFromReadModel,
  buildWebOverviewFromRaw,
} from './web-overview.js';
import {
  buildBuzzwordsFromReadModel,
  buildBuzzwordsFromRaw,
} from './buzzword-overview.js';
import { buildFreshness } from './freshness.js';
import { buildRuleInsights } from './rule-insights.js';
import { formatPromptContext } from './prompt-context.js';

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {object} params
 * @param {string} params.clientSlug
 * @param {Date|string} params.start - inclusive; defaults to 30 days ago
 * @param {Date|string} params.end   - inclusive; defaults to today
 * @param {object} [params.opts]
 * @param {boolean} [params.opts.useReadModel] - override env flag for tests
 * @param {boolean} [params.opts.includePriorPeriod] - default true; disable for cheaper calls
 * @returns {Promise<ClientOverview | null>}
 */
export async function buildClientOverview(prisma, { clientSlug, start, end, opts = {} } = {}) {
  const client = await prisma.client.findUnique({
    where: { slug: clientSlug },
    select: { id: true, slug: true, name: true, websiteUrl: true, gaPropertyId: true },
  });
  if (!client) return null;

  const today = toUtcDateOnly(new Date());
  const defaultStart = new Date(today);
  defaultStart.setUTCDate(defaultStart.getUTCDate() - 29);
  const windowStart = toUtcDateOnly(start || defaultStart);
  const windowEnd   = toUtcDateOnly(end   || today);

  const useReadModel =
    opts.useReadModel === undefined
      ? process.env.USE_REPORTING_READ_MODEL === 'true'
      : Boolean(opts.useReadModel);

  // Select code path once, pass client identity through.
  const socialFn    = useReadModel ? buildSocialOverviewFromReadModel    : buildSocialOverviewFromRaw;
  const webFn       = useReadModel ? buildWebOverviewFromReadModel       : buildWebOverviewFromRaw;

  const [social, web, buzzwords, freshness] = await Promise.all([
    socialFn(prisma, { clientId: client.id, windowStart, windowEnd }),
    webFn(prisma,    { clientId: client.id, windowStart, windowEnd }),
    useReadModel
      ? buildBuzzwordsFromReadModel(prisma, { clientId: client.id, windowStart, windowEnd })
      : buildBuzzwordsFromRaw(prisma,      { clientSlug, windowStart, windowEnd }),
    buildFreshness(prisma, { clientId: client.id }),
  ]);

  const chartData = {
    dailyEngagement:  social.dailyEngagement,
    platformTotals:   social.platformTotals,
    topPosts:         social.topPosts,
    postTypeBreakdown: social.postTypeBreakdown,
    dailyTraffic:     web.dailyTraffic,
    trafficSources:   web.trafficSources,
    deviceBreakdown:  web.deviceBreakdown,
    topPages:         web.topPages,
  };

  const summary = buildSummaryTotals({ social, web });

  // Prior-period summary for rule insights (small extra cost; opt out via opts).
  let priorSummary = null;
  if (opts.includePriorPeriod !== false) {
    const { priorStart, priorEnd } = computePriorWindow(windowStart, windowEnd);
    try {
      const [pSocial, pWeb] = await Promise.all([
        socialFn(prisma, { clientId: client.id, windowStart: priorStart, windowEnd: priorEnd }),
        webFn(prisma,    { clientId: client.id, windowStart: priorStart, windowEnd: priorEnd }),
      ]);
      priorSummary = buildSummaryTotals({ social: pSocial, web: pWeb });
    } catch {
      // prior window aggregation failure must not fail the primary request
      priorSummary = null;
    }
  }

  const ruleInsights = buildRuleInsights({
    summary,
    priorSummary,
    chartData,
    freshness,
  });

  const promptContext = formatPromptContext({ client, chartData, summary, buzzwords, windowStart, windowEnd });

  return {
    client: {
      id: client.id,
      slug: client.slug,
      name: client.name,
      websiteUrl: client.websiteUrl,
    },
    range: {
      start: windowStart.toISOString().slice(0, 10),
      end:   windowEnd.toISOString().slice(0, 10),
    },
    freshness,
    summary,
    priorSummary,
    chartData,
    ruleInsights,
    promptContext,
  };
}

function buildSummaryTotals({ social, web }) {
  const totals = (social.platformTotals || []).reduce(
    (acc, p) => {
      acc.totalPosts       += p.posts;
      acc.totalReach       += p.reach;
      acc.totalImpressions += p.impressions;
      acc.totalEngagement  += p.likes + p.comments + p.shares + p.saves;
      return acc;
    },
    { totalPosts: 0, totalReach: 0, totalImpressions: 0, totalEngagement: 0 }
  );

  const daily = web.dailyTraffic || [];
  const webTotals = daily.reduce(
    (acc, d) => {
      acc.totalSessions  += d.sessions;
      acc.totalUsers     += d.users;
      acc.totalPageviews += d.pageviews;
      acc.bounceSum      += d.bounceRate          != null ? d.bounceRate         : 0;
      acc.bounceCount    += d.bounceRate          != null ? 1 : 0;
      acc.durSum         += d.avgSessionDuration  != null ? d.avgSessionDuration : 0;
      acc.durCount       += d.avgSessionDuration  != null ? 1 : 0;
      return acc;
    },
    { totalSessions: 0, totalUsers: 0, totalPageviews: 0, bounceSum: 0, bounceCount: 0, durSum: 0, durCount: 0 }
  );

  return {
    ...totals,
    totalSessions: webTotals.totalSessions,
    totalUsers: webTotals.totalUsers,
    totalPageviews: webTotals.totalPageviews,
    avgBounceRate: webTotals.bounceCount
      ? Math.round((webTotals.bounceSum / webTotals.bounceCount) * 100) / 100
      : null,
    avgSessionDuration: webTotals.durCount
      ? Math.round((webTotals.durSum / webTotals.durCount) * 100) / 100
      : null,
  };
}
