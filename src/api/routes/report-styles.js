import { Router } from 'express';
const router = Router();

// GET /api/report-styles?clientId=:clientId
router.get('/', async (req, res) => {
  const prisma = req.app.get('prisma');
  const { clientId } = req.query;
  if (!clientId) return res.status(400).json({ error: 'clientId is required' });
  try {
    const styles = await prisma.clientReportStyle.findMany({
      where: { clientId },
      orderBy: { createdAt: 'asc' },
    });
    res.json(styles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/report-styles
router.post('/', async (req, res) => {
  const prisma = req.app.get('prisma');
  const { clientId, name, selectedModules, displayOrder } = req.body;
  if (!clientId || !name || !selectedModules) {
    return res.status(400).json({ error: 'clientId, name, and selectedModules are required' });
  }
  try {
    const style = await prisma.clientReportStyle.create({
      data: { clientId, name, selectedModules, displayOrder },
    });
    res.status(201).json(style);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/report-styles/:id
router.patch('/:id', async (req, res) => {
  const prisma = req.app.get('prisma');
  const { name, selectedModules, displayOrder } = req.body;
  try {
    const style = await prisma.clientReportStyle.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(selectedModules !== undefined && { selectedModules }),
        ...(displayOrder !== undefined && { displayOrder }),
      },
    });
    res.json(style);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Report style not found' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/report-styles/:id
router.delete('/:id', async (req, res) => {
  const prisma = req.app.get('prisma');
  try {
    await prisma.clientReportStyle.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Report style not found' });
    res.status(500).json({ error: err.message });
  }
});

export default router;
