import { INTENTS } from '@whatsapp-bot/shared';
import type { IntentResult } from '../aiProvider.interface';

const ORDER_TRACKING_PATTERNS = [
  /\b(where\s*(is|are)\s*my\s*order|track(ing)?|order\s*status)\b/i,
  /\b(when\s*(will|does)\s*(it|my\s*order)\s*(arrive|come|deliver|ship))\b/i,
  /\b(shipping\s*status|delivery\s*status|dispatch(ed)?)\b/i,
  /\b(order\s*#?\s*\d+|tracking\s*(number|id|code))\b/i,
  /\b(haven'?t\s*received|not\s*received|still\s*waiting)\b/i,
];

export function matchOrderTracking(text: string): IntentResult | null {
  for (const pattern of ORDER_TRACKING_PATTERNS) {
    if (pattern.test(text)) {
      return { intent: INTENTS.ORDER_STATUS, confidence: 0.85 };
    }
  }
  return null;
}
