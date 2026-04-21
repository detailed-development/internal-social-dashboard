// Thin wrapper around Bunny Storage REST API for plugin ZIP uploads.
// Bunny Storage does not support S3-style signed PUT URLs, so the server
// receives the file via multer and streams it onward — the browser never
// sees the AccessKey.

import crypto from 'crypto'

const DEFAULT_PREFIX = 'internal-social-dashboard/tools-plugins'
const DEFAULT_TOKEN_TTL = 3600

function env(name, fallback = '') {
  const v = process.env[name]
  return v == null || v === '' ? fallback : v
}

export function isBunnyConfigured() {
  return Boolean(env('BUNNY_STORAGE_ZONE') && env('BUNNY_STORAGE_API_KEY') && env('BUNNY_CDN_BASE_URL'))
}

function storageHost() {
  const region = env('BUNNY_STORAGE_REGION').trim().toLowerCase()
  return region ? `${region}.storage.bunnycdn.com` : 'storage.bunnycdn.com'
}

function storageUrl(storageKey) {
  const zone = env('BUNNY_STORAGE_ZONE')
  return `https://${storageHost()}/${zone}/${storageKey}`
}

export function getPublicUrl(storageKey) {
  const base = env('BUNNY_CDN_BASE_URL').replace(/\/+$/, '')
  return `${base}/${storageKey}`
}

function slugifyFilename(name) {
  const base = (name || 'file.zip').replace(/\\/g, '/').split('/').pop()
  return base
    .normalize('NFKD')
    .replace(/[^\w.\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120) || 'file.zip'
}

function slugifyTitle(title) {
  return (title || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]+/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

// Folder layout: {prefix}/{titleSlug}-{idSuffix}/{timestamp}-{fileSlug}
// Title slug makes the Bunny file manager readable; short id suffix keeps
// folders unique when two plugins share a title. Falls back to the full id
// if the title is empty.
export function buildPluginStorageKey(pluginId, fileName, title) {
  const prefix = env('BUNNY_PLUGIN_PREFIX', DEFAULT_PREFIX).replace(/^\/+|\/+$/g, '')
  const safe = slugifyFilename(fileName)
  const titleSlug = slugifyTitle(title)
  const idSuffix = String(pluginId || '').slice(-6)
  const folder = titleSlug ? `${titleSlug}-${idSuffix}` : pluginId
  return `${prefix}/${folder}/${Date.now()}-${safe}`
}

export async function uploadObject(storageKey, body, { contentType = 'application/zip' } = {}) {
  const res = await fetch(storageUrl(storageKey), {
    method: 'PUT',
    headers: {
      AccessKey: env('BUNNY_STORAGE_API_KEY'),
      'Content-Type': contentType,
    },
    body,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Bunny upload failed (${res.status}): ${text || res.statusText}`)
  }
  return { ok: true }
}

export function isTokenAuthEnabled() {
  return Boolean(env('BUNNY_TOKEN_AUTH_KEY'))
}

// Signs a CDN URL per Bunny's "URL Token Authentication" scheme:
//   token = base64url(sha256(key + path + expires))
// and returns the URL with ?token=…&expires=… appended. If token auth is
// not configured, returns the URL unchanged so public zones keep working.
export function signCdnUrl(cdnUrl, ttlSeconds) {
  if (!cdnUrl || !isTokenAuthEnabled()) return cdnUrl
  const key = env('BUNNY_TOKEN_AUTH_KEY')
  const ttl = Number(ttlSeconds || env('BUNNY_TOKEN_TTL_SECONDS') || DEFAULT_TOKEN_TTL)
  const url = new URL(cdnUrl)
  const expires = Math.floor(Date.now() / 1000) + ttl
  const hash = crypto
    .createHash('sha256')
    .update(key + url.pathname + expires)
    .digest('base64')
  const token = hash.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  url.searchParams.set('token', token)
  url.searchParams.set('expires', String(expires))
  return url.toString()
}

export async function deleteObject(storageKey) {
  if (!storageKey) return { ok: false }
  const res = await fetch(storageUrl(storageKey), {
    method: 'DELETE',
    headers: { AccessKey: env('BUNNY_STORAGE_API_KEY') },
  })
  // 404 is fine — object already gone.
  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => '')
    throw new Error(`Bunny delete failed (${res.status}): ${text || res.statusText}`)
  }
  return { ok: true }
}
