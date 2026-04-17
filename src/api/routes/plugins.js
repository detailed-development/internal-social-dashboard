import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import multer from 'multer'
import { Router } from 'express'
import {
  isBunnyConfigured,
  buildPluginStorageKey,
  getPublicUrl,
  uploadObject,
  deleteObject,
  signCdnUrl,
} from '../../lib/storage/bunny.js'

const router = Router()

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'plugins')
const LOCAL_FILE_PREFIX = '/_plugin_uploads/'
const MAX_UPLOAD_BYTES = Number(process.env.PLUGIN_MAX_UPLOAD_BYTES) || 325 * 1024 * 1024

fs.mkdirSync(UPLOAD_DIR, { recursive: true })

function zipFileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase()
  if (ext !== '.zip') return cb(new Error('Only .zip files are allowed'))
  cb(null, true)
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, UPLOAD_DIR)
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || '.zip'
    cb(null, `${Date.now()}-${crypto.randomUUID()}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: zipFileFilter,
})

// In-memory multer for the Bunny upload path — the buffer is streamed to
// Bunny Storage and discarded; no file ever touches the server disk.
const bunnyUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: zipFileFilter,
})

function getManagedUploadPath(downloadUrl) {
  if (!downloadUrl || !downloadUrl.startsWith(LOCAL_FILE_PREFIX)) return null
  return path.join(UPLOAD_DIR, path.basename(downloadUrl))
}

function unlinkIfExists(filePath) {
  if (!filePath) return
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  } catch {
    // ignore cleanup errors
  }
}

// Sign Bunny-hosted download URLs at read time so stored rows stay clean and
// key rotation doesn't invalidate old data. Non-Bunny rows pass through.
function signIfBunny(row) {
  if (!row || row.storageProvider !== 'bunny' || !row.downloadUrl) return row
  return { ...row, downloadUrl: signCdnUrl(row.downloadUrl) }
}

function withSignedDownloadUrl(plugin) {
  if (!plugin) return plugin
  const signed = signIfBunny(plugin)
  if (!plugin.versions) return signed
  return { ...signed, versions: plugin.versions.map(signIfBunny) }
}

// GET /api/plugins  → list all plugins grouped by category on the client.
router.get('/', async (req, res) => {
  const prisma = req.app.get('prisma')
  try {
    const plugins = await prisma.plugin.findMany({
      orderBy: [{ category: 'asc' }, { title: 'asc' }],
      include: { versions: { orderBy: { createdAt: 'desc' } } },
    })
    res.json(plugins.map(withSignedDownloadUrl))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/plugins/:id/download → download stored local zip
router.get('/:id/download', async (req, res) => {
  const prisma = req.app.get('prisma')

  try {
    const plugin = await prisma.plugin.findUnique({
      where: { id: req.params.id },
    })

    if (!plugin) {
      return res.status(404).json({ error: 'Plugin not found' })
    }

    const filePath = getManagedUploadPath(plugin.downloadUrl)
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Uploaded file not found' })
    }

    return res.download(filePath, plugin.fileName || path.basename(filePath))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/plugins/bunny-status → whether Bunny storage is configured, so the
// UI can decide to show the "Upload to Bunny" option.
router.get('/bunny-status', (req, res) => {
  res.json({ configured: isBunnyConfigured(), maxBytes: MAX_UPLOAD_BYTES })
})

// POST /api/plugins/bunny → multipart upload that streams the ZIP to Bunny
// Storage and persists storage metadata on a new plugin row. The file never
// hits server disk; the buffer is released as soon as Bunny ACKs the PUT.
// Also creates the plugin's first PluginVersion history row.
router.post('/bunny', bunnyUpload.single('file'), async (req, res) => {
  const prisma = req.app.get('prisma')
  const { title, category, description, version } = req.body

  if (!isBunnyConfigured()) {
    return res.status(503).json({ error: 'Bunny storage is not configured on the server.' })
  }
  if (!title) {
    return res.status(400).json({ error: 'title is required' })
  }
  if (!req.file) {
    return res.status(400).json({ error: 'file is required' })
  }

  let plugin
  try {
    // Reserve the row first so we can use its id in the storage key.
    plugin = await prisma.plugin.create({
      data: {
        title,
        category: category || 'General',
        description: description || null,
        version: version || null,
        fileName: req.file.originalname,
        fileType: 'zip',
        fileSize: req.file.size,
        mimeType: req.file.mimetype || 'application/zip',
        storageProvider: 'bunny',
        ingestStatus: 'uploading',
      },
    })

    const storageKey = buildPluginStorageKey(plugin.id, req.file.originalname, title)
    await uploadObject(storageKey, req.file.buffer, { contentType: 'application/zip' })

    const downloadUrl = getPublicUrl(storageKey)
    const uploadedAt = new Date()

    plugin = await prisma.plugin.update({
      where: { id: plugin.id },
      data: {
        storageKey,
        downloadUrl,
        ingestStatus: 'ready',
        ingestError: null,
        uploadedAt,
        versions: {
          create: {
            version: version || null,
            fileName: req.file.originalname,
            fileType: 'zip',
            fileSize: req.file.size,
            mimeType: req.file.mimetype || 'application/zip',
            storageProvider: 'bunny',
            storageKey,
            downloadUrl,
            ingestStatus: 'ready',
            uploadedAt,
          },
        },
      },
      include: { versions: { orderBy: { createdAt: 'desc' } } },
    })

    res.status(201).json(withSignedDownloadUrl(plugin))
  } catch (err) {
    console.error('[plugins/bunny] upload failed:', err)
    if (plugin?.id) {
      await prisma.plugin.update({
        where: { id: plugin.id },
        data: { ingestStatus: 'failed', ingestError: err.message?.slice(0, 500) || 'Upload failed' },
      }).catch(() => {})
    }
    res.status(500).json({ error: err.message || 'Bunny upload failed' })
  }
})

// POST /api/plugins/:id/versions/bunny → add a new version to an existing
// plugin. Uploads to Bunny, inserts a PluginVersion row, and updates the
// mirrored "current" fields on the plugin to point at the new version.
router.post('/:id/versions/bunny', bunnyUpload.single('file'), async (req, res) => {
  const prisma = req.app.get('prisma')
  const { version } = req.body

  if (!isBunnyConfigured()) {
    return res.status(503).json({ error: 'Bunny storage is not configured on the server.' })
  }
  if (!req.file) {
    return res.status(400).json({ error: 'file is required' })
  }

  try {
    const existing = await prisma.plugin.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Plugin not found' })

    const storageKey = buildPluginStorageKey(existing.id, req.file.originalname, existing.title)
    await uploadObject(storageKey, req.file.buffer, { contentType: 'application/zip' })

    const downloadUrl = getPublicUrl(storageKey)
    const uploadedAt = new Date()

    const updated = await prisma.plugin.update({
      where: { id: existing.id },
      data: {
        version: version || null,
        fileName: req.file.originalname,
        fileType: 'zip',
        fileSize: req.file.size,
        mimeType: req.file.mimetype || 'application/zip',
        storageProvider: 'bunny',
        storageKey,
        downloadUrl,
        ingestStatus: 'ready',
        ingestError: null,
        uploadedAt,
        versions: {
          create: {
            version: version || null,
            fileName: req.file.originalname,
            fileType: 'zip',
            fileSize: req.file.size,
            mimeType: req.file.mimetype || 'application/zip',
            storageProvider: 'bunny',
            storageKey,
            downloadUrl,
            ingestStatus: 'ready',
            uploadedAt,
          },
        },
      },
      include: { versions: { orderBy: { createdAt: 'desc' } } },
    })

    res.status(201).json(withSignedDownloadUrl(updated))
  } catch (err) {
    console.error('[plugins/:id/versions/bunny] upload failed:', err)
    res.status(500).json({ error: err.message || 'Bunny upload failed' })
  }
})

// DELETE /api/plugins/:id/versions/:versionId → remove one version. Also
// deletes the backing object from Bunny (best-effort). If that version was
// the plugin's "current" one, the most recent remaining version is promoted;
// if none remain, the mirrored fields are cleared.
router.delete('/:id/versions/:versionId', async (req, res) => {
  const prisma = req.app.get('prisma')
  try {
    const version = await prisma.pluginVersion.findUnique({
      where: { id: req.params.versionId },
    })
    if (!version || version.pluginId !== req.params.id) {
      return res.status(404).json({ error: 'Version not found' })
    }

    const plugin = await prisma.plugin.findUnique({ where: { id: req.params.id } })
    if (!plugin) return res.status(404).json({ error: 'Plugin not found' })

    await prisma.pluginVersion.delete({ where: { id: version.id } })

    if (version.storageProvider === 'bunny' && version.storageKey) {
      await deleteObject(version.storageKey).catch(err => {
        console.error('[plugins/versions] bunny delete failed:', err.message)
      })
    }

    // If the deleted version was the one mirrored on the plugin, repoint
    // the plugin to the newest remaining version, or clear the fields.
    const wasCurrent = plugin.storageKey === version.storageKey && !!version.storageKey
    if (wasCurrent) {
      const remaining = await prisma.pluginVersion.findFirst({
        where: { pluginId: plugin.id },
        orderBy: { createdAt: 'desc' },
      })
      if (remaining) {
        await prisma.plugin.update({
          where: { id: plugin.id },
          data: {
            version: remaining.version,
            fileName: remaining.fileName,
            fileType: remaining.fileType,
            fileSize: remaining.fileSize,
            mimeType: remaining.mimeType,
            storageProvider: remaining.storageProvider,
            storageKey: remaining.storageKey,
            downloadUrl: remaining.downloadUrl,
            ingestStatus: remaining.ingestStatus,
            ingestError: remaining.ingestError,
            uploadedAt: remaining.uploadedAt,
          },
        })
      } else {
        await prisma.plugin.update({
          where: { id: plugin.id },
          data: {
            version: null,
            fileName: null,
            fileType: null,
            fileSize: null,
            mimeType: null,
            storageProvider: null,
            storageKey: null,
            downloadUrl: null,
            uploadedAt: null,
          },
        })
      }
    }

    const refreshed = await prisma.plugin.findUnique({
      where: { id: plugin.id },
      include: { versions: { orderBy: { createdAt: 'desc' } } },
    })
    res.json(withSignedDownloadUrl(refreshed))
  } catch (err) {
    console.error('[plugins/versions delete] failed:', err)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/plugins → create a plugin or upload a zip
router.post('/', upload.single('file'), async (req, res) => {
  const prisma = req.app.get('prisma')
  const { title, category, description, content, downloadUrl, fileName, fileType } = req.body

  if (!title) {
    if (req.file) unlinkIfExists(req.file.path)
    return res.status(400).json({ error: 'title is required' })
  }

  try {
    const plugin = await prisma.plugin.create({
      data: {
        title,
        category: category || 'General',
        description: description || null,
        content: req.file ? null : (content || null),
        downloadUrl: req.file
          ? `${LOCAL_FILE_PREFIX}${req.file.filename}`
          : (downloadUrl || null),
        fileName: req.file
          ? req.file.originalname
          : (fileName || null),
        fileType: req.file
          ? 'zip'
          : (fileType || null),
      },
    })

    res.status(201).json(plugin)
  } catch (err) {
    if (req.file) unlinkIfExists(req.file.path)
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/plugins/:id → update fields, optionally replace zip
router.patch('/:id', upload.single('file'), async (req, res) => {
  const prisma = req.app.get('prisma')
  const { title, category, description, content, downloadUrl, fileName, fileType } = req.body

  try {
    const existing = await prisma.plugin.findUnique({
      where: { id: req.params.id },
    })

    if (!existing) {
      if (req.file) unlinkIfExists(req.file.path)
      return res.status(404).json({ error: 'Plugin not found' })
    }

    const oldManagedPath = getManagedUploadPath(existing.downloadUrl)

    const plugin = await prisma.plugin.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(category !== undefined && { category }),
        ...(description !== undefined && { description }),
        ...(req.file
          ? {
              content: null,
              downloadUrl: `${LOCAL_FILE_PREFIX}${req.file.filename}`,
              fileName: req.file.originalname,
              fileType: 'zip',
            }
          : {
              ...(content !== undefined && { content }),
              ...(downloadUrl !== undefined && { downloadUrl }),
              ...(fileName !== undefined && { fileName }),
              ...(fileType !== undefined && { fileType }),
            }),
      },
    })

    if (req.file && oldManagedPath) {
      unlinkIfExists(oldManagedPath)
    }

    res.json(plugin)
  } catch (err) {
    if (req.file) unlinkIfExists(req.file.path)
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/plugins/:id — also removes every versioned Bunny object so
// nothing is orphaned in storage. Cascade on plugin_versions takes care of
// the rows; we just need to scrub the CDN objects before the cascade fires.
router.delete('/:id', async (req, res) => {
  const prisma = req.app.get('prisma')

  try {
    const existing = await prisma.plugin.findUnique({
      where: { id: req.params.id },
      include: { versions: true },
    })

    if (!existing) {
      return res.status(404).json({ error: 'Plugin not found' })
    }

    const managedPath = getManagedUploadPath(existing.downloadUrl)

    const bunnyKeys = new Set()
    if (existing.storageProvider === 'bunny' && existing.storageKey) {
      bunnyKeys.add(existing.storageKey)
    }
    for (const v of existing.versions) {
      if (v.storageProvider === 'bunny' && v.storageKey) bunnyKeys.add(v.storageKey)
    }

    await prisma.plugin.delete({ where: { id: req.params.id } })

    if (managedPath) unlinkIfExists(managedPath)

    for (const key of bunnyKeys) {
      await deleteObject(key).catch(err => {
        console.error('[plugins delete] bunny delete failed:', key, err.message)
      })
    }

    res.status(204).end()
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Multer / upload errors
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Zip file is too large (max 25 MB).' })
    }
    return res.status(400).json({ error: err.message })
  }

  if (err?.message === 'Only .zip files are allowed') {
    return res.status(400).json({ error: err.message })
  }

  next(err)
})

export default router