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
function withSignedDownloadUrl(plugin) {
  if (!plugin || plugin.storageProvider !== 'bunny' || !plugin.downloadUrl) return plugin
  return { ...plugin, downloadUrl: signCdnUrl(plugin.downloadUrl) }
}

// GET /api/plugins  → list all plugins grouped by category on the client.
router.get('/', async (req, res) => {
  const prisma = req.app.get('prisma')
  try {
    const plugins = await prisma.plugin.findMany({
      orderBy: [{ category: 'asc' }, { title: 'asc' }],
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
router.post('/bunny', bunnyUpload.single('file'), async (req, res) => {
  const prisma = req.app.get('prisma')
  const { title, category, description } = req.body

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
        fileName: req.file.originalname,
        fileType: 'zip',
        fileSize: req.file.size,
        mimeType: req.file.mimetype || 'application/zip',
        storageProvider: 'bunny',
        ingestStatus: 'uploading',
      },
    })

    const storageKey = buildPluginStorageKey(plugin.id, req.file.originalname)
    await uploadObject(storageKey, req.file.buffer, { contentType: 'application/zip' })

    plugin = await prisma.plugin.update({
      where: { id: plugin.id },
      data: {
        storageKey,
        downloadUrl: getPublicUrl(storageKey),
        ingestStatus: 'ready',
        ingestError: null,
        uploadedAt: new Date(),
      },
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

// DELETE /api/plugins/:id
router.delete('/:id', async (req, res) => {
  const prisma = req.app.get('prisma')

  try {
    const existing = await prisma.plugin.findUnique({
      where: { id: req.params.id },
    })

    if (!existing) {
      return res.status(404).json({ error: 'Plugin not found' })
    }

    const managedPath = getManagedUploadPath(existing.downloadUrl)

    await prisma.plugin.delete({
      where: { id: req.params.id },
    })

    if (managedPath) {
      unlinkIfExists(managedPath)
    }

    if (existing.storageProvider === 'bunny' && existing.storageKey) {
      await deleteObject(existing.storageKey).catch(() => {})
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