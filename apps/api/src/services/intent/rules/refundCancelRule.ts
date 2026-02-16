import { INTENTS } from '@whatsapp-bot/shared';
import type { IntentResult } from '../aiProvider.interface';

const REFUND_CANCEL_PATTERNS = [
  /\b(refund|return|money\s*back|get\s*my\s*money)\b/i,
  /\b(cancel|cancellation|cancel\s*my\s*order)\b/i,
  /\b(exchange|swap|replace)\b/i,
  /\b(don'?t\s*want|changed?\s*my\s*mind)\b/i,
];

export function matchRefundCancel(text: string): IntentResult | null {
  for (const pattern of REFUND_CANCEL_PATTERNS) {
    if (pattern.test(text)) {
      return { intent: INTENTS.REFUND_CANCEL, confidence: 0.85 };
    }
  }
  return null;
}
