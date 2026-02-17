import { INTENTS, CONVERSATION_STATUS } from '@whatsapp-bot/shared';
import { parseWebhookPayload } from './parser';
import * as tenantRouting from '../tenant/tenantRouting.service';
import * as customerService from '../customer/customer.service';
import * as conversationService from '../conversation/conversation.service';
import * as messageService from '../message/message.service';
import * as intentEngine from '../intent/intentEngine';
import * as responseEngine from '../response/responseEngine';
import * as sendService from './send.service';
import { incrementUsage } from '../billing/usage.service';
import { checkInboundQuota } from '../billing/quota.service';
import { resolveLanguage } from '../language/language.service';
import { logger } from '../../lib/logger';
import type { WebhookPayload } from './types';

/**
 * Main webhook processing orchestrator.
 * Implements the 14-step pipeline for inbound WhatsApp messages.
 *
 * IMPORTANT: This function must always succeed (return void).
 * WhatsApp requires a 200 response regardless of processing outcome.
 * All errors are logged internally.
 */
export async function processWebhook(payload: WebhookPayload, requestId: string): Promise<void> {
  // Step 1: Signature verification is handled by middleware (signatureVerify.ts)

  // Step 2: Parse payload
  const messages = parseWebhookPayload(payload);
  if (messages.length === 0) {
    logger.debug({ requestId }, 'No messages in webhook payload (status update or empty)');
    return;
  }

  for (const msg of messages) {
    try {
      await processInboundMessage(msg, requestId);
    } catch (err) {
      // Log but don't throw - WhatsApp must get 200
      logger.error(
        { err, requestId, waMessageId: msg.waMessageId, phoneNumberId: msg.phoneNumberId },
        'Error processing inbound message'
      );
    }
  }
}

async function processInboundMessage(
  msg: ReturnType<typeof parseWebhookPayload>[0],
  requestId: string
): Promise<void> {
  const logCtx = { requestId, waMessageId: msg.waMessageId, phoneNumberId: msg.phoneNumberId };

  // Step 3: Tenant routing
  const tenant = await tenantRouting.resolveByPhoneNumberId(msg.phoneNumberId);
  if (!tenant) {
    logger.warn(logCtx, 'No tenant found for phone_number_id, ignoring message');
    return;
  }

  const tenantId = tenant.tenantId;
  Object.assign(logCtx, { tenantId });

  // Step 4: Idempotency check
  const duplicate = await messageService.existsByWaMessageId(msg.waMessageId);
  if (duplicate) {
    logger.debug(logCtx, 'Duplicate message, skipping');
    return;
  }

  // Step 5: Customer upsert
  const customer = await customerService.upsertCustomer({
    tenantId,
    waId: msg.customerWaId,
    name: msg.customerName,
  });

  Object.assign(logCtx, { customerId: customer.id });

  // Get the message text (for text messages or interactive replies)
  const messageText = msg.text || msg.interactiveReply?.title || '';

  // Step 6 & 7: Opt-out / Opt-in detection
  if (messageText) {
    const optResult = await handleOptOutOptIn(tenantId, customer, messageText, msg, logCtx);
    if (optResult.handled) return;
  }

  // Check if customer is opted out (skip all processing)
  if (customer.optedOut) {
    logger.debug(logCtx, 'Customer opted out, ignoring message');
    return;
  }

  // Step 8: Conversation find or create + update timestamps
  const conversation = await conversationService.findOrCreate({
    tenantId,
    customerId: customer.id,
    phoneNumberId: msg.phoneNumberId,
  });

  await conversationService.onInboundMessage(conversation.id);
  Object.assign(logCtx, { conversationId: conversation.id });

  // Step 8b: Language detection/resolution (best-effort — don't fail pipeline)
  if (messageText) {
    resolveLanguage(tenantId, conversation.id, messageText).catch((err) => {
      logger.warn({ err, conversationId: conversation.id }, 'Language resolution failed');
    });
  }

  // Step 9: Inbound quota check
  const quota = await checkInboundQuota(tenantId);
  if (!quota.allowed) {
    // Store the message but escalate to agent (billing limit reached)
    await messageService.createInbound({
      tenantId,
      conversationId: conversation.id,
      customerId: customer.id,
      waMessageId: msg.waMessageId,
      type: msg.type,
      body: messageText || undefined,
      metadata: msg.rawPayload as object,
    });
    await conversationService.setNeedsAgent(conversation.id);

    // Send limit warning to customer
    const limitText =
      "We're currently experiencing high message volume. A team member will respond to you shortly.";
    try {
      await sendService.sendText({
        tenantId,
        toWaId: msg.customerWaId,
        text: limitText,
        conversationId: conversation.id,
      });
    } catch {
      // Best-effort — don't fail the pipeline
    }

    logger.warn(
      { ...logCtx, used: quota.used, limit: quota.limit },
      'Inbound quota exceeded — escalated to agent'
    );
    return;
  }

  // Track inbound usage
  await incrementUsage(tenantId, 'inboundMessagesCount');

  // Step 9b: Persist inbound message
  const inboundMsg = await messageService.createInbound({
    tenantId,
    conversationId: conversation.id,
    customerId: customer.id,
    waMessageId: msg.waMessageId,
    type: msg.type,
    body: messageText || undefined,
    metadata: msg.rawPayload as object,
  });

  // Step 10: If conversation is with agent, don't auto-reply
  if (
    conversation.status === CONVERSATION_STATUS.NEEDS_AGENT ||
    conversation.status === CONVERSATION_STATUS.AGENT
  ) {
    logger.debug(logCtx, 'Conversation is with agent, skipping bot processing');
    return;
  }

  // Step 11: Intent detection
  let intentResult = await intentEngine.detectIntent(messageText, { tenantId });

  // Handle interactive list replies (Phase 3 product selection)
  if (msg.interactiveReply?.type === 'list_reply') {
    intentResult = { intent: INTENTS.PRODUCT_INQUIRY, confidence: 0.95, extractedQuery: msg.interactiveReply.id };
  }

  // Update message with detected intent
  await messageService.updateIntent(inboundMsg.id, intentResult.intent, intentResult.confidence);
  await conversationService.updateIntent(conversation.id, intentResult.intent);

  logger.info(
    { ...logCtx, intent: intentResult.intent, confidence: intentResult.confidence },
    'Intent detected'
  );

  // Step 12: Response generation (with extractedQuery for product search)
  const response = await responseEngine.generateResponse({
    tenantId,
    conversationId: conversation.id,
    customerId: customer.id,
    customerWaId: msg.customerWaId,
    intent: intentResult.intent,
    confidence: intentResult.confidence,
    messageText,
    extractedQuery: intentResult.extractedQuery,
  });

  // Step 13: Outbound message is persisted inside responseEngine

  // Step 14: Return (200 is sent by the route handler)
  logger.info(
    { ...logCtx, replied: response.replied, handoff: response.handoff },
    'Message processed'
  );
}

