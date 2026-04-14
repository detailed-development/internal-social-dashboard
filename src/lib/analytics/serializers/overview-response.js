// src/lib/analytics/serializers/overview-response.js
//
// Wraps the Layer B overview payload for HTTP responses. Keeps the internal
// `promptContext` field out of the public API by default, since it is
// intended for Layer C consumption only. Includes a stable `apiVersion` so
// clients can detect breaking changes.

const API_VERSION = 'overview/v1';

/**
 * @param {ClientOverview} overview
 * @param {{ includePromptContext?: boolean }} [opts]
 */
export function serializeOverviewResponse(overview, opts = {}) {
  if (!overview) return null;
  const { client, range, freshness, summary, priorSummary, chartData, ruleInsights, promptContext } = overview;
  return {
    apiVersion: API_VERSION,
    client,
    range,
    freshness,
    summary,
    priorSummary,
    chartData,
    ruleInsights,
    ...(opts.includePromptContext ? { promptContext } : {}),
  };
}
