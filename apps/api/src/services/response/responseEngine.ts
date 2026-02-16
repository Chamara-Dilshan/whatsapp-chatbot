import { prisma } from '../../lib/prisma';
import { INTENTS, CONVERSATION_STATUS } from '@whatsapp-bot/shared';
import * as sendService from '../whatsapp/send.service';
import * as conversationService from '../conversation/conversation.service';
import * as messageService from '../message/message.service';
import { logger } from '../../lib/logger';

interface ResponseContext {
  tenantId: string;
  conversationId: string;
  customerId: string;
  customerWaId: string;
  intent: string;
  confidence: number;
  messageText?: string;
}

interface ResponseResult {
  replied: boolean;
  handoff: boolean;
  replyText?: string;
}

/**
 * Generate and send a response based on detected intent.
 * Uses template-first approach: look up ReplyTemplate for the intent,
 * then send the template body. If no template, use a default.
 */
export async function generateResponse(ctx: ResponseContext): Promise<ResponseResult> {
  const { tenantId, conversationId, customerWaId, intent, confidence } = ctx;

  // Check if this intent requires agent handoff
  if (intent === INTENTS.SPEAK_TO_HUMAN || intent === INTENTS.COMPLAINT) {
    return handleHandoff(ctx);
  }

  // Opt-out: handled separately in webhook service
  if (intent === INTENTS.OPT_OUT || intent === INTENTS.OPT_IN) {
    return { replied: false, handoff: false };
  }

  // Low confidence → handoff
  if (confidence < 0.3) {
    return handleHandoff(ctx);
  }

  // Look up reply template for this tenant + intent
  const template = await prisma.replyTemplate.findUnique({
    where: { tenantId_intent: { tenantId, intent } },
  });

  let replyText: string;
  if (template && template.isActive) {
    // Substitute simple placeholders
    replyText = template.body;
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
    replyText = replyText.replace(/\{\{tenantName\}\}/g, tenant?.name || 'Our Store');
  } else {
    // Default fallback
    replyText = "Thanks for your message! How can I help you today? Type \"agent\" to speak with a human.";
  }

  // Send the reply
  const sendResult = await sendService.sendText({
    tenantId,
    toWaId: customerWaId,
    text: replyText,
    conversationId,
  });

  // Persist outbound message
  await messageService.createOutbound({
    tenantId,
    conversationId,
    body: replyText,
    waMessageId: sendResult.waMessageId,
    intent,
  });

  // Update conversation outbound timestamp
  await conversationService.onOutboundMessage(conversationId);

  return { replied: true, handoff: false, replyText };
}

/**
 * Handle agent handoff: update conversation status, send handoff message.
 */
async function handleHandoff(ctx: ResponseContext): Promise<ResponseResult> {
  const { tenantId, conversationId, customerWaId, intent } = ctx;

  // Set conversation to NEEDS_AGENT
  await conversationService.setNeedsAgent(conversationId);

  // Look up the handoff template
  const template = await prisma.replyTemplate.findUnique({
    where: { tenantId_intent: { tenantId, intent: INTENTS.SPEAK_TO_HUMAN } },
  });

  const handoffText = template?.body || "I'm connecting you with a human agent. Please hold on, someone will be with you shortly.";

  // Send handoff message
  const sendResult = await sendService.sendText({
    tenantId,
    toWaId: customerWaId,
    text: handoffText,
    conversationId,
  });

  // Persist outbound message
  await messageService.createOutbound({
    tenantId,
    conversationId,
    body: handoffText,
    waMessageId: sendResult.waMessageId,
    intent: INTENTS.SPEAK_TO_HUMAN,
  });

  await conversationService.onOutboundMessage(conversationId);

  logger.info({ tenantId, conversationId, originalIntent: intent }, 'Conversation handed off to agent');

  // Emit automation event for handoff (Phase 4 will add AutomationEvent creation here)

  return { replied: true, handoff: true, replyText: handoffText };
}
