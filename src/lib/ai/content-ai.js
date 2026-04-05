import { chatCompletion } from './ai-client.js';
import { renderTemplate } from './prompt-template.js';
import { computeCacheKey, hashInput, getCachedResponse, setCachedResponse } from './cache.js';

const MODEL = 'gpt-4o-mini';
const TTL_HOURS = 24;

function ttlDate() {
  return new Date(Date.now() + TTL_HOURS * 60 * 60 * 1000);
}

/**
 * Generate social media captions.
 */
export async function generateCaption(prisma, { platform, topic, tone = 'casual', length = 'medium', hashtags = false, clientSlug, forceRefresh = false }) {
  const { systemMessage, userMessage, version } = renderTemplate('caption-generator', {
    platform,
    topic,
    tone,
    length,
    hashtags: hashtags ? 'yes' : '',
    brandContext: '',
  });

  const inputHash = hashInput({ platform, topic, tone, length, hashtags });
  const cacheKey = computeCacheKey({
    feature: 'caption-generator',
    clientId: clientSlug || null,
    inputHash,
    promptVersion: version,
    model: MODEL,
  });

  if (!forceRefresh) {
    const cached = await getCachedResponse(prisma, cacheKey);
    if (cached) {
      return {
        captions: cached.responseBody,
        cached: true,
        usage: { promptTokens: cached.promptTokens, completionTokens: cached.completionTokens, totalTokens: cached.totalTokens },
        model: MODEL,
      };
    }
  }

  const result = await chatCompletion({
    model: MODEL,
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.8,
    maxTokens: 1024,
  });

  if (!result.content?.trim()) {
    throw Object.assign(new Error('AI returned empty response'), { code: 'AI_INVALID_RESPONSE' });
  }

  await setCachedResponse(prisma, {
    cacheKey,
    feature: 'caption-generator',
    clientId: clientSlug || null,
    model: MODEL,
    promptVersion: version,
    inputHash,
    responseFormat: 'markdown',
    responseBody: result.content,
    promptTokens: result.usage.promptTokens,
    completionTokens: result.usage.completionTokens,
    totalTokens: result.usage.totalTokens,
    latencyMs: result.latencyMs,
    expiresAt: ttlDate(),
  });

  return {
    captions: result.content,
    cached: false,
    usage: result.usage,
    model: MODEL,
  };
}

/**
 * Extract hashtags, keywords, and categories from text.
 * Returns structured JSON.
 */
export async function extractHashtags(prisma, { text, platform = 'general', maxTags = 20, forceRefresh = false }) {
  const { systemMessage, userMessage, version } = renderTemplate('hashtag-extractor', {
    text,
    platform,
    maxTags: String(maxTags),
  });

  const inputHash = hashInput({ text, platform, maxTags });
  const cacheKey = computeCacheKey({
    feature: 'hashtag-extractor',
    inputHash,
    promptVersion: version,
    model: MODEL,
  });

  if (!forceRefresh) {
    const cached = await getCachedResponse(prisma, cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached.responseBody);
        return {
          ...parsed,
          cached: true,
          usage: { promptTokens: cached.promptTokens, completionTokens: cached.completionTokens, totalTokens: cached.totalTokens },
          model: MODEL,
        };
      } catch (_) {
        // Cached response is invalid JSON — regenerate
      }
    }
  }

  const result = await chatCompletion({
    model: MODEL,
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage },
    ],
    responseFormat: 'json_object',
    temperature: 0.3,
    maxTokens: 512,
  });

  let parsed;
  try {
    parsed = JSON.parse(result.content);
  } catch (_) {
    throw Object.assign(new Error('AI returned invalid JSON'), { code: 'AI_INVALID_RESPONSE' });
  }

  // Normalize
  const output = {
    hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.slice(0, maxTags) : [],
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
    categories: Array.isArray(parsed.categories) ? parsed.categories : [],
  };

  await setCachedResponse(prisma, {
    cacheKey,
    feature: 'hashtag-extractor',
    model: MODEL,
    promptVersion: version,
    inputHash,
    responseFormat: 'json',
    responseBody: JSON.stringify(output),
    promptTokens: result.usage.promptTokens,
    completionTokens: result.usage.completionTokens,
    totalTokens: result.usage.totalTokens,
    latencyMs: result.latencyMs,
    expiresAt: ttlDate(),
  });

  return {
    ...output,
    cached: false,
    usage: result.usage,
    model: MODEL,
  };
}

/**
 * Rewrite content in a different tone.
 */
export async function rewriteContent(prisma, { text, targetTone, platform = 'general', maxLength, forceRefresh = false }) {
  const { systemMessage, userMessage, version } = renderTemplate('content-rewriter', {
    text,
    targetTone,
    platform,
    maxLength: maxLength ? String(maxLength) : '',
  });

  const inputHash = hashInput({ text, targetTone, platform, maxLength: maxLength || '' });
  const cacheKey = computeCacheKey({
    feature: 'content-rewriter',
    inputHash,
    promptVersion: version,
    model: MODEL,
  });

  if (!forceRefresh) {
    const cached = await getCachedResponse(prisma, cacheKey);
    if (cached) {
      return {
        result: cached.responseBody,
        cached: true,
        usage: { promptTokens: cached.promptTokens, completionTokens: cached.completionTokens, totalTokens: cached.totalTokens },
        model: MODEL,
      };
    }
  }

  const res = await chatCompletion({
    model: MODEL,
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.7,
    maxTokens: 1024,
  });

  if (!res.content?.trim()) {
    throw Object.assign(new Error('AI returned empty response'), { code: 'AI_INVALID_RESPONSE' });
  }

  await setCachedResponse(prisma, {
    cacheKey,
    feature: 'content-rewriter',
    model: MODEL,
    promptVersion: version,
    inputHash,
    responseFormat: 'markdown',
    responseBody: res.content,
    promptTokens: res.usage.promptTokens,
    completionTokens: res.usage.completionTokens,
    totalTokens: res.usage.totalTokens,
    latencyMs: res.latencyMs,
    expiresAt: ttlDate(),
  });

  return {
    result: res.content,
    cached: false,
    usage: res.usage,
    model: MODEL,
  };
}
