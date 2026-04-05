import { Router } from 'express';
const router = Router();

/**
 * GET /api/messages/client/:slug
 *
 * Returns the most recent DM conversations (with their messages) across all
 * Instagram and Facebook accounts linked to the client. Conversations are
 * ordered by last message received (newest first).
 *
 * Query params:
 *   limit  – max conversations to return (default 20, max 100)
 */
router.get('/client/:slug', async (req, res) => {
  const prisma = req.app.get('prisma');
  const limit  = Math.min(parseInt(req.query.limit) || 20, 100);

  const client = await prisma.client.findUnique({
    where: { slug: req.params.slug },
    select: { id: true },
  });
  if (!client) return res.status(404).json({ error: 'Client not found' });

  // Pull all IG/FB accounts for this client
  const accounts = await prisma.socialAccount.findMany({
    where: {
      clientId: client.id,
      platform: { in: ['INSTAGRAM', 'FACEBOOK'] },
    },
    select: { id: true, platform: true, handle: true },
  });

  if (!accounts.length) return res.json([]);

  const accountIds = accounts.map(a => a.id);
  const accountMap = Object.fromEntries(accounts.map(a => [a.id, a]));

  const conversations = await prisma.conversation.findMany({
    where: { socialAccountId: { in: accountIds } },
    orderBy: { lastMessageAt: 'desc' },
    take: limit,
    include: {
      messages: {
        orderBy: { sentAt: 'desc' },
        take: 30,
      },
    },
  });

  // Attach platform/handle info to each conversation for the frontend
  const result = conversations.map(c => ({
    id: c.id,
    platform: accountMap[c.socialAccountId]?.platform ?? null,
    accountHandle: accountMap[c.socialAccountId]?.handle ?? null,
    platformConversationId: c.platformConversationId,
    participantName: c.participantName,
    participantId: c.participantId,
    messageCount: c.messageCount,
    lastMessageAt: c.lastMessageAt,
    lastSyncedAt: c.lastSyncedAt,
    messages: c.messages.map(m => ({
      id: m.id,
      fromName: m.fromName,
      fromId: m.fromId,
      body: m.body,
      sentAt: m.sentAt,
      isFromPage: m.isFromPage,
    })),
  }));

  res.json(result);
});

export default router;
