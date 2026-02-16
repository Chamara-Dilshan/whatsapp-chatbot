import { INTENTS } from '@whatsapp-bot/shared';
import type { IntentResult } from '../aiProvider.interface';

const GREETING_PATTERNS = [
  /^(hi|hello|hey|hola|good\s*(morning|afternoon|evening|day)|howdy|greetings|sup|what'?s?\s*up)/i,
  /^(yo|hii+|helloo+|heyy+)\b/i,
];

export function matchGreeting(text: string): IntentResult | null {
  const trimmed = text.trim();
  for (const pattern of GREETING_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { intent: INTENTS.GREETING, confidence: 0.9 };
    }
  }
  return null;
}
