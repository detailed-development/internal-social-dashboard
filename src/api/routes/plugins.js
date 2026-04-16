import { Router } from 'express';
const router = Router();

// GET /api/plugins  → list all plugins grouped by category on the client.
router.get('/', async (req, res) => {
  const prisma = req.app.get('prisma');
  try {
    const plugins = await prisma.plugin.findMany({
      orderBy: [{ category: 'asc' }, { title: 'asc' }],
    });
    res.json(plugins);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/plugins  → create a plugin.
router.post('/', async (req, res) => {
  const prisma = req.app.get('prisma');
  const { title, category, description, content, downloadUrl, fileName, fileType } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  try {
    const plugin = await prisma.plugin.create({
      data: {
        title,
        category: category || 'General',
        description: description || null,
        content: content || null,
        downloadUrl: downloadUrl || null,
        fileName: fileName || null,
        fileType: fileType || null,
      },
    });
    res.status(201).json(plugin);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/plugins/:id  → update fields.
router.patch('/:id', async (req, res) => {
  const prisma = req.app.get('prisma');
  const { title, category, description, content, downloadUrl, fileName, fileType } = req.body;
  try {
    const plugin = await prisma.plugin.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(category !== undefined && { category }),
        ...(description !== undefined && { description }),
        ...(content !== undefined && { content }),
        ...(downloadUrl !== undefined && { downloadUrl }),
        ...(fileName !== undefined && { fileName }),
        ...(fileType !== undefined && { fileType }),
      },
    });
    res.json(plugin);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Plugin not found' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/plugins/:id
router.delete('/:id', async (req, res) => {
  const prisma = req.app.get('prisma');
  try {
    await prisma.plugin.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Plugin not found' });
    res.status(500).json({ error: err.message });
  }
});

export default router;
