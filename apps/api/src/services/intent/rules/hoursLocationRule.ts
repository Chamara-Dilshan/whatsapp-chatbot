import { INTENTS } from '@whatsapp-bot/shared';
import type { IntentResult } from '../aiProvider.interface';

const HOURS_LOCATION_PATTERNS = [
  /\b(hours|open(ing)?|close?d?|business\s*hours|working\s*hours)\b/i,
  /\b(when\s*(are\s*you|do\s*you)\s*open)\b/i,
  /\b(location|address|where\s*(are\s*you|is\s*(your|the)\s*store))\b/i,
  /\b(directions|map|find\s*(you|us|the\s*store))\b/i,
  /\b(store\s*hours|shop\s*hours|timing)\b/i,
];

export function matchHoursLocation(text: string): IntentResult | null {
  for (const pattern of HOURS_LOCATION_PATTERNS) {
    if (pattern.test(text)) {
      return { intent: INTENTS.HOURS_LOCATION, confidence: 0.85 };
    }
  }
  return null;
}
