// Thin wrapper around Bunny Storage REST API for plugin ZIP uploads.
// Bunny Storage does not support S3-style signed PUT URLs, so the server
// receives the file via multer and streams it onward — the browser never
// sees the AccessKey.

const DEFAULT_PREFIX = 'downloadable/internal-social-dashboard/tools-plugins'

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

export function buildPluginStorageKey(pluginId, fileName) {
  const prefix = env('BUNNY_PLUGIN_PREFIX', DEFAULT_PREFIX).replace(/^\/+|\/+$/g, '')
  const safe = slugifyFilename(fileName)
  return `${prefix}/${pluginId}/${Date.now()}-${safe}`
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
