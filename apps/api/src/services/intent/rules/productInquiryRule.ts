import { INTENTS } from '@whatsapp-bot/shared';
import type { IntentResult } from '../aiProvider.interface';

const PRODUCT_INQUIRY_PATTERNS = [
  /\b(price|cost|how\s*much)\b/i,
  /\b(do\s*you\s*(have|sell|carry|stock)|available|in\s*stock)\b/i,
  /\b(looking\s*for|interested\s*in|want\s*to\s*buy|need\s*a)\b/i,
  /\b(product|item|catalog(ue)?|collection)\b/i,
  /\b(show\s*me|tell\s*me\s*about|info\s*(about|on))\b/i,
  /\b(what\s*do\s*you\s*(sell|offer|have))\b/i,
  /\b(buy|purchase|order)\b/i,
];

/**
 * Extract a potential product search query from the message.
 * Strips common question prefixes to get the product name/description.
 */
export function extractProductQuery(text: string): string {
  let query = text.trim();

  // Remove common prefixes
  const prefixes = [
    /^(do\s*you\s*(have|sell|carry|stock)\s*)/i,
    /^(i('?m|\s*am)\s*(looking\s*for|interested\s*in)\s*)/i,
    /^(how\s*much\s*(is|does|for)\s*(a|the|an)?\s*)/i,
    /^(what('?s| is)\s*the\s*(price|cost)\s*(of|for)\s*)/i,
    /^(show\s*me\s*(the|a|your)?\s*)/i,
    /^(tell\s*me\s*about\s*(the|a|your)?\s*)/i,
    /^(can\s*i\s*(get|buy|have|order)\s*(a|an|the|some)?\s*)/i,
    /^(i\s*(want|need)\s*(a|an|the|some|to\s*buy)?\s*)/i,
  ];

  for (const prefix of prefixes) {
    query = query.replace(prefix, '');
  }

  // Remove trailing question marks and trim
  query = query.replace(/\?+$/, '').trim();

  return query;
}

export function matchProductInquiry(text: string): IntentResult | null {
  for (const pattern of PRODUCT_INQUIRY_PATTERNS) {
    if (pattern.test(text)) {
      return {
        intent: INTENTS.PRODUCT_INQUIRY,
        confidence: 0.7,
        extractedQuery: extractProductQuery(text),
      };
    }
  }
  return null;
}
