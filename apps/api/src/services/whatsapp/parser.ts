import type { WebhookPayload, ParsedInboundMessage } from './types';
import { logger } from '../../lib/logger';

/**
 * Parse a WhatsApp webhook payload and extract messages.
 * Returns an array of parsed inbound messages (usually 0 or 1).
 */
export function parseWebhookPayload(payload: WebhookPayload): ParsedInboundMessage[] {
  const results: ParsedInboundMessage[] = [];

  if (payload.object !== 'whatsapp_business_account') {
    logger.warn({ object: payload.object }, 'Unexpected webhook object type');
    return results;
  }

  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== 'messages') continue;

      const value = change.value;
      if (!value.messages || value.messages.length === 0) continue;

      const phoneNumberId = value.metadata.phone_number_id;
      const displayPhoneNumber = value.metadata.display_phone_number;
      const contacts = value.contacts || [];

      for (const message of value.messages) {
        const contact = contacts.find((c) => c.wa_id === message.from) || contacts[0];

        let text: string | undefined;
        if (message.type === 'text' && message.text) {
          text = message.text.body;
        }

        let interactiveReply: ParsedInboundMessage['interactiveReply'];
        if (message.type === 'interactive' && message.interactive) {
          if (message.interactive.list_reply) {
            interactiveReply = {
              type: 'list_reply',
              id: message.interactive.list_reply.id,
              title: message.interactive.list_reply.title,
              description: message.interactive.list_reply.description,
            };
          } else if (message.interactive.button_reply) {
            interactiveReply = {
              type: 'button_reply',
              id: message.interactive.button_reply.id,
              title: message.interactive.button_reply.title,
            };
          }
        }

        results.push({
          phoneNumberId,
          displayPhoneNumber,
          customerWaId: message.from,
          customerName: contact?.profile?.name || message.from,
          waMessageId: message.id,
          timestamp: message.timestamp,
          type: message.type,
          text,
          interactiveReply,
          rawPayload: message,
        });
      }
    }
  }

  return results;
}

/**
 * Extract phone_number_id from raw JSON buffer (minimal parsing for signature verification).
 */
export function extractPhoneNumberIdFromRaw(rawBody: Buffer): string | null {
  try {
    const str = rawBody.toString('utf8');
    // Quick regex to avoid full JSON parse
    const match = str.match(/"phone_number_id"\s*:\s*"([^"]+)"/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
