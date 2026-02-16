// WhatsApp Cloud API webhook payload types

export interface WebhookPayload {
  object: string;
  entry: WebhookEntry[];
}

export interface WebhookEntry {
  id: string;
  changes: WebhookChange[];
}

export interface WebhookChange {
  value: WebhookValue;
  field: string;
}

export interface WebhookValue {
  messaging_product: string;
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: WebhookContact[];
  messages?: WebhookMessage[];
  statuses?: WebhookStatus[];
}

export interface WebhookContact {
  profile: { name: string };
  wa_id: string;
}

export interface WebhookMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { id: string; mime_type: string; sha256: string; caption?: string };
  interactive?: {
    type: string;
    list_reply?: { id: string; title: string; description?: string };
    button_reply?: { id: string; title: string };
  };
}

export interface WebhookStatus {
  id: string;
  status: string;
  timestamp: string;
  recipient_id: string;
}

// Parsed inbound message (normalized)
export interface ParsedInboundMessage {
  phoneNumberId: string;
  displayPhoneNumber: string;
  customerWaId: string;
  customerName: string;
  waMessageId: string;
  timestamp: string;
  type: string;
  text?: string;
  interactiveReply?: {
    type: 'list_reply' | 'button_reply';
    id: string;
    title: string;
    description?: string;
  };
  rawPayload: WebhookMessage;
}

// WhatsApp Cloud API send message types
export interface SendTextPayload {
  messaging_product: 'whatsapp';
  to: string;
  type: 'text';
  text: { body: string };
}

export interface SendInteractiveListPayload {
  messaging_product: 'whatsapp';
  to: string;
  type: 'interactive';
  interactive: {
    type: 'list';
    header?: { type: 'text'; text: string };
    body: { text: string };
    footer?: { text: string };
    action: {
      button: string;
      sections: Array<{
        title: string;
        rows: Array<{
          id: string;
          title: string;
          description?: string;
        }>;
      }>;
    };
  };
}

export interface SendProductPayload {
  messaging_product: 'whatsapp';
  to: string;
  type: 'interactive';
  interactive: {
    type: 'product';
    body: { text: string };
    action: {
      catalog_id: string;
      product_retailer_id: string;
    };
  };
}
