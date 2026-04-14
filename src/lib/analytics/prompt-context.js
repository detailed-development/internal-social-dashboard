// src/lib/analytics/prompt-context.js
//
// Formats the deterministic overview payload into the three text blobs
// consumed by Layer C AI prompts: socialData, webData, buzzwords. Consumers
// (generateWeeklyInsights, generateReportDraft) treat these as opaque strings
// and do no further aggregation. Keeping formatting here means Layer C can
// evolve prompts without reaching into analytics internals.

/**
 * @param {{ client, chartData, summary, buzzwords, windowStart, windowEnd }} params
 * @returns {{ socialData: string, webData: string, buzzwords: string }}
 */
export function formatPromptContext({ client, chartData, summary, buzzwords, windowStart, windowEnd }) {
  const socialLines = [];
  for (const p of chartData.platformTotals || []) {
    socialLines.push(
      `${p.platform} @${p.handle} (${p.followers ?? '?'} followers):`,
      `  Posts: ${p.posts} | Likes: ${p.likes} | Comments: ${p.comments} | Shares: ${p.shares} | Saves: ${p.saves}`,
      `  Reach: ${p.reach} | Impressions: ${p.impressions}`,
    );
  }

  const topByPlatform = new Map();
  for (const post of chartData.topPosts || []) {
    const bucket = topByPlatform.get(post.platform) || [];
    if (bucket.length < 3) bucket.push(post);
    topByPlatform.set(post.platform, bucket);
  }
  for (const [platform, posts] of topByPlatform) {
    socialLines.push(`  Top ${platform} posts:`);
    for (const p of posts) {
      const cap = (p.caption || '').slice(0, 80);
      socialLines.push(`    - "${cap}..." (${p.mediaType}, ${p.likes} likes, ${p.comments} comments, ${p.reach} reach)`);
    }
  }

  const webLines = [];
  if (client.gaPropertyId) {
    if (summary.totalSessions > 0) {
      webLines.push(
        `Sessions: ${summary.totalSessions} | Users: ${summary.totalUsers} | Pageviews: ${summary.totalPageviews}`,
        `Avg Bounce Rate: ${summary.avgBounceRate ?? '?'}% | Avg Session Duration: ${summary.avgSessionDuration ?? '?'}s`,
        `Data points: ${(chartData.dailyTraffic || []).length} days`,
      );

      webLines.push(`Daily breakdown (last ${Math.min((chartData.dailyTraffic || []).length, 14)} days):`);
      for (const r of (chartData.dailyTraffic || []).slice(-14)) {
        webLines.push(`  ${r.date}: ${r.sessions} sessions, ${r.users} users, ${r.pageviews} pageviews`);
      }
    }

    if ((chartData.trafficSources || []).length > 0) {
      webLines.push('Top traffic sources:');
      for (const s of chartData.trafficSources) {
        webLines.push(`  ${s.source}/${s.medium}: ${s.sessions} sessions, ${s.users} users`);
      }
    }

    if ((chartData.deviceBreakdown || []).length > 0) {
      const totalDevice = chartData.deviceBreakdown.reduce((s, d) => s + d.sessions, 0);
      webLines.push('Device breakdown:');
      for (const d of chartData.deviceBreakdown) {
        const pct = totalDevice > 0 ? ((d.sessions / totalDevice) * 100).toFixed(1) : '0';
        webLines.push(`  ${d.device}: ${d.sessions} sessions (${pct}%), ${d.users} users`);
      }
    }

    if ((chartData.topPages || []).length > 0) {
      webLines.push('Top landing pages:');
      for (const p of chartData.topPages) {
        webLines.push(`  ${p.path}: ${p.sessions} sessions, ${p.pageviews} pageviews`);
      }
    }

    if (summary.avgBounceRate != null) {
      const engagementRate = ((1 - summary.avgBounceRate / 100) * 100).toFixed(1);
      webLines.push(`Engagement Rate: ${engagementRate}% (1 - bounce rate)`);
    }
  }

  const buzzString = Array.isArray(buzzwords)
    ? buzzwords.map((b) => `${b.word} (${b.frequency})`).join(', ')
    : String(buzzwords || '');

  return {
    socialData: socialLines.join('\n'),
    webData: webLines.join('\n'),
    buzzwords: buzzString,
  };
}
