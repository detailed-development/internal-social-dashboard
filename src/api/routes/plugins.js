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
const IMAGE_MIME_BY_EXT = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
}
const MIME_BY_EXT = {
  zip: 'application/zip',
  pdf: 'application/pdf',
  ...IMAGE_MIME_BY_EXT,
}
const ALLOWED_UPLOAD_EXTENSIONS = new Set(Object.keys(MIME_BY_EXT))
const ALLOWED_UPLOAD_LABEL = 'ZIP, PDF, PNG, JPG, JPEG, GIF, WEBP, and SVG'

fs.mkdirSync(UPLOAD_DIR, { recursive: true })

function inferFileType(name = '') {
  const ext = path.extname(name).toLowerCase().replace(/^\./, '')
  return ext || null
}

function normalizeMimeType(file) {
  const ext = inferFileType(file?.originalname)
  const preferred = ext ? MIME_BY_EXT[ext] : null
  const provided = String(file?.mimetype || '').trim().toLowerCase()
  return preferred || provided || 'application/octet-stream'
}

function buildStoredFileFields(file) {
  return {
    fileName: file.originalname,
    fileType: inferFileType(file.originalname),
    fileSize: file.size,
    mimeType: normalizeMimeType(file),
  }
}

function uploadFileFilter(req, file, cb) {
  const ext = inferFileType(file.originalname)
  if (!ext || !ALLOWED_UPLOAD_EXTENSIONS.has(ext)) {
    return cb(new Error(`Only ${ALLOWED_UPLOAD_LABEL} files are allowed.`))
  }
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
  fileFilter: uploadFileFilter,
})

// Bunny uploads share the same temp-file storage so large files do not have to
// be buffered fully in Node memory before they are relayed to Bunny.
const bunnyUpload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: uploadFileFilter,
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

function cleanupTempUpload(file) {
  if (file?.path) unlinkIfExists(file.path)
}

function maxUploadLabel(bytes) {
  const mb = bytes / (1024 * 1024)
  const rounded = Number.isInteger(mb) ? String(mb) : mb.toFixed(1).replace(/\.0$/, '')
  return `${rounded} MB`
}

