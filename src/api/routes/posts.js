import { Router } from 'express';
const router = Router();

router.get('/:id', async (req, res) => {
  const prisma = req.app.get('prisma');
  try {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
      include: { metrics: { orderBy: { recordedAt: 'desc' } }, comments: { orderBy: { postedAt: 'desc' } }, transcription: true },
    });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
