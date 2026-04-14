// src/lib/reporting/buzzword-rollup.js
//
// Rebuild client_buzzword_daily for a (client, date-range) window.
//
// Buzzwords are extracted from Comment.body and Transcription.transcriptText.
// Their date is the UTC calendar date of the underlying Post.publishedAt.
// This is a deliberate improvement over the current
// gatherClientAnalytics() buzzword path, which is client-scoped but not
// date-scoped — callers that want range-scoped top words now just SUM over
// frequency for rows in the range.

import { toUtcDateOnly } from './date-utils.js';

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ clientId: string, dateStart: Date, dateEnd: Date }} params
 * @returns {Promise<{ rowsWritten: number }>}
 */
export async function rebuildBuzzwordRollups(prisma, { clientId, dateStart, dateEnd }) {
  const windowStart = toUtcDateOnly(dateStart);
  const windowEnd   = toUtcDateOnly(dateEnd);

  // One raw query handles both comment-sourced and transcription-sourced
  // buzzwords, mapping each back to its originating post's UTC date. The
  // GROUP BY on (date::date, word) gives us one row per (date, word).
  const rows = await prisma.$queryRaw`
    SELECT
      date_trunc('day', p.published_at AT TIME ZONE 'UTC')::date AS date,
      b.word                                                     AS word,
      SUM(b.frequency)::int                                      AS frequency
    FROM buzzwords b
    LEFT JOIN comments c       ON b.comment_id       = c.id
    LEFT JOIN transcriptions t ON b.transcription_id = t.id
    LEFT JOIN posts p          ON (c.post_id = p.id OR t.post_id = p.id)
    LEFT JOIN social_accounts sa ON p.social_account_id = sa.id
    WHERE sa.client_id = ${clientId}
      AND p.published_at >= ${windowStart}
      AND p.published_at <= ${endOfDay(windowEnd)}
    GROUP BY 1, 2
    ORDER BY 1 ASC, 3 DESC
  `;

  const data = rows.map((r) => ({
    clientId,
    date: toUtcDateOnly(r.date),
    word: r.word,
    frequency: Number(r.frequency),
  }));

  await prisma.$transaction([
    prisma.clientBuzzwordDaily.deleteMany({
      where: { clientId, date: { gte: windowStart, lte: windowEnd } },
    }),
    ...(data.length > 0
      ? [prisma.clientBuzzwordDaily.createMany({ data, skipDuplicates: true })]
      : []),
  ]);

  return { rowsWritten: data.length };
}

function endOfDay(d) {
  const e = new Date(d);
  e.setUTCHours(23, 59, 59, 999);
  return e;
}
