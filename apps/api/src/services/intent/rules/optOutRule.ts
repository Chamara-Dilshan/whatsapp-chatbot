import { INTENTS } from '@whatsapp-bot/shared';
import type { IntentResult } from '../aiProvider.interface';

const OPT_OUT_PATTERNS = [
  /^(stop|unsubscribe|opt\s*out|quit)$/i,
  /\b(don'?t\s*message\s*me|stop\s*(messaging|texting|contacting)\s*me)\b/i,
  /\b(remove\s*me|take\s*me\s*off|leave\s*me\s*alone)\b/i,
];

const OPT_IN_PATTERNS = [
  /^(start|subscribe|opt\s*in)$/i,
  /\b(start\s*messaging|subscribe\s*again|opt\s*back\s*in)\b/i,
];

export function matchOptOut(text: string): IntentResult | null {
  const trimmed = text.trim();

  for (const pattern of OPT_IN_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { intent: INTENTS.OPT_IN, confidence: 0.95 };
    }
  }

  for (const pattern of OPT_OUT_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { intent: INTENTS.OPT_OUT, confidence: 0.95 };
    }
  }

  return null;
}