function buildDispositionHeader(disposition, fileName) {
  const safeName = String(fileName || 'file').replace(/"/g, '')
  return `${disposition}; filename="${safeName}"`
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

async function serveManagedUpload(req, res, { inline = false } = {}) {
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

    const downloadName = plugin.fileName || path.basename(filePath)
    if (!inline) {
      return res.download(filePath, downloadName)
    }

    res.type(plugin.mimeType || downloadName)
    res.setHeader('Content-Disposition', buildDispositionHeader('inline', downloadName))
    return res.sendFile(filePath)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// GET /api/plugins/:id/file → open stored local file inline when the browser
// supports it (images/PDFs), otherwise it still downloads normally.
router.get('/:id/file', async (req, res) => {
  return serveManagedUpload(req, res, { inline: true })
})

// GET /api/plugins/:id/download → force download for a locally managed file.
router.get('/:id/download', async (req, res) => {
  return serveManagedUpload(req, res, { inline: false })
})

// GET /api/plugins/bunny-status → whether Bunny storage is configured, so the
// UI can decide to show the "Upload to Bunny" option.
router.get('/bunny-status', (req, res) => {
  res.json({ configured: isBunnyConfigured(), maxBytes: MAX_UPLOAD_BYTES })
})

// POST /api/plugins/bunny → multipart upload that relays the file from a temp
// file to Bunny Storage, then persists storage metadata on a new plugin row.
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
  let storageKey = null
  let uploadedToBunny = false
  try {
    const fileFields = buildStoredFileFields(req.file)
    // Reserve the row first so we can use its id in the storage key.
    plugin = await prisma.plugin.create({
      data: {
        title,
        category: category || 'General',
        description: description || null,
        version: version || null,
        ...fileFields,
        storageProvider: 'bunny',
        ingestStatus: 'uploading',
      },
    })

    storageKey = buildPluginStorageKey(plugin.id, req.file.originalname, title)
    await uploadObject(
      storageKey,
      fs.createReadStream(req.file.path),
      {
        contentType: fileFields.mimeType,
        contentLength: req.file.size,
      },
    )
    uploadedToBunny = true

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
            ...fileFields,
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
    if (uploadedToBunny && storageKey) {
      await deleteObject(storageKey).catch(cleanupErr => {
        console.error('[plugins/bunny] cleanup failed:', cleanupErr.message)
      })
    }
    if (plugin?.id) {
      await prisma.plugin.update({
        where: { id: plugin.id },
        data: { ingestStatus: 'failed', ingestError: err.message?.slice(0, 500) || 'Upload failed' },
      }).catch(() => {})
    }
    res.status(500).json({ error: err.message || 'Bunny upload failed' })
  } finally {
    cleanupTempUpload(req.file)
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
    let uploadedToBunny = false
    try {
      const fileFields = buildStoredFileFields(req.file)
      await uploadObject(
        storageKey,
        fs.createReadStream(req.file.path),
        {
          contentType: fileFields.mimeType,
          contentLength: req.file.size,
        },
      )
      uploadedToBunny = true

      const downloadUrl = getPublicUrl(storageKey)
      const uploadedAt = new Date()

      const updated = await prisma.plugin.update({
        where: { id: existing.id },
        data: {
          version: version || null,
          ...fileFields,
          storageProvider: 'bunny',
          storageKey,
          downloadUrl,
          ingestStatus: 'ready',
          ingestError: null,
          uploadedAt,
          versions: {
            create: {
              version: version || null,
              ...fileFields,
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
      if (uploadedToBunny && storageKey) {
        await deleteObject(storageKey).catch(cleanupErr => {
          console.error('[plugins/:id/versions/bunny] cleanup failed:', cleanupErr.message)
        })
      }
      throw err
    }
  } catch (err) {
    console.error('[plugins/:id/versions/bunny] upload failed:', err)
    res.status(500).json({ error: err.message || 'Bunny upload failed' })
  } finally {
    cleanupTempUpload(req.file)
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

// POST /api/plugins → create a plugin or upload a supported file
router.post('/', upload.single('file'), async (req, res) => {
  const prisma = req.app.get('prisma')
  const { title, category, description, content, downloadUrl, fileName, fileType, version } = req.body

  if (!title) {
    if (req.file) unlinkIfExists(req.file.path)
    return res.status(400).json({ error: 'title is required' })
  }

  try {
    const fileFields = req.file ? buildStoredFileFields(req.file) : null
    const plugin = await prisma.plugin.create({
      data: {
        title,
        category: category || 'General',
        description: description || null,
        version: version || null,
        content: req.file ? null : (content || null),
        downloadUrl: req.file
          ? `${LOCAL_FILE_PREFIX}${req.file.filename}`
          : (downloadUrl || null),
        fileName: req.file ? fileFields.fileName : (fileName || null),
        fileType: req.file ? fileFields.fileType : (fileType || null),
        fileSize: req.file ? fileFields.fileSize : null,
        mimeType: req.file ? fileFields.mimeType : null,
        uploadedAt: req.file ? new Date() : null,
      },
    })

    res.status(201).json(plugin)
  } catch (err) {
    if (req.file) unlinkIfExists(req.file.path)
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/plugins/:id → update fields, optionally replace the uploaded file
router.patch('/:id', upload.single('file'), async (req, res) => {
  const prisma = req.app.get('prisma')
  const { title, category, description, content, downloadUrl, fileName, fileType, version } = req.body

  try {
    const existing = await prisma.plugin.findUnique({
      where: { id: req.params.id },
    })

    if (!existing) {
      if (req.file) unlinkIfExists(req.file.path)
      return res.status(404).json({ error: 'Plugin not found' })
    }

    const oldManagedPath = getManagedUploadPath(existing.downloadUrl)
    const fileFields = req.file ? buildStoredFileFields(req.file) : null

    const plugin = await prisma.plugin.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(category !== undefined && { category }),
        ...(description !== undefined && { description }),
        ...(version !== undefined && { version }),
        ...(req.file
          ? {
              content: null,
              downloadUrl: `${LOCAL_FILE_PREFIX}${req.file.filename}`,
              fileName: fileFields.fileName,
              fileType: fileFields.fileType,
              fileSize: fileFields.fileSize,
              mimeType: fileFields.mimeType,
              storageProvider: null,
              storageKey: null,
              uploadedAt: new Date(),
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
      return res.status(400).json({ error: `File is too large (max ${maxUploadLabel(MAX_UPLOAD_BYTES)}).` })
    }
    return res.status(400).json({ error: err.message })
  }

  if (err?.message === `Only ${ALLOWED_UPLOAD_LABEL} files are allowed.`) {
    return res.status(400).json({ error: err.message })
  }

  next(err)
})

export default router
