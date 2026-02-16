import { prisma } from '../../lib/prisma';
import { CONVERSATION_STATUS } from '@whatsapp-bot/shared';

const WINDOW_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Find an active (non-closed) conversation for a customer on a specific phone number,
 * or create a new one.
 */
export async function findOrCreate(params: {
  tenantId: string;
  customerId: string;
  phoneNumberId: string;
}) {
  const { tenantId, customerId, phoneNumberId } = params;

  // Look for existing non-closed conversation
  let conversation = await prisma.conversation.findFirst({
    where: {
      tenantId,
      customerId,
      phoneNumberId,
      status: { not: CONVERSATION_STATUS.CLOSED },
    },
    orderBy: { updatedAt: 'desc' },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        tenantId,
        customerId,
        phoneNumberId,
        status: CONVERSATION_STATUS.BOT,
      },
    });
  }

  return conversation;
}

/**
 * Update conversation on inbound message: set lastMessageAt, lastInboundAt, and extend window.
 */
export async function onInboundMessage(conversationId: string) {
  const now = new Date();
  return prisma.conversation.update({
    where: { id: conversationId },
    data: {
      lastMessageAt: now,
      lastInboundAt: now,
      windowExpiresAt: new Date(now.getTime() + WINDOW_DURATION_MS),
    },
  });
}

/**
 * Update conversation on outbound message.
 */
export async function onOutboundMessage(conversationId: string) {
  return prisma.conversation.update({
    where: { id: conversationId },
    data: {
      lastMessageAt: new Date(),
      lastOutboundAt: new Date(),
    },
  });
}

/**
 * Set conversation status to NEEDS_AGENT and record the timestamp.
 */
export async function setNeedsAgent(conversationId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { firstNeedsAgentAt: true },
  });

  return prisma.conversation.update({
    where: { id: conversationId },
    data: {
      status: CONVERSATION_STATUS.NEEDS_AGENT,
      firstNeedsAgentAt: conversation?.firstNeedsAgentAt || new Date(),
    },
  });
}

/**
 * Update the last detected intent on the conversation.
 */
export async function updateIntent(conversationId: string, intent: string) {
  return prisma.conversation.update({
    where: { id: conversationId },
    data: { lastIntent: intent },
  });
}

/**
 * Close a conversation.
 */
export async function closeConversation(conversationId: string) {
  return prisma.conversation.update({
    where: { id: conversationId },
    data: {
      status: CONVERSATION_STATUS.CLOSED,
      closedAt: new Date(),
    },
  });
}
