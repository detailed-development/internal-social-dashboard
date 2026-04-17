import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import multer from 'multer'
import { Router } from 'express'

const router = Router()

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'plugins')
const LOCAL_FILE_PREFIX = '/_plugin_uploads/'

fs.mkdirSync(UPLOAD_DIR, { recursive: true })

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
  limits: {
    fileSize: 325 * 1024 * 1024, // 325 MB
  },
  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase()
    if (ext !== '.zip') {
      return cb(new Error('Only .zip files are allowed'))
    }
    cb(null, true)
  },
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

// GET /api/plugins  → list all plugins grouped by category on the client.
router.get('/', async (req, res) => {
  const prisma = req.app.get('prisma')
  try {
    const plugins = await prisma.plugin.findMany({
      orderBy: [{ category: 'asc' }, { title: 'asc' }],
    })
    res.json(plugins)
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