import crypto from 'crypto';

const ALGO = 'aes-256-gcm';

function getKey() {
  const k = process.env.ENCRYPTION_KEY;
  if (!k) return null;
  if (k.length !== 64) throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes). Generate one with: openssl rand -hex 32');
  return Buffer.from(k, 'hex');
}

/**
 * Encrypt a string value using AES-256-GCM.
 *
 * Returns 'enc:<iv_hex>:<tag_hex>:<ciphertext_hex>'
 * Returns the original value unchanged if ENCRYPTION_KEY is not set or the
 * value is falsy (so null/undefined tokens pass through safely).
 */
export function encrypt(plaintext) {
  const key = getKey();
  if (!plaintext || !key) return plaintext;

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `enc:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypt a value produced by encrypt().
 *
 * Returns the original value unchanged when:
 *   - ENCRYPTION_KEY is not set
 *   - The value does not start with 'enc:' (plaintext token already in DB)
 *
 * This backward-compatible behaviour means existing unencrypted tokens keep
 * working while new/refreshed tokens are stored encrypted going forward.
 */
export function decrypt(value) {
  const key = getKey();
  if (!value || !key) return value;
  if (!value.startsWith('enc:')) return value; // legacy plaintext

  const [, ivHex, tagHex, cipherHex] = value.split(':');
  const iv         = Buffer.from(ivHex,    'hex');
  const tag        = Buffer.from(tagHex,   'hex');
  const ciphertext = Buffer.from(cipherHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext).toString('utf8') + decipher.final('utf8');
}
