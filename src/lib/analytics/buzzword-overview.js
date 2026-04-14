// src/lib/analytics/buzzword-overview.js
//
// Builds the top-buzzwords list for a window. Returns the same array shape
// from both paths so consumers don't branch.

/** Read-model path: SUM(frequency) over (date, word) rows. */
export async function buildBuzzwordsFromReadModel(prisma, { clientId, windowStart, windowEnd }) {
  const rows = await prisma.clientBuzzwordDaily.groupBy({
    by: ['word'],
    where: { clientId, date: { gte: windowStart, lte: windowEnd } },
    _sum: { frequency: true },
    orderBy: { _sum: { frequency: 'desc' } },
    take: 15,
  });

  return rows.map((r) => ({ word: r.word, frequency: r._sum.frequency ?? 0 }));
}

/**
 * Raw-table fallback — mirrors the current gatherClientAnalytics SQL.
 * NB: the current path is client-scoped but not date-scoped. The raw path
 * here intentionally applies date scoping so we don't regress when moving
 * off the read-model later; the output shape stays identical.
 */
export async function buildBuzzwordsFromRaw(prisma, { clientSlug, windowStart, windowEnd }) {
  const rows = await prisma.$queryRaw`
    SELECT b.word, SUM(b.frequency)::int AS frequency
    FROM buzzwords b
    LEFT JOIN comments c       ON b.comment_id       = c.id
    LEFT JOIN transcriptions t ON b.transcription_id = t.id
    LEFT JOIN posts p          ON (c.post_id = p.id OR t.post_id = p.id)
    LEFT JOIN social_accounts sa ON p.social_account_id = sa.id
    LEFT JOIN clients cl       ON sa.client_id = cl.id
    WHERE cl.slug = ${clientSlug}
      AND p.published_at >= ${windowStart}
      AND p.published_at <= ${endOfDay(windowEnd)}
    GROUP BY b.word
    ORDER BY frequency DESC
    LIMIT 15
  `;
  return rows.map((r) => ({ word: r.word, frequency: Number(r.frequency) }));
}

function endOfDay(d) {
  const e = new Date(d);
  e.setUTCHours(23, 59, 59, 999);
  return e;
}
