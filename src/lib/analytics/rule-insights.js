// src/lib/analytics/rule-insights.js
//
// Deterministic, non-AI insights. Each rule is a small pure function that
// returns 0 or 1 object in one of four buckets. Rules must be cheap and
// idempotent — they run on every request. Keep message text terse and
// product-usable.
//
// Severity levels: 'low' | 'medium' | 'high'.

import { pctChange } from './comparison.js';

/**
 * @param {object} params
 * @param {object} params.summary        - summary block of the current window
 * @param {object} [params.priorSummary] - summary block of the prior window
 * @param {object} params.chartData      - chartData block (topPosts etc.)
 * @param {object} params.freshness      - freshness block
 * @returns {{ wins: any[], risks: any[], anomalies: any[], recommendations: any[] }}
 */
export function buildRuleInsights({ summary, priorSummary, chartData, freshness }) {
  const wins = [];
  const risks = [];
  const anomalies = [];
  const recommendations = [];

  // ── 1. No activity in the selected window ─────────────────────────────
  if (summary.totalPosts === 0) {
    risks.push({
      code: 'NO_POSTS_IN_RANGE',
      severity: 'high',
      message: 'No posts published in the selected period.',
    });
    recommendations.push({
      code: 'PUBLISH_SCHEDULE',
      severity: 'medium',
      message: 'Consider a posting cadence of at least 2–3 posts per week to maintain reach.',
    });
  }

  // ── 2. Engagement movement vs prior period ────────────────────────────
  if (priorSummary) {
    const delta = pctChange(summary.totalEngagement, priorSummary.totalEngagement);
    if (delta != null) {
      if (delta >= 20) {
        wins.push({
          code: 'STRONG_ENGAGEMENT_WEEK',
          severity: 'low',
          message: `Engagement up ${delta}% vs prior period.`,
        });
      } else if (delta <= -20) {
        risks.push({
          code: 'ENGAGEMENT_DOWN_VS_PRIOR',
          severity: 'high',
          message: `Engagement down ${Math.abs(delta)}% vs prior period.`,
        });
      }
    }
  }

  // ── 3. Top-posts concentration ────────────────────────────────────────
  const top = chartData.topPosts || [];
  if (top.length >= 5) {
    const top3 = top.slice(0, 3).reduce((s, p) => s + p.engagement, 0);
    const allEng = top.reduce((s, p) => s + p.engagement, 0);
    if (allEng > 0 && top3 / allEng > 0.6) {
      anomalies.push({
        code: 'TOP_3_POSTS_DOMINATE',
        severity: 'medium',
        message: 'Top 3 posts account for over 60% of engagement in this window.',
      });
    }
  }

  // ── 4. Stale sync ─────────────────────────────────────────────────────
  if (freshness.socialLastSyncedAt) {
    const ageHours = (Date.now() - new Date(freshness.socialLastSyncedAt).getTime()) / 36e5;
    if (ageHours > 72) {
      risks.push({
        code: 'STALE_SYNC',
        severity: 'high',
        message: `Social data is ${Math.round(ageHours)} hours old — sync may be failing.`,
      });
    } else if (ageHours > 24) {
      risks.push({
        code: 'STALE_SYNC',
        severity: 'medium',
        message: `Social data is ${Math.round(ageHours)} hours old.`,
      });
    }
  } else if (summary.totalPosts > 0) {
    // Data exists but no lastSyncedAt set — unusual.
    anomalies.push({
      code: 'NO_SYNC_TIMESTAMP',
      severity: 'low',
      message: 'Posts exist but no social account reports a successful sync timestamp.',
    });
  }

  // ── 5. Traffic source concentration ───────────────────────────────────
  const sources = chartData.trafficSources || [];
  if (sources.length >= 3) {
    const total = sources.reduce((s, r) => s + r.sessions, 0);
    if (total > 0) {
      const topShare = sources[0].sessions / total;
      if (topShare > 0.75) {
        risks.push({
          code: 'TRAFFIC_CONCENTRATION',
          severity: 'medium',
          message: `${sources[0].source}/${sources[0].medium} drives ${Math.round(topShare * 100)}% of sessions — diversify channel mix.`,
        });
      }
    }
  }

  // ── 6. Bounce rate spike vs prior ─────────────────────────────────────
  if (priorSummary && summary.avgBounceRate != null && priorSummary.avgBounceRate != null) {
    const delta = summary.avgBounceRate - priorSummary.avgBounceRate;
    if (delta > 10) {
      risks.push({
        code: 'BOUNCE_RATE_WORSE',
        severity: 'medium',
        message: `Bounce rate rose by ${delta.toFixed(1)} points vs prior period.`,
      });
    } else if (delta < -10) {
      wins.push({
        code: 'BOUNCE_RATE_IMPROVED',
        severity: 'low',
        message: `Bounce rate improved by ${Math.abs(delta).toFixed(1)} points vs prior period.`,
      });
    }
  }

  return { wins, risks, anomalies, recommendations };
}
