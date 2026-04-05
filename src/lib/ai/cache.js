import { createHash } from 'node:crypto';

/**
 * Hash an input object into a stable 16-char hex string.
 * Keys are sorted to ensure deterministic output.
 */
export function hashInput(input) {
  const sorted = JSON.stringify(input, Object.keys(input).sort());
  return createHash('sha256').update(sorted).digest('hex').slice(0, 16);
}

/**
 * Compute a composite cache key (SHA-256) from all relevant dimensions.
 */
export function computeCacheKey({ feature, clientId, dateRangeStart, dateRangeEnd, inputHash, promptVersion, model }) {
  const parts = [
    feature,
    clientId || 'global',
    dateRangeStart || 'none',
    dateRangeEnd || 'none',
    inputHash,
    promptVersion,
    model,
  ].join('|');
  return createHash('sha256').update(parts).digest('hex');
}

/**
 * Fetch a cached AI response if it exists and hasn't expired.
 * @returns {object|null} The AiGeneration row, or null if miss/expired.
 */
export async function getCachedResponse(prisma, cacheKey) {
  const row = await prisma.aiGeneration.findUnique({ where: { cacheKey } });
  if (!row) return null;

  // Check TTL
  if (row.expiresAt && row.expiresAt < new Date()) {
    // Expired — clean up asynchronously
    prisma.aiGeneration.delete({ where: { cacheKey } }).catch(() => {});
    return null;
  }

  return row;
}

/**
 * Store an AI response in the cache. Upserts to handle race conditions.
 */
export async function setCachedResponse(prisma, data) {
  const { cacheKey, feature, clientId, model, promptVersion, inputHash, dateRangeStart, dateRangeEnd, responseFormat, responseBody, promptTokens, completionTokens, totalTokens, latencyMs, expiresAt } = data;

  try {
    await prisma.aiGeneration.upsert({
      where: { cacheKey },
      create: {
        cacheKey,
        feature,
        clientId: clientId || null,
        model,
        promptVersion,
        inputHash,
        dateRangeStart: dateRangeStart ? new Date(dateRangeStart) : null,
        dateRangeEnd: dateRangeEnd ? new Date(dateRangeEnd) : null,
        responseFormat: responseFormat || 'markdown',
        responseBody,
        promptTokens: promptTokens || 0,
        completionTokens: completionTokens || 0,
        totalTokens: totalTokens || 0,
        latencyMs: latencyMs || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      update: {
        responseBody,
        promptTokens: promptTokens || 0,
        completionTokens: completionTokens || 0,
        totalTokens: totalTokens || 0,
        latencyMs: latencyMs || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        promptVersion,
      },
    });
  } catch (err) {
    console.error('[AI Cache] Failed to write cache:', err.message);
  }
}

/**
 * Invalidate cached responses for a feature (optionally scoped to a client).
 */
export async function invalidateCache(prisma, { feature, clientId }) {
  const where = { feature };
  if (clientId) where.clientId = clientId;

  try {
    const { count } = await prisma.aiGeneration.deleteMany({ where });
    return count;
  } catch (err) {
    console.error('[AI Cache] Failed to invalidate:', err.message);
    return 0;
  }
}
