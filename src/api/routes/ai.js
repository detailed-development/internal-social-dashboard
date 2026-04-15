import { Router } from 'express';
import { isAIAvailable } from '../../lib/ai/ai-client.js';
import { generateWeeklyInsights, generateReportDraft } from '../../lib/ai/analytics-ai.js';
import { generateCaption, extractHashtags, rewriteContent } from '../../lib/ai/content-ai.js';
import { loadTemplate } from '../../lib/ai/prompt-template.js';
import { hashInput, computeCacheKey, getCachedResponse } from '../../lib/ai/cache.js';

const router = Router();


const MODEL = 'gpt-4o-mini';

const COST_ESTIMATES = {
  'report-draft':      { inputTokens: 2500, maxOutputTokens: 3072 },
  'weekly-insights':   { inputTokens: 1200, maxOutputTokens: 512 },
  'caption-generator': { inputTokens: 400,  maxOutputTokens: 1024 },
  'hashtag-extractor': { inputTokens: 300,  maxOutputTokens: 512 },
  'content-rewriter':  { inputTokens: 500,  maxOutputTokens: 1024 },
};

const CONTENT_FEATURES = new Set(['caption-generator', 'hashtag-extractor', 'content-rewriter']);

const INPUT_COST_PER_M = 0.15;
const OUTPUT_COST_PER_M = 0.60;

function estimateCostUsd({ inputTokens, maxOutputTokens }) {
  return parseFloat(
    (
      (inputTokens / 1_000_000) * INPUT_COST_PER_M +
      (maxOutputTokens / 1_000_000) * OUTPUT_COST_PER_M
    ).toFixed(6)
  );
}


// Gate all AI endpoints on API key availability
router.use((req, res, next) => {
  if (!isAIAvailable()) {
    return res.status(503).json({
      error: 'AI features are not configured. Set OPENAI_API_KEY in your environment.',
      code: 'AI_NOT_CONFIGURED',
    });
  }
  next();
});

// Map error codes to HTTP status codes
function errorStatus(err) {
  if (err.code === 'CLIENT_NOT_FOUND') return 404;
  if (err.code === 'AI_RATE_LIMITED') return 429;
  if (err.code === 'AI_INVALID_RESPONSE') return 502;
  if (err.code === 'AI_GENERATION_FAILED') return 502;
  if (err.code === 'AI_NOT_CONFIGURED') return 503;
  return 500;
}

function handleError(res, err) {
  console.error(`[AI] ${err.code || 'UNKNOWN'}:`, err.message);
  const status = errorStatus(err);
  res.status(status).json({ error: err.message, code: err.code || 'INTERNAL_ERROR' });
}


// ─── Generation Preflight Check ─────────────────────────────────────────────

