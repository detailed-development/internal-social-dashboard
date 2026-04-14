// src/lib/reporting/social-rollup.js
//
// Rebuild social-side reporting aggregates for a (client, date-range) window.
// Writes to client_platform_daily_metrics (one row per account/day) and
// client_post_performance (one row per post, denormalized).
//
// Delete-and-rebuild semantics: for the given window we delete existing rows
// and recompute from the raw Post + PostMetric tables. This is simpler and
// safer than partial merge logic for v1, per the plan.
//
// Metric semantics match the current gatherClientAnalytics():
//   - Use metrics[0] ordered by recordedAt DESC (latest snapshot per post).
//   - engagement = likes + commentsCount + shares + saves.
//   - date is the UTC calendar date of publishedAt.

import { toUtcDateOnly } from './date-utils.js';

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ clientId: string, dateStart: Date, dateEnd: Date }} params
 * @returns {Promise<{ dailyMetricsWritten: number, postsWritten: number }>}
 */
export async function rebuildSocialRollups(prisma, { clientId, dateStart, dateEnd }) {
  const windowStart = toUtcDateOnly(dateStart);
  const windowEnd   = toUtcDateOnly(dateEnd);

  // Pull every post for this client whose publishedAt falls in the window,
  // along with its latest metric snapshot. Scoped by client via the
  // socialAccount.clientId relation.
  const posts = await prisma.post.findMany({
    where: {
      socialAccount: { clientId },
      publishedAt: { gte: windowStart, lte: endOfDay(windowEnd) },
    },
    orderBy: { publishedAt: 'asc' },
    include: {
      metrics: { orderBy: { recordedAt: 'desc' }, take: 1 },
      socialAccount: { select: { id: true, platform: true, handle: true, followerCount: true, clientId: true } },
    },
  });

  // ─── Build per-post performance rows ────────────────────────────────────
  const postRows = posts.map((p) => {
    const m = p.metrics[0] || {};
    const likes         = m.likes         || 0;
    const commentsCount = m.commentsCount || 0;
    const shares        = m.shares        || 0;
    const saves         = m.saves         || 0;
    const reach         = m.reach         || 0;
    const impressions   = m.impressions   || 0;
    const engagement    = likes + commentsCount + shares + saves;
    return {
      clientId,
      socialAccountId: p.socialAccountId,
      postId: p.id,
      date: toUtcDateOnly(p.publishedAt),
      platform: p.socialAccount.platform,
      mediaType: p.mediaType,
      captionPreview: sanitizeCaption(p.caption),
      likes,
      commentsCount,
      shares,
      saves,
      reach,
      impressions,
      engagement,
    };
  });

  // ─── Build per-(account, date) daily metric rows ────────────────────────
  // Key = `${socialAccountId}|${yyyy-mm-dd}`.
  const dailyMap = new Map();
  for (const pr of postRows) {
    const key = `${pr.socialAccountId}|${pr.date.toISOString()}`;
    let agg = dailyMap.get(key);
    if (!agg) {
      const account = posts.find((p) => p.socialAccountId === pr.socialAccountId).socialAccount;
      agg = {
        clientId,
        socialAccountId: pr.socialAccountId,
        date: pr.date,
        platform: pr.platform,
        handle: account.handle,
        followerCount: account.followerCount ?? 0,
        postsCount: 0,
        likes: 0,
        commentsCount: 0,
        shares: 0,
        saves: 0,
        reach: 0,
        impressions: 0,
      };
      dailyMap.set(key, agg);
    }
    agg.postsCount    += 1;
    agg.likes         += pr.likes;
    agg.commentsCount += pr.commentsCount;
    agg.shares        += pr.shares;
    agg.saves         += pr.saves;
    agg.reach         += pr.reach;
    agg.impressions   += pr.impressions;
  }
  const dailyRows = [...dailyMap.values()];

  // ─── Delete-and-rebuild in a transaction ────────────────────────────────
  // One transaction per table keeps lock scope narrow (avoids holding locks
  // across all three tables during the full rebuild).
  await prisma.$transaction([
    prisma.clientPlatformDailyMetric.deleteMany({
      where: { clientId, date: { gte: windowStart, lte: windowEnd } },
    }),
    ...(dailyRows.length > 0
      ? [prisma.clientPlatformDailyMetric.createMany({ data: dailyRows, skipDuplicates: true })]
      : []),
  ]);

  // ClientPostPerformance: delete-and-recreate per post. We use individual
  // creates inside a transaction instead of createMany because Prisma's
  // batch SQL construction can mishandle emoji-heavy captions as incomplete
  // hex escapes in Postgres.
  if (postRows.length > 0) {
    const postIds = postRows.map((r) => r.postId);
    await prisma.clientPostPerformance.deleteMany({
      where: { postId: { in: postIds } },
    });
    await prisma.$transaction(
      postRows.map((row) => prisma.clientPostPerformance.create({ data: row }))
    );
  }

  return { dailyMetricsWritten: dailyRows.length, postsWritten: postRows.length };
}

function sanitizeCaption(raw) {
  if (!raw) return null;
  // Strip null bytes, then truncate by code points (not code units) so we
  // never split a surrogate pair. VarChar(160) in Postgres counts characters
  // (code points), not bytes, so this is also the semantically correct limit.
  const clean = raw.replace(/\x00/g, '');
  const codePoints = Array.from(clean);
  return (codePoints.length > 160 ? codePoints.slice(0, 160).join('') : clean) || null;
}

function endOfDay(d) {
  const e = new Date(d);
  e.setUTCHours(23, 59, 59, 999);
  return e;
}
