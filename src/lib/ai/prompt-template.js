import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = join(__dirname, '../../prompts');

// In-memory cache: { [name]: { content, mtime, systemMessage, userTemplate, version } }
const cache = new Map();

/**
 * Load a prompt template file by name (without .md extension).
 * Files are split on a `---` separator line:
 *   - Everything before = system message
 *   - Everything after  = user message template (with {{variable}} placeholders)
 *
 * Results are memory-cached and invalidated when the file's mtime changes.
 */
export function loadTemplate(name) {
  const filePath = join(PROMPTS_DIR, `${name}.md`);
  const stat = statSync(filePath);
  const mtime = stat.mtimeMs;

  const cached = cache.get(name);
  if (cached && cached.mtime === mtime) {
    return cached;
  }

  const raw = readFileSync(filePath, 'utf-8');
  const separatorIndex = raw.indexOf('\n---\n');

  let systemMessage, userTemplate;
  if (separatorIndex === -1) {
    systemMessage = '';
    userTemplate = raw.trim();
  } else {
    systemMessage = raw.slice(0, separatorIndex).trim();
    userTemplate = raw.slice(separatorIndex + 5).trim();
  }

  const version = createHash('sha256').update(raw).digest('hex').slice(0, 8);

  const entry = { systemMessage, userTemplate, version, mtime };
  cache.set(name, entry);
  return entry;
}

/**
 * Render a prompt template with variable interpolation.
 *
 * Supports:
 *   {{variableName}}         — replaced with value or empty string
 *   {{#if varName}}...{{/if}} — block included only when variable is truthy
 *
 * @param {string} name - template filename without extension
 * @param {object} variables - key-value map for interpolation
 * @returns {{ systemMessage: string, userMessage: string, version: string }}
 */
export function renderTemplate(name, variables = {}) {
  const { systemMessage, userTemplate, version } = loadTemplate(name);

  function interpolate(text) {
    // Process conditional blocks first
    let result = text.replace(
      /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
      (_, varName, content) => (variables[varName] ? content : '')
    );

    // Then replace simple variables
    result = result.replace(
      /\{\{(\w+)\}\}/g,
      (_, varName) => (variables[varName] != null ? String(variables[varName]) : '')
    );

    return result.trim();
  }

  return {
    systemMessage: interpolate(systemMessage),
    userMessage: interpolate(userTemplate),
    version,
  };
}
