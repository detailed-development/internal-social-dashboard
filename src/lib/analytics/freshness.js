// src/lib/analytics/freshness.js
//
// Freshness indicators for a client. All four signals are cheap to compute;
// they surface on the dashboard as "synced Xh ago" badges and feed the
// STALE_SYNC rule-insight.

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ clientId: string }} params
 * @returns {Promise<{
 *   socialLastSyncedAt: string | null,
 *   messagesLastSyncedAt: string | null,
 *   webAnalyticsLastSyncedAt: string | null,
 *   transcriptionCoveragePct: number | null,
 * }>}
 */
export async function buildFreshness(prisma, { clientId }) {
  const [socialMax, convMax, webMax, postCount, transcriptionCount] = await Promise.all([
    prisma.socialAccount.aggregate({
      where: { clientId },
      _max: { lastSyncedAt: true },
    }),
    prisma.conversation.aggregate({
      where: { socialAccount: { clientId } },
      _max: { lastSyncedAt: true },
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

  return {
    socialLastSyncedAt: socialMax._max.lastSyncedAt ? socialMax._max.lastSyncedAt.toISOString() : null,
    messagesLastSyncedAt: convMax._max.lastSyncedAt ? convMax._max.lastSyncedAt.toISOString() : null,
    webAnalyticsLastSyncedAt: webMax._max.date ? webMax._max.date.toISOString() : null,
    transcriptionCoveragePct,
  };
}
