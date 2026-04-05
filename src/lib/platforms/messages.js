import axios from 'axios';

const GRAPH_API = 'https://graph.facebook.com/v19.0';

// Spam scoring heuristics. Each matched rule adds to the score.
// A conversation scoring >= SPAM_THRESHOLD is auto-hidden on first sync.
// Manual hide/unhide always takes precedence (we never override a conversation
// that was already manually reviewed).
const SPAM_THRESHOLD = 3;

const SPAM_KEYWORDS = [
  // Promotional outreach
  'check my profile', 'check out my', 'visit my profile', 'follow me back',
  'follow for follow', 'f4f', 'l4l', 'like for like',
  // Collab / promo spam
  'paid promotion', 'promo collab', 'collaboration offer', 'brand deal',
  'sponsored post', 'influencer', 'ambassador',
  // Generic money spam
  'make money', 'earn money', 'work from home', 'passive income',
  'financial freedom', 'investment opportunity', 'crypto',
  // Generic link bait
  'click the link', 'link in bio', 'check the link', 'dm for link',
  'swipe up', 'tap the link',
  // Generic solicitation
  'buy followers', 'get followers', 'boost your', 'grow your account',
  'increase your followers',
];

const URL_PATTERN = /https?:\/\/\S+|bit\.ly\/\S+|t\.co\/\S+|linktr\.ee\/\S+/i;

function spamScore(messages) {
  // Only auto-hide if the page has never replied — if we've engaged, keep it visible
  const hasPageReply = messages.some(m => m.isFromPage);
  if (hasPageReply) return 0;

  let score = 0;
  const allText = messages.map(m => m.body.toLowerCase()).join(' ');

  // URL in any message
  if (URL_PATTERN.test(allText)) score += 3;

  // Spam keyword matches
  for (const kw of SPAM_KEYWORDS) {
    if (allText.includes(kw)) score += 2;
  }

  // Single cold-open message with no follow-up (classic bot behaviour)
  if (messages.length === 1) score += 1;

  return score;
}

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
    // 200 = permission denied, 10 = not allowed by app review – skip silently
    if (code === 200 || code === 10 || msg?.toLowerCase().includes('permission')) {
      console.log(`    Skipping message sync for @${account.handle} (${account.platform}): insufficient token permissions`);
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
    let syncedMessages = [];
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

        syncedMessages.push({ body, isFromPage });
      }
    } catch (_) {
      // Individual message fetch failures are non-fatal
    }

    // Auto-hide obvious spam — only on first sync (isHidden is still false) so we
    // never override a manual unhide decision made by the user.
    if (!conversation.isHidden && syncedMessages.length > 0) {
      const score = spamScore(syncedMessages);
      if (score >= SPAM_THRESHOLD) {
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { isHidden: true },
        });
        console.log(`    Auto-hidden spam conversation (score ${score}) from ${other?.name ?? 'unknown'}`);
      }
    }

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastSyncedAt: new Date() },
    });
  }
}
