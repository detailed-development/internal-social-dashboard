import OpenAI from 'openai';

export class AIError extends Error {
  constructor(message, { code, retryable = false, statusCode = 500 } = {}) {
    super(message);
    this.name = 'AIError';
    this.code = code;
    this.retryable = retryable;
    this.statusCode = statusCode;
  }
}

const RETRY_DELAYS = [1000, 2000, 4000];
const RETRYABLE_CODES = new Set([429, 500, 503]);

let _client = null;

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new AIError('OPENAI_API_KEY not configured', {
      code: 'AI_NOT_CONFIGURED',
      statusCode: 503,
    });
  }
  if (!_client) {
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Call OpenAI chat completion with retry logic, usage tracking, and prompt caching.
 *
 * OpenAI automatically caches prompt prefixes >= 1024 tokens for gpt-4o and
 * >= 2048 tokens for gpt-4o-mini.  Cached input tokens cost 50% less.
 * We enable `store: true` so the API persists prompts for reuse, and we
 * report `cachedTokens` so callers can monitor savings.
 *
 * @param {object} opts
 * @param {string} opts.model - 'gpt-4o' or 'gpt-4o-mini'
 * @param {Array} opts.messages - [{ role, content }]
 * @param {'json_object'|'text'} [opts.responseFormat='text']
 * @param {number} [opts.temperature=0.7]
 * @param {number} [opts.maxTokens=2048]
 * @returns {{ content: string, usage: { promptTokens: number, completionTokens: number, totalTokens: number, cachedTokens: number }, latencyMs: number }}
 */
export async function chatCompletion({
  model = 'gpt-4o-mini',
  messages,
  responseFormat = 'text',
  temperature = 0.7,
  maxTokens = 2048,
}) {
  const client = getClient();

  const params = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    store: true,  // Enable OpenAI prompt caching (50% cheaper on cached input tokens)
  };

  if (responseFormat === 'json_object') {
    params.response_format = { type: 'json_object' };
  }

  let lastError;
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      const start = Date.now();
      const response = await client.chat.completions.create(params);
      const latencyMs = Date.now() - start;

      const content = response.choices?.[0]?.message?.content ?? '';
      const usage = response.usage ?? {};
      const cached = usage.prompt_tokens_details?.cached_tokens ?? 0;

      if (cached > 0) {
        console.log(`[AI] Prompt cache hit: ${cached} of ${usage.prompt_tokens ?? 0} input tokens cached (50% savings on those)`);
      }

      return {
        content,
        usage: {
          promptTokens: usage.prompt_tokens ?? 0,
          completionTokens: usage.completion_tokens ?? 0,
          totalTokens: usage.total_tokens ?? 0,
          cachedTokens: cached,
        },
        latencyMs,
      };
    } catch (err) {
      lastError = err;
      const status = err.status ?? err.statusCode ?? 0;

      if (status === 429) {
        const retryAfter = parseInt(err.headers?.['retry-after'] || '0', 10);
        if (attempt < RETRY_DELAYS.length) {
          await sleep(retryAfter ? retryAfter * 1000 : RETRY_DELAYS[attempt]);
          continue;
        }
        throw new AIError('OpenAI rate limit exceeded', {
          code: 'AI_RATE_LIMITED',
          retryable: true,
          statusCode: 429,
        });
      }

      if (RETRYABLE_CODES.has(status) && attempt < RETRY_DELAYS.length) {
        await sleep(RETRY_DELAYS[attempt]);
        continue;
      }

      break;
    }
  }

  throw new AIError(lastError?.message ?? 'AI generation failed', {
    code: 'AI_GENERATION_FAILED',
    statusCode: 502,
  });
}

export function isAIAvailable() {
  return !!process.env.OPENAI_API_KEY;
}
