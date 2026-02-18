import { prisma } from '../../lib/prisma';
import { INTENTS, CONVERSATION_STATUS } from '@whatsapp-bot/shared';
import * as sendService from '../whatsapp/send.service';
import * as conversationService from '../conversation/conversation.service';
import * as messageService from '../message/message.service';
import * as productSearchService from '../product/productSearch.service';
import * as productService from '../product/product.service';
import * as caseService from '../case/case.service';
import * as automationService from '../automation/automation.service';
import { renderTemplate, buildVariables } from '../template/templateRender.service';
import type { SupportedLanguage } from '../language/language.service';
import { handleOrderStatusInquiry } from '../order/orderBot.service';
import { generateAIResponse } from '../ai/aiResponse.service';
import { logger } from '../../lib/logger';

interface ResponseContext {
  tenantId: string;
  conversationId: string;
  customerId: string;
  customerWaId: string;
  intent: string;
  confidence: number;
  messageText?: string;
  extractedQuery?: string;
  conversationHistory?: string[];
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

  // Product inquiry: search products and send interactive list or text
  if (intent === INTENTS.PRODUCT_INQUIRY || intent === INTENTS.PRICE_INQUIRY || intent === INTENTS.AVAILABILITY_STOCK) {
    return handleProductInquiry(ctx);
  }

  // Order status inquiry
  if (intent === INTENTS.ORDER_STATUS) {
    return handleOrderStatus(ctx);
  }

  // Look up reply template with language/tone fallback chain
  const template = await findTemplate(tenantId, intent, conversationId);

  let replyText: string;
  if (template) {
    replyText = await renderTemplateForConversation(template.body, tenantId, conversationId);
  } else {
    // Try AI response generation before falling back to default
    const aiReply = await generateAIResponse({
      tenantId,
      conversationId,
      intent,
      messageText: ctx.messageText || '',
      conversationHistory: ctx.conversationHistory,
    });

    replyText = aiReply || "Thanks for your message! How can I help you today? Type \"agent\" to speak with a human.";
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
 * Handle order status inquiry using orderBot service.
 */
async function handleOrderStatus(ctx: ResponseContext): Promise<ResponseResult> {
  const { tenantId, conversationId, customerWaId, extractedQuery } = ctx;

  const { replyText } = await handleOrderStatusInquiry(tenantId, customerWaId, extractedQuery);

  const sendResult = await sendService.sendText({
    tenantId,
    toWaId: customerWaId,
    text: replyText,
    conversationId,
  });

  await messageService.createOutbound({
    tenantId,
    conversationId,
    body: replyText,
    waMessageId: sendResult.waMessageId,
    intent: INTENTS.ORDER_STATUS,
  });

  await conversationService.onOutboundMessage(conversationId);

  return { replied: true, handoff: false, replyText };
}

/**
 * Handle product inquiry: search products, send interactive list or detail.
 */
async function handleProductInquiry(ctx: ResponseContext): Promise<ResponseResult> {
  const { tenantId, conversationId, customerWaId, intent, extractedQuery, messageText } = ctx;
  const query = extractedQuery || messageText || '';

  logger.info({ tenantId, conversationId, query }, 'Handling product inquiry');

  // Check if this is a specific product selection (from list_reply)
  // extractedQuery will be the retailerId when from a list_reply
  if (extractedQuery && !messageText?.includes(' ')) {
    // Try to find exact product by retailerId
    try {
      const product = await productService.getProductByRetailerId(tenantId, extractedQuery);
      const priceStr = `${product.currency} ${Number(product.price).toFixed(2)}`;
      const replyText = `*${product.name}*\n${product.description || ''}\n\nPrice: ${priceStr}\n${product.inStock ? '✅ In Stock' : '❌ Out of Stock'}`;

      // Try to send as product message (with catalog), fall back to text
      const sendResult = await sendService.sendProductMessage({
        tenantId,
        toWaId: customerWaId,
        productRetailerId: product.retailerId,
        bodyText: replyText,
      });

      await messageService.createOutbound({
        tenantId,
        conversationId,
        body: replyText,
        waMessageId: sendResult.waMessageId,
        intent,
        type: 'interactive',
        metadata: { productId: product.id, retailerId: product.retailerId },
      });

      await conversationService.onOutboundMessage(conversationId);
      return { replied: true, handoff: false, replyText };
    } catch {
      // Product not found by retailerId, fall through to search
    }
  }

  // Search products
  const { products, sections } = await productSearchService.searchProductsForWhatsApp(
    tenantId,
    query,
    10
  );

  if (products.length === 0) {
    // No products found
    const template = await prisma.replyTemplate.findFirst({
      where: { tenantId, intent: INTENTS.PRODUCT_INQUIRY, isActive: true },
      orderBy: [{ language: 'asc' }, { tone: 'asc' }],
    });

    const replyText = template?.body
      || `Sorry, I couldn't find any products matching "${query}". Could you try a different search term or type "catalog" to see all our products?`;

    const sendResult = await sendService.sendText({
      tenantId,
      toWaId: customerWaId,
      text: replyText,
      conversationId,
    });

    await messageService.createOutbound({
      tenantId,
      conversationId,
      body: replyText,
      waMessageId: sendResult.waMessageId,
      intent,
    });

    await conversationService.onOutboundMessage(conversationId);
    return { replied: true, handoff: false, replyText };
  }

  if (products.length === 1) {
    // Single product found: send product detail
    const product = products[0];
    const priceStr = `${product.currency} ${Number(product.price).toFixed(2)}`;
    const replyText = `*${product.name}*\n${product.description || ''}\n\nPrice: ${priceStr}\n${product.inStock ? '✅ In Stock' : '❌ Out of Stock'}`;

    const sendResult = await sendService.sendProductMessage({
      tenantId,
      toWaId: customerWaId,
      productRetailerId: product.retailerId,
      bodyText: replyText,
    });

    await messageService.createOutbound({
      tenantId,
      conversationId,
      body: replyText,
      waMessageId: sendResult.waMessageId,
      intent,
      type: 'interactive',
      metadata: { productId: product.id, retailerId: product.retailerId },
    });

    await conversationService.onOutboundMessage(conversationId);
    return { replied: true, handoff: false, replyText };
  }

  // Multiple products: send interactive list
  const bodyText = query
    ? `I found ${products.length} products matching "${query}". Tap below to browse:`
    : `Here are our products. Tap below to browse:`;

  const sendResult = await sendService.sendProductSelectionList({
    tenantId,
    toWaId: customerWaId,
    headerText: 'Product Results',
    bodyText,
    footerText: 'Select a product for details',
    buttonText: 'Browse Products',
    sections,
  });

  await messageService.createOutbound({
    tenantId,
    conversationId,
    body: bodyText,
    waMessageId: sendResult.waMessageId,
    intent,
    type: 'interactive',
    metadata: { productCount: products.length, query },
  });

  await conversationService.onOutboundMessage(conversationId);
  return { replied: true, handoff: false, replyText: bodyText };
}

/**
 * Handle agent handoff: update conversation status, send handoff message.
 */
async function handleHandoff(ctx: ResponseContext): Promise<ResponseResult> {
  const { tenantId, conversationId, customerWaId, intent } = ctx;

  // Set conversation to NEEDS_AGENT
  await conversationService.setNeedsAgent(conversationId);

  // Look up the handoff template with language/tone fallback chain
  const template = await findTemplate(tenantId, INTENTS.SPEAK_TO_HUMAN, conversationId);
  const rawHandoffText = template?.body || "I'm connecting you with a human agent. Please hold on, someone will be with you shortly.";
  const handoffText = template
    ? await renderTemplateForConversation(rawHandoffText, tenantId, conversationId)
    : rawHandoffText;

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

  // Create a case for this handoff
  const priority = intent === INTENTS.COMPLAINT ? 'high' : 'medium';
  const caseRecord = await caseService.createCase({
    tenantId,
    conversationId,
    priority,
    tags: [intent],
  });

  // Create automation event for handoff notification
  await automationService.createAutomationEvent({
    tenantId,
    eventType: 'case_created',
    payload: {
      caseId: caseRecord.id,
      conversationId,
      priority,
      customerId: ctx.customerId,
      customerWaId: ctx.customerWaId,
      intent,
    },
  });

  // Create high-priority alert if it's a complaint
  if (priority === 'high') {
    await automationService.createAutomationEvent({
      tenantId,
      eventType: 'high_priority_case',
      payload: {
        caseId: caseRecord.id,
        conversationId,
        priority,
        reason: 'Complaint detected',
      },
    });
  }

  return { replied: true, handoff: true, replyText: handoffText };
}

// ── Language/Tone helpers ─────────────────────────────────────────────────

/**
 * Find the best matching template for a given intent + conversation language/tone.
 * Fallback chain: (lang, tone) → (EN, tone) → (lang, FRIENDLY) → (EN, FRIENDLY) → any active
 */
async function findTemplate(tenantId: string, intent: string, conversationId: string) {
  // Get conversation language and tenant tone preference
  const [conv, policies] = await Promise.all([
    prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { language: true },
    }),
    prisma.tenantPolicies.findUnique({
      where: { tenantId },
      select: { tone: true },
    }),
  ]);

