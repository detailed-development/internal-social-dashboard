import axios from 'axios';

const GRAPH_API = 'https://graph.facebook.com/v19.0';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Sync recent DM conversations for an Instagram or Facebook account.
 * Uses the Messenger Platform /conversations endpoint, which works for both
 * Instagram-linked Pages and standard Facebook Pages.
 *
 * Required token permissions:
 *   - pages_messaging (Facebook)
 *   - instagram_manage_messages (Instagram)
 *
 * If the token lacks these permissions the API returns a permission error,
 * which is caught and silently skipped so it never breaks the main sync cycle.
 */
export async function syncMessages(prisma, account) {
  if (account.platform !== 'INSTAGRAM' && account.platform !== 'FACEBOOK') return;

  const { accessToken, platformUserId } = account;

  // For Instagram, conversations live under the connected Facebook Page's
  // inbox using platform=instagram. For Facebook Pages we omit the param.
  const params =
    account.platform === 'INSTAGRAM'
      ? {
          platform: 'instagram',
          fields: 'id,participants,updated_time,message_count',
          limit: 20,
          access_token: accessToken,
        }
      : {
          fields: 'id,participants,updated_time,message_count',
          limit: 20,
          access_token: accessToken,
        };

  let conversations;
  try {
    const res = await axios.get(`${GRAPH_API}/${platformUserId}/conversations`, { params });
    conversations = res.data?.data ?? [];
  } catch (err) {
    const code = err.response?.data?.error?.code;
    const msg  = err.response?.data?.error?.message ?? err.message;
    const lowered = msg?.toLowerCase();
    // 200 = permission denied, 10/3 = not allowed by app review or missing
    // product capability. These are configuration issues, not runtime failures.
    if (
      code === 200 ||
      code === 10 ||
      code === 3 ||
      lowered?.includes('permission') ||
      lowered?.includes('capability to make this api call')
    ) {
      console.log(`    Skipping message sync for @${account.handle} (${account.platform}): insufficient token permissions or app capability`);
      return;
    }
    throw err;
  }

  if (!conversations.length) return;

  for (const convo of conversations) {
    // Determine the non-page participant (the customer / user who sent the DM)
    const participants = convo.participants?.data ?? [];
    const other = participants.find(p => p.id !== platformUserId);

    const conversation = await prisma.conversation.upsert({
      where: {
        socialAccountId_platformConversationId: {
          socialAccountId: account.id,
          platformConversationId: convo.id,
        },
      },
      update: {
        messageCount: convo.message_count ?? 0,
        lastMessageAt: convo.updated_time ? new Date(convo.updated_time) : undefined,
        participantName: other?.name ?? null,
        participantId: other?.id ?? null,
      },
      create: {
        socialAccountId: account.id,
        platformConversationId: convo.id,
        participantName: other?.name ?? null,
        participantId: other?.id ?? null,
        messageCount: convo.message_count ?? 0,
        lastMessageAt: convo.updated_time ? new Date(convo.updated_time) : null,
      },
    });

    // Fetch the most recent messages in this conversation (up to 20)
    try {
      const msgRes = await axios.get(`${GRAPH_API}/${convo.id}/messages`, {
        params: {
          fields: 'id,message,from,created_time',
          limit: 20,
          access_token: accessToken,
        },
      });

      const messages = msgRes.data?.data ?? [];
      for (const msg of messages) {
        const isFromPage = msg.from?.id === platformUserId;
        const body = msg.message ?? '';
        if (!body) continue; // skip empty / attachment-only messages

        await prisma.directMessage.upsert({
          where: {
            conversationId_platformMessageId: {
              conversationId: conversation.id,
              platformMessageId: msg.id,
            },
          },
          update: { body },
          create: {
            conversationId: conversation.id,
            platformMessageId: msg.id,
            fromName: msg.from?.name ?? null,
            fromId: msg.from?.id ?? null,
            body,
            sentAt: new Date(msg.created_time),
            isFromPage,
          },
        });
      }
    } catch (_) {
      // Individual message fetch failures are non-fatal
    }

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastSyncedAt: new Date() },
    });
  }
}