/**
 * Handle opt-out ("stop") and opt-in ("start") messages.
 * Returns { handled: true } if the message was an opt-out/in and we should stop processing.
 */
async function handleOptOutOptIn(
  tenantId: string,
  customer: { id: string; waId: string; optedOut: boolean },
  text: string,
  msg: ReturnType<typeof parseWebhookPayload>[0],
  logCtx: object
): Promise<{ handled: boolean }> {
  const { matchOptOut } = await import('../intent/rules/optOutRule');
  const optResult = matchOptOut(text);

  if (!optResult) return { handled: false };

  if (optResult.intent === INTENTS.OPT_OUT && !customer.optedOut) {
    // Opt out: set flag and send confirmation
    await customerService.setOptedOut(customer.id, true);

    // Create a temporary conversation to persist the messages
    const conversation = await conversationService.findOrCreate({
      tenantId,
      customerId: customer.id,
      phoneNumberId: msg.phoneNumberId,
    });

    // Persist inbound
    await messageService.createInbound({
      tenantId,
      conversationId: conversation.id,
      customerId: customer.id,
      waMessageId: msg.waMessageId,
      type: 'text',
      body: text,
      intent: INTENTS.OPT_OUT,
    });

    // Send confirmation
    const confirmText = "You've been unsubscribed. We won't send you any more messages. Reply START to re-subscribe.";
    const sendResult = await sendService.sendText({
      tenantId,
      toWaId: customer.waId,
      text: confirmText,
      conversationId: conversation.id,
    });

    await messageService.createOutbound({
      tenantId,
      conversationId: conversation.id,
      body: confirmText,
      waMessageId: sendResult.waMessageId,
      intent: INTENTS.OPT_OUT,
    });

    logger.info({ ...logCtx }, 'Customer opted out');
    return { handled: true };
  }

  if (optResult.intent === INTENTS.OPT_IN && customer.optedOut) {
    // Opt back in
    await customerService.setOptedOut(customer.id, false);

    const conversation = await conversationService.findOrCreate({
      tenantId,
      customerId: customer.id,
      phoneNumberId: msg.phoneNumberId,
    });

    await messageService.createInbound({
      tenantId,
      conversationId: conversation.id,
      customerId: customer.id,
      waMessageId: msg.waMessageId,
      type: 'text',
      body: text,
      intent: INTENTS.OPT_IN,
    });

    const confirmText = "Welcome back! You've been re-subscribed. How can I help you today?";
    const sendResult = await sendService.sendText({
      tenantId,
      toWaId: customer.waId,
      text: confirmText,
      conversationId: conversation.id,
    });

    await messageService.createOutbound({
      tenantId,
      conversationId: conversation.id,
      body: confirmText,
      waMessageId: sendResult.waMessageId,
      intent: INTENTS.OPT_IN,
    });

    logger.info({ ...logCtx }, 'Customer opted back in');
    return { handled: true };
  }

  return { handled: false };
}
