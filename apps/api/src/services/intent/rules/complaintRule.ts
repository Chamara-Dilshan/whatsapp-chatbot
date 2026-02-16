import { INTENTS } from '@whatsapp-bot/shared';
import type { IntentResult } from '../aiProvider.interface';

const COMPLAINT_PATTERNS = [
  /\b(complain(t|ing)?|terrible|horrible|awful|worst|unacceptable)\b/i,
  /\b(angry|furious|disgusted|frustrated|disappointed|upset)\b/i,
  /\b(rip\s*off|scam(med)?|fraud|cheat(ed)?|lied|lying)\b/i,
  /\b(broken|damaged|defective|wrong\s*(item|product|order))\b/i,
  /\b(never\s*(again|buying)|report|sue|lawyer|legal)\b/i,
  /\b(this\s*is\s*(ridiculous|absurd|outrageous|unbelievable))\b/i,
];

export function matchComplaint(text: string): IntentResult | null {
  for (const pattern of COMPLAINT_PATTERNS) {
    if (pattern.test(text)) {
      return { intent: INTENTS.COMPLAINT, confidence: 0.8 };
    }
  }
  return null;
}
