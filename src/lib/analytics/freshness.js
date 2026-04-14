// src/lib/analytics/freshness.js
//
// Freshness indicators for a client. The dashboard badges should reflect when
// the underlying data last changed, while sync-health rules still need the
// last successful sync/check timestamps.

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ clientId: string }} params
 * @returns {Promise<{
 *   socialLastChangedAt: string | null,
 *   socialMetricsLastRefreshedAt: string | null,
 *   socialLastSyncedAt: string | null,
 *   messagesLastChangedAt: string | null,
 *   messagesLastSyncedAt: string | null,
 *   webAnalyticsLastChangedAt: string | null,
 *   webAnalyticsLastSyncedAt: string | null,
 *   transcriptionCoveragePct: number | null,
 * }>}
 */
export async function buildFreshness(prisma, { clientId }) {
  const [socialSyncMax, socialPostMax, socialCommentMax, socialMetricMax, messageSyncMax, messageChangeMax, webMax, postCount, transcriptionCount] = await Promise.all([
    prisma.socialAccount.aggregate({
      where: { clientId },
      _max: { lastSyncedAt: true },
    }),
    prisma.post.aggregate({
      where: { socialAccount: { clientId } },
      _max: { publishedAt: true },
    }),
    prisma.comment.aggregate({
      where: { post: { socialAccount: { clientId } } },
      _max: { postedAt: true },
    }),
    prisma.postMetric.aggregate({
      where: { post: { socialAccount: { clientId } } },
      _max: { recordedAt: true },
    }),
    prisma.conversation.aggregate({
      where: { socialAccount: { clientId } },
      _max: { lastSyncedAt: true },
    }),
    prisma.conversation.aggregate({
      where: { socialAccount: { clientId } },
      _max: { lastMessageAt: true },
    }),
    prisma.webAnalytic.aggregate({
      where: { clientId },
      _max: { date: true },
    }),
    prisma.post.count({
      where: {
        socialAccount: { clientId },
        mediaType: { in: ['REEL', 'VIDEO', 'SHORT'] },
      },
    }),
    prisma.post.count({
      where: {
        socialAccount: { clientId },
        mediaType: { in: ['REEL', 'VIDEO', 'SHORT'] },
        transcription: { isNot: null },
      },
    }),
  ]);

  const transcriptionCoveragePct =
    postCount > 0 ? Math.round((transcriptionCount / postCount) * 1000) / 10 : null;

  const toIsoOrNull = (date) => (date ? date.toISOString() : null);
  const maxDate = (...dates) => {
    const valid = dates.filter(Boolean);
    if (valid.length === 0) return null;
    return new Date(Math.max(...valid.map((date) => date.getTime())));
  };

  const socialLastChangedAt = maxDate(
    socialPostMax._max.publishedAt,
    socialCommentMax._max.postedAt,
  );
  const messagesLastChangedAt = messageChangeMax._max.lastMessageAt;
  const webAnalyticsLastChangedAt = webMax._max.date;

  return {
    socialLastChangedAt: toIsoOrNull(socialLastChangedAt),
    socialMetricsLastRefreshedAt: toIsoOrNull(socialMetricMax._max.recordedAt),
    socialLastSyncedAt: toIsoOrNull(socialSyncMax._max.lastSyncedAt),
    messagesLastChangedAt: toIsoOrNull(messagesLastChangedAt),
    messagesLastSyncedAt: toIsoOrNull(messageSyncMax._max.lastSyncedAt),
    webAnalyticsLastChangedAt: toIsoOrNull(webAnalyticsLastChangedAt),
    webAnalyticsLastSyncedAt: toIsoOrNull(webAnalyticsLastChangedAt),
    transcriptionCoveragePct,
  };
}