router.post('/check', async (req, res) => {
  const { features, clientSlug, dateRangeStart, dateRangeEnd, inputParams } = req.body;

  if (!Array.isArray(features) || features.length === 0) {
    return res.status(400).json({ error: 'features (array) is required', code: 'VALIDATION_ERROR' });
  }

  // clientSlug is required for analytics features but optional for content features
  const hasAnalyticsFeature = features.some(f => !CONTENT_FEATURES.has(f));
  if (hasAnalyticsFeature && !clientSlug) {
    return res.status(400).json({ error: 'clientSlug is required for analytics features', code: 'VALIDATION_ERROR' });
  }

  try {
    const prisma = req.app.get('prisma');
    let client = null;

    if (clientSlug) {
      client = await prisma.client.findUnique({
        where: { slug: clientSlug },
        select: { id: true },
      });
      if (!client && hasAnalyticsFeature) {
        return res.status(404).json({ error: 'Client not found', code: 'CLIENT_NOT_FOUND' });
      }
    }

    const now = new Date();
    const results = {};

    for (const feature of features) {
      const estimate = COST_ESTIMATES[feature];
      if (!estimate) {
        results[feature] = { error: 'Unknown feature' };
        continue;
      }

      const { version } = loadTemplate(feature);
      let cacheKey;

      if (CONTENT_FEATURES.has(feature)) {
        // Content tools: cache key from inputParams, matching content-ai.js logic
        const params = inputParams?.[feature] || {};
        const contentInputHash = hashInput(params);
        cacheKey = computeCacheKey({
          feature,
          clientId: params.clientSlug || null,
          inputHash: contentInputHash,
          promptVersion: version,
          model: MODEL,
        });
      } else {
        // Analytics tools: cache key from clientSlug + date range
        const defaultDays = feature === 'report-draft' ? 30 : 7;
        const start = dateRangeStart || new Date(now.getTime() - defaultDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const end = dateRangeEnd || now.toISOString().split('T')[0];
        const analyticsInputHash = hashInput({ clientSlug, start, end });
        cacheKey = computeCacheKey({
          feature,
          clientId: client.id,
          dateRangeStart: start,
          dateRangeEnd: end,
          inputHash: analyticsInputHash,
          promptVersion: version,
          model: MODEL,
        });
      }

      const cached = await getCachedResponse(prisma, cacheKey);

      results[feature] = {
        cached: cached !== null,
        cachedAt: cached?.createdAt?.toISOString() ?? null,
        expiresAt: cached?.expiresAt?.toISOString() ?? null,
        totalTokensIfCached: cached?.totalTokens ?? null,
        estimatedInputTokens: estimate.inputTokens,
        estimatedOutputTokens: estimate.maxOutputTokens,
        estimatedCostUsd: estimateCostUsd(estimate),
      };
    }

    res.json(results);
  } catch (err) {
    handleError(res, err);
  }
});

// ─── Cached Intervals ────────────────────────────────────────────────────────

router.get('/cached-intervals', async (req, res) => {
  const { clientSlug, features } = req.query;
  const featureList = features
    ? features.split(',').filter(f => COST_ESTIMATES[f])
    : ['weekly-insights', 'report-draft'];

  const prisma = req.app.get('prisma');
  const now = new Date();

  try {
    let clientId = null;
    if (clientSlug) {
      const client = await prisma.client.findUnique({
        where: { slug: clientSlug },
        select: { id: true },
      });
      if (!client) return res.status(404).json({ error: 'Client not found', code: 'CLIENT_NOT_FOUND' });
      clientId = client.id;
    }

    const rows = await prisma.aiGeneration.findMany({
      where: {
        feature: { in: featureList },
        clientId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: {
        feature: true,
        dateRangeStart: true,
        dateRangeEnd: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(rows);
  } catch (err) {
    handleError(res, err);
  }
});

router.delete('/cached-intervals', async (req, res) => {
  const { clientSlug, dateRangeStart, dateRangeEnd, features } = req.body;
  const featureList = features
    ? (Array.isArray(features) ? features : features.split(',')).filter(f => COST_ESTIMATES[f])
    : ['weekly-insights', 'report-draft'];

  const prisma = req.app.get('prisma');

  try {
    let clientId = null;
    if (clientSlug) {
      const client = await prisma.client.findUnique({
        where: { slug: clientSlug },
        select: { id: true },
      });
      if (!client) return res.status(404).json({ error: 'Client not found', code: 'CLIENT_NOT_FOUND' });
      clientId = client.id;
    }

    const where = { feature: { in: featureList }, clientId };
    if (dateRangeStart) where.dateRangeStart = new Date(dateRangeStart);
    if (dateRangeEnd)   where.dateRangeEnd   = new Date(dateRangeEnd);

    const { count } = await prisma.aiGeneration.deleteMany({ where });
    res.json({ deleted: count });
  } catch (err) {
    handleError(res, err);
  }
});

// ─── Weekly Insights ─────────────────────────────────────────────────────────

router.post('/weekly-insights', async (req, res) => {
  const { clientSlug, dateRangeStart, dateRangeEnd, forceRefresh } = req.body;
  if (!clientSlug) return res.status(400).json({ error: 'clientSlug is required', code: 'VALIDATION_ERROR' });

  try {
    const prisma = req.app.get('prisma');
    const result = await generateWeeklyInsights(prisma, { clientSlug, dateRangeStart, dateRangeEnd, forceRefresh });
    if (result.code === 'CLIENT_NOT_FOUND') return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

// ─── Caption Generator ───────────────────────────────────────────────────────

router.post('/caption-generator', async (req, res) => {
  const { platform, topic, tone, length, hashtags, clientSlug, forceRefresh } = req.body;
  if (!platform) return res.status(400).json({ error: 'platform is required', code: 'VALIDATION_ERROR' });
  if (!topic) return res.status(400).json({ error: 'topic is required', code: 'VALIDATION_ERROR' });

  try {
    const prisma = req.app.get('prisma');
    const result = await generateCaption(prisma, { platform, topic, tone, length, hashtags, clientSlug, forceRefresh });
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

// ─── Hashtag Extractor ───────────────────────────────────────────────────────

router.post('/hashtag-extractor', async (req, res) => {
  const { text, platform, maxTags, forceRefresh } = req.body;
  if (!text || text.length < 10) {
    return res.status(400).json({ error: 'text is required (min 10 characters)', code: 'VALIDATION_ERROR' });
  }

  try {
    const prisma = req.app.get('prisma');
    const result = await extractHashtags(prisma, { text, platform, maxTags, forceRefresh });
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

// ─── Report Draft Generator ──────────────────────────────────────────────────

router.post('/report-draft', async (req, res) => {
  const { clientSlug, dateRangeStart, dateRangeEnd, forceRefresh, selectedModules } = req.body;
  if (!clientSlug) return res.status(400).json({ error: 'clientSlug is required', code: 'VALIDATION_ERROR' });

  try {
    const prisma = req.app.get('prisma');
    const result = await generateReportDraft(prisma, { clientSlug, dateRangeStart, dateRangeEnd, forceRefresh, selectedModules });
    if (result.code === 'CLIENT_NOT_FOUND') return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

// ─── Content Rewriter ────────────────────────────────────────────────────────

router.post('/content-rewriter', async (req, res) => {
  const { text, targetTone, platform, maxLength, forceRefresh } = req.body;
  if (!text || text.length < 10) {
    return res.status(400).json({ error: 'text is required (min 10 characters)', code: 'VALIDATION_ERROR' });
  }
  if (!targetTone) {
    return res.status(400).json({ error: 'targetTone is required', code: 'VALIDATION_ERROR' });
  }

  try {
    const prisma = req.app.get('prisma');
    const result = await rewriteContent(prisma, { text, targetTone, platform, maxLength, forceRefresh });
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

export default router;
