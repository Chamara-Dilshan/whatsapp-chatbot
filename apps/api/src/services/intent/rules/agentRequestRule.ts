import { INTENTS } from '@whatsapp-bot/shared';
import type { IntentResult } from '../aiProvider.interface';

const AGENT_REQUEST_PATTERNS = [
  /\b(agent|human|person|real\s*person|live\s*(agent|chat|person))\b/i,
  /\b(speak|talk|connect)\s*(to|with)\s*(a\s*)?(human|agent|person|someone|representative)\b/i,
  /\b(customer\s*(service|support|care)|support\s*team)\b/i,
  /\b(need\s*help|help\s*me|can\s*someone\s*help)\b/i,
  /\b(operator|manager|supervisor)\b/i,
];

export function matchAgentRequest(text: string): IntentResult | null {
  for (const pattern of AGENT_REQUEST_PATTERNS) {
    if (pattern.test(text)) {
      return { intent: INTENTS.SPEAK_TO_HUMAN, confidence: 0.95 };
    }
  }
  return null;
}
