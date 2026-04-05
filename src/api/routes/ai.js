import { Router } from 'express';
import { isAIAvailable, AIError } from '../../lib/ai/ai-client.js';
import { generateWeeklyInsights, generateReportDraft } from '../../lib/ai/analytics-ai.js';
import { generateCaption, extractHashtags, rewriteContent } from '../../lib/ai/content-ai.js';

const router = Router();

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
  const { clientSlug, dateRangeStart, dateRangeEnd, forceRefresh } = req.body;
  if (!clientSlug) return res.status(400).json({ error: 'clientSlug is required', code: 'VALIDATION_ERROR' });

  try {
    const prisma = req.app.get('prisma');
    const result = await generateReportDraft(prisma, { clientSlug, dateRangeStart, dateRangeEnd, forceRefresh });
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
