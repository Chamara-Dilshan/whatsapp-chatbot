import { prisma } from '../../lib/prisma';
import { MESSAGE_DIRECTION, MESSAGE_STATUS } from '@whatsapp-bot/shared';

/**
 * Check if a message with this WhatsApp message ID already exists (idempotency).
 */
export async function existsByWaMessageId(waMessageId: string): Promise<boolean> {
  const existing = await prisma.message.findUnique({
    where: { waMessageId },
    select: { id: true },
  });
  return !!existing;
}

/**
 * Create an inbound message record.
 */
export async function createInbound(params: {
  tenantId: string;
  conversationId: string;
  customerId: string;
  waMessageId: string;
  type: string;
  body?: string;
  metadata?: object;
  intent?: string;
  confidence?: number;
}) {
  return prisma.message.create({
    data: {
      tenantId: params.tenantId,
      conversationId: params.conversationId,
      customerId: params.customerId,
      waMessageId: params.waMessageId,
      direction: MESSAGE_DIRECTION.INBOUND,
      type: params.type,
      body: params.body || null,
      metadata: params.metadata as object || null,
      intent: params.intent || null,
      confidence: params.confidence || null,
      status: MESSAGE_STATUS.RECEIVED,
    },
  });
}

/**
 * Create an outbound message record (bot or agent reply).
 */
export async function createOutbound(params: {
  tenantId: string;
  conversationId: string;
  type?: string;
  body: string;
  waMessageId?: string;
  intent?: string;
  sentBy?: string;
}) {
  return prisma.message.create({
    data: {
      tenantId: params.tenantId,
      conversationId: params.conversationId,
      direction: MESSAGE_DIRECTION.OUTBOUND,
      type: params.type || 'text',
      body: params.body,
      waMessageId: params.waMessageId || null,
      intent: params.intent || null,
      sentBy: params.sentBy || null,
      status: params.waMessageId ? MESSAGE_STATUS.SENT : MESSAGE_STATUS.FAILED,
    },
  });
}

/**
 * Update the intent on an existing message.
 */
export async function updateIntent(messageId: string, intent: string, confidence?: number) {
  return prisma.message.update({
    where: { id: messageId },
    data: { intent, confidence },
  });
}