  const lang = (conv?.language as SupportedLanguage) ?? 'EN';
  const tone = policies?.tone ?? 'FRIENDLY';

  // Ordered fallback candidates
  const candidates = [
    { language: lang, tone },
    { language: 'EN', tone },
    { language: lang, tone: 'FRIENDLY' },
    { language: 'EN', tone: 'FRIENDLY' },
  ];

  for (const candidate of candidates) {
    const t = await prisma.replyTemplate.findUnique({
      where: {
        tenantId_intent_language_tone: {
          tenantId,
          intent,
          language: candidate.language,
          tone: candidate.tone,
        },
      },
    });
    if (t && t.isActive) return t;
  }

  // Last resort: any active template for this intent
  return prisma.replyTemplate.findFirst({
    where: { tenantId, intent, isActive: true },
  });
}

/**
 * Render a template body with variables sourced from conversation/tenant context.
 */
async function renderTemplateForConversation(
  body: string,
  tenantId: string,
  conversationId: string
): Promise<string> {
  const [tenant, policies, conv] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
    prisma.tenantPolicies.findUnique({
      where: { tenantId },
      select: { timezone: true, shippingPolicy: true, returnPolicy: true, businessHours: true },
    }),
    prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { customer: { select: { name: true } } },
    }),
  ]);

  const variables = buildVariables({
    customerName: conv?.customer?.name,
    businessName: tenant?.name ?? '',
    timezone: policies?.timezone ?? 'UTC',
    shippingPolicy: policies?.shippingPolicy,
    returnPolicy: policies?.returnPolicy,
    businessHours: policies?.businessHours as Record<string, { open: string; close: string }> | null,
  });

  return renderTemplate(body, variables);
}
