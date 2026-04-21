import fs from 'fs'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

vi.mock('../lib/storage/bunny.js', () => ({
  isBunnyConfigured: vi.fn(() => true),
  buildPluginStorageKey: vi.fn(() => 'internal-social-dashboard/tools-plugins/plugin-key.zip'),
  getPublicUrl: vi.fn(() => 'https://cdn.example/internal-social-dashboard/tools-plugins/plugin-key.zip'),
  uploadObject: vi.fn().mockResolvedValue({ ok: true }),
  deleteObject: vi.fn().mockResolvedValue({ ok: true }),
  signCdnUrl: vi.fn((url) => url),
}))

import app from '../api/app.js'
import { uploadObject } from '../lib/storage/bunny.js'

const mockPrisma = {
  plugin: {
    create: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
  },
}
const createdPaths = []

function managedUploadPath(downloadUrl) {
  return path.resolve(process.cwd(), 'uploads', 'plugins', path.basename(downloadUrl))
}

beforeEach(() => {
  vi.clearAllMocks()
  uploadObject.mockImplementation(async (_storageKey, body) => {
    await new Promise((resolve, reject) => {
      body.on('error', reject)
      body.on('end', resolve)
      body.resume()
    })
    return { ok: true }
  })
  app.set('prisma', mockPrisma)
})

afterEach(() => {
  while (createdPaths.length > 0) {
    fs.rmSync(createdPaths.pop(), { force: true })
  }
})

describe('POST /api/plugins/bunny', () => {
  it('streams the temp file to Bunny instead of buffering the upload in memory', async () => {
    const pdf = Buffer.from('%PDF-1.4 test pdf')

    mockPrisma.plugin.create.mockResolvedValue({ id: 'plugin-1' })
    mockPrisma.plugin.update.mockResolvedValue({
      id: 'plugin-1',
      title: 'Internal Social Dashboard',
      storageProvider: 'bunny',
      downloadUrl: 'https://cdn.example/internal-social-dashboard/tools-plugins/plugin-key.zip',
      versions: [],
    })

    const res = await request(app)
      .post('/api/plugins/bunny')
      .field('title', 'Internal Social Dashboard')
      .field('category', 'Dashboard')
      .attach('file', pdf, { filename: 'guide.pdf', contentType: 'application/pdf' })

    expect(res.status).toBe(201)
    expect(uploadObject).toHaveBeenCalledTimes(1)

    const [storageKey, body, options] = uploadObject.mock.calls[0]
    expect(storageKey).toBe('internal-social-dashboard/tools-plugins/plugin-key.zip')
    expect(Buffer.isBuffer(body)).toBe(false)
    expect(typeof body?.pipe).toBe('function')
    expect(options).toMatchObject({
      contentType: 'application/pdf',
      contentLength: pdf.length,
    })
    expect(fs.existsSync(body.path)).toBe(false)
  })
})

describe('POST /api/plugins/:id/versions/bunny', () => {
  it('streams version uploads from disk and cleans up the temp file', async () => {
    const zip = Buffer.from('zip-version-content')

    mockPrisma.plugin.findUnique.mockResolvedValue({
      id: 'plugin-1',
      title: 'Internal Social Dashboard',
    })
    mockPrisma.plugin.update.mockResolvedValue({
      id: 'plugin-1',
      title: 'Internal Social Dashboard',
      storageProvider: 'bunny',
      downloadUrl: 'https://cdn.example/internal-social-dashboard/tools-plugins/plugin-key.zip',
      versions: [],
    })

    const res = await request(app)
      .post('/api/plugins/plugin-1/versions/bunny')
      .field('version', '1.0.1')
      .attach('file', zip, { filename: 'plugin.zip', contentType: 'application/zip' })

    expect(res.status).toBe(201)
    expect(uploadObject).toHaveBeenCalledTimes(1)

    const [, body, options] = uploadObject.mock.calls[0]
    expect(Buffer.isBuffer(body)).toBe(false)
    expect(typeof body?.pipe).toBe('function')
    expect(options).toMatchObject({
      contentType: 'application/zip',
      contentLength: zip.length,
    })
    expect(fs.existsSync(body.path)).toBe(false)
  })
})

describe('POST /api/plugins', () => {
  it('stores local PDF uploads with generic file metadata', async () => {
    const pdf = Buffer.from('%PDF-1.4 local guide')

    mockPrisma.plugin.create.mockImplementation(async ({ data }) => ({ id: 'local-1', ...data }))

    const res = await request(app)
      .post('/api/plugins')
      .field('title', 'Brand Guide')
      .field('category', 'Docs')
      .attach('file', pdf, { filename: 'brand-guide.pdf', contentType: 'application/pdf' })

    expect(res.status).toBe(201)
    expect(res.body.fileName).toBe('brand-guide.pdf')
    expect(res.body.fileType).toBe('pdf')
    expect(res.body.mimeType).toBe('application/pdf')
    expect(res.body.fileSize).toBe(pdf.length)
    expect(res.body.downloadUrl).toMatch(/^\/_plugin_uploads\//)

    const storedPath = managedUploadPath(res.body.downloadUrl)
    createdPaths.push(storedPath)
    expect(fs.existsSync(storedPath)).toBe(true)
  })

  it('rejects unsupported file extensions', async () => {
    const res = await request(app)
      .post('/api/plugins')
      .field('title', 'Executable')
      .attach('file', Buffer.from('MZ'), { filename: 'malware.exe', contentType: 'application/octet-stream' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/ZIP, PDF, PNG, JPG, JPEG, GIF, WEBP, and SVG/i)
  })
})

describe('GET /api/plugins/:id/file', () => {
  it('serves managed PDFs inline so they can be opened in the dashboard flow', async () => {
    const filePath = path.resolve(process.cwd(), 'uploads', 'plugins', 'inline-test.pdf')
    fs.writeFileSync(filePath, Buffer.from('%PDF-1.4 inline'))
    createdPaths.push(filePath)

    mockPrisma.plugin.findUnique.mockResolvedValue({
      id: 'local-inline',
      downloadUrl: '/_plugin_uploads/inline-test.pdf',
      fileName: 'inline-test.pdf',
      mimeType: 'application/pdf',
    })

    const res = await request(app).get('/api/plugins/local-inline/file')

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('application/pdf')
    expect(res.headers['content-disposition']).toContain('inline')
  })
})
