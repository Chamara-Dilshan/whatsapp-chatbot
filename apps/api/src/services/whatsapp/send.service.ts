import { prisma } from '../../lib/prisma';
import { decrypt } from '../../lib/crypto.util';
import { logger } from '../../lib/logger';
import type { SendTextPayload, SendInteractiveListPayload, SendProductPayload } from './types';

const GRAPH_API_VERSION = 'v20.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

interface TenantWaConfig {
  phoneNumberId: string;
  accessToken: string;
  catalogId: string | null;
}

async function getTenantConfig(tenantId: string): Promise<TenantWaConfig> {
  const tenantWa = await prisma.tenantWhatsApp.findFirst({
    where: { tenantId, isActive: true },
    select: { phoneNumberId: true, accessTokenEnc: true, catalogId: true },
  });

  if (!tenantWa) {
    throw new Error(`No active WhatsApp connection for tenant ${tenantId}`);
  }

  return {
    phoneNumberId: tenantWa.phoneNumberId,
    accessToken: decrypt(tenantWa.accessTokenEnc),
    catalogId: tenantWa.catalogId,
  };
}

async function callWhatsAppAPI(phoneNumberId: string, accessToken: string, body: object): Promise<{ success: boolean; waMessageId?: string; error?: string }> {
  const url = `${GRAPH_API_BASE}/${phoneNumberId}/messages`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json() as Record<string, unknown>;

    if (!response.ok) {
      const error = data.error as Record<string, unknown> | undefined;
      const errorMsg = error?.message as string || `HTTP ${response.status}`;
      logger.error({ phoneNumberId, status: response.status, error: data.error }, 'WhatsApp API error');
      return { success: false, error: errorMsg };
    }

    const messages = data.messages as Array<{ id: string }> | undefined;
    const waMessageId = messages?.[0]?.id;
    logger.info({ phoneNumberId, waMessageId }, 'WhatsApp message sent');
    return { success: true, waMessageId };
  } catch (err) {
    logger.error({ err, phoneNumberId }, 'Failed to call WhatsApp API');
    return { success: false, error: String(err) };
  }
}

/**
 * Check 24-hour messaging window.
 * If the window has expired, free-form messages are blocked (only templates allowed).
 */
function checkMessageWindow(windowExpiresAt: Date | null): boolean {
  if (!windowExpiresAt) return false;
  return new Date() < windowExpiresAt;
}

/**
 * Send a text message via WhatsApp Cloud API.
 */
export async function sendText(params: {
  tenantId: string;
  toWaId: string;
  text: string;
  conversationId?: string;
  isTemplate?: boolean;
}): Promise<{ success: boolean; waMessageId?: string; error?: string }> {
  const { tenantId, toWaId, text, conversationId, isTemplate } = params;

  // 24h window check (if we have a conversation)
  if (conversationId && !isTemplate) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { windowExpiresAt: true },
    });

    if (conversation && !checkMessageWindow(conversation.windowExpiresAt)) {
      logger.warn({ tenantId, conversationId, toWaId }, '24h messaging window expired. Use template message.');
      // Structure for template-only mode after 24h:
      // In production, you would send a pre-approved template instead.
      // For now, we log and block.
      return { success: false, error: '24h messaging window expired. Template message required.' };
    }
  }

  const config = await getTenantConfig(tenantId);

  const payload: SendTextPayload = {
    messaging_product: 'whatsapp',
    to: toWaId,
    type: 'text',
    text: { body: text },
  };

  return callWhatsAppAPI(config.phoneNumberId, config.accessToken, payload);
}

/**
 * Send an interactive list message via WhatsApp.
 */
export async function sendInteractiveList(params: {
  tenantId: string;
  toWaId: string;
  bodyText: string;
  buttonText: string;
  sections: Array<{
    title: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  }>;
}): Promise<{ success: boolean; waMessageId?: string; error?: string }> {
  const config = await getTenantConfig(params.tenantId);

  const payload: SendInteractiveListPayload = {
    messaging_product: 'whatsapp',
    to: params.toWaId,
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: params.bodyText },
      action: {
        button: params.buttonText,
        sections: params.sections,
      },
    },
  };

  return callWhatsAppAPI(config.phoneNumberId, config.accessToken, payload);
}

/**
 * Send a single product message via WhatsApp catalog.
 * Falls back to a text message with product details if no catalog is configured.
 */
export async function sendProductMessage(params: {
  tenantId: string;
  toWaId: string;
  catalogId?: string;
  productRetailerId: string;
  bodyText: string;
}): Promise<{ success: boolean; waMessageId?: string; error?: string }> {
  const config = await getTenantConfig(params.tenantId);
  const catalogId = params.catalogId || config.catalogId;

  if (!catalogId) {
    // Fallback: send as text if no catalog configured
    return sendText({
      tenantId: params.tenantId,
      toWaId: params.toWaId,
      text: params.bodyText,
    });
  }

  const payload: SendProductPayload = {
    messaging_product: 'whatsapp',
    to: params.toWaId,
    type: 'interactive',
    interactive: {
      type: 'product',
      body: { text: params.bodyText },
      action: {
        catalog_id: catalogId,
        product_retailer_id: params.productRetailerId,
      },
    },
  };

  return callWhatsAppAPI(config.phoneNumberId, config.accessToken, payload);
}

/**
 * Send a multi-product selection list via WhatsApp interactive list message.
 * Users can pick from a scrollable list which triggers a list_reply webhook.
 */
export async function sendProductSelectionList(params: {
  tenantId: string;
  toWaId: string;
  headerText?: string;
  bodyText: string;
  footerText?: string;
  buttonText?: string;
  sections: Array<{
    title: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  }>;
}): Promise<{ success: boolean; waMessageId?: string; error?: string }> {
  const config = await getTenantConfig(params.tenantId);

  // WhatsApp interactive list limits:
  // Max 10 rows total, 10 sections, row title 24 chars, description 72 chars
  const interactive: Record<string, unknown> = {
    type: 'list',
    body: { text: params.bodyText.substring(0, 1024) },
    action: {
      button: (params.buttonText || 'View Products').substring(0, 20),
      sections: params.sections.map((section) => ({
        title: section.title.substring(0, 24),
        rows: section.rows.map((row) => ({
          id: row.id.substring(0, 200),
          title: row.title.substring(0, 24),
          description: row.description?.substring(0, 72),
        })),
      })),
    },
  };

  if (params.headerText) {
    interactive.header = { type: 'text', text: params.headerText.substring(0, 60) };
  }
  if (params.footerText) {
    interactive.footer = { text: params.footerText.substring(0, 60) };
  }

  const payload = {
    messaging_product: 'whatsapp',
    to: params.toWaId,
    type: 'interactive',
    interactive,
  };

  return callWhatsAppAPI(config.phoneNumberId, config.accessToken, payload);
}
