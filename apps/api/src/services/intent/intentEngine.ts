import { INTENTS } from '@whatsapp-bot/shared';
import type { IntentResult, AIIntentProvider } from './aiProvider.interface';
import { StubAIProvider } from './aiProvider.interface';
import { matchGreeting } from './rules/greetingRule';
import { matchRefundCancel } from './rules/refundCancelRule';
import { matchOrderTracking } from './rules/orderTrackingRule';
import { matchHoursLocation } from './rules/hoursLocationRule';
import { matchAgentRequest } from './rules/agentRequestRule';
import { matchComplaint } from './rules/complaintRule';
import { matchOptOut } from './rules/optOutRule';
import { matchProductInquiry } from './rules/productInquiryRule';
import { checkAiQuota } from '../billing/quota.service';
import { incrementUsage } from '../billing/usage.service';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';

// Rule matchers in priority order
const RULE_MATCHERS = [
  matchOptOut,         // Highest priority: opt-out/opt-in
  matchAgentRequest,   // Human escalation
  matchComplaint,      // Complaint detection
  matchGreeting,       // Greetings
  matchRefundCancel,   // Refund/cancel requests
  matchOrderTracking,  // Order tracking
  matchHoursLocation,  // Business hours / location
  matchProductInquiry, // Product inquiries (lowest rule priority, broadest match)
];

const CONFIDENCE_THRESHOLD = 0.5;

// AI provider instance (swap this out for a real provider)
let aiProvider: AIIntentProvider = new StubAIProvider();

export function setAIProvider(provider: AIIntentProvider): void {
  aiProvider = provider;
}

/**
 * Detect intent from message text.
 * Pipeline: rules-first, AI fallback for low confidence.
 */
export async function detectIntent(
  text: string,
  context?: { tenantId?: string; conversationHistory?: string[] }
): Promise<IntentResult> {
  if (!text || text.trim().length === 0) {
    return { intent: INTENTS.OTHER, confidence: 0 };
  }

  // 1. Run rule-based matchers in order
  for (const matcher of RULE_MATCHERS) {
    const result = matcher(text);
    if (result && result.confidence >= CONFIDENCE_THRESHOLD) {
      logger.debug({ intent: result.intent, confidence: result.confidence }, 'Intent matched by rule');
      return result;
    }
  }

  // 2. AI fallback for unmatched or low-confidence
  if (context?.tenantId) {
    // Check tenant AI toggle
    const policies = await prisma.tenantPolicies.findUnique({
      where: { tenantId: context.tenantId },
      select: { aiEnabled: true },
    });

    if (!policies?.aiEnabled) {
      logger.debug({ tenantId: context.tenantId }, 'AI disabled for tenant, skipping AI fallback');
      return { intent: INTENTS.OTHER, confidence: 0.1 };
    }

    // Check AI quota
    const quota = await checkAiQuota(context.tenantId);
    if (!quota.allowed) {
      logger.debug(
        { tenantId: context.tenantId, used: quota.used, limit: quota.limit },
        'AI quota exhausted, skipping AI fallback'
      );
      return { intent: INTENTS.OTHER, confidence: 0.1 };
    }
  }

  try {
    const aiResult = await aiProvider.detectIntent(text, context);
    logger.debug({ intent: aiResult.intent, confidence: aiResult.confidence }, 'Intent from AI provider');

    // Track AI usage
    if (context?.tenantId) {
      await incrementUsage(context.tenantId, 'aiCallsCount');
    }

    if (aiResult.confidence >= CONFIDENCE_THRESHOLD) {
      return aiResult;
    }
  } catch (err) {
    logger.error({ err }, 'AI intent provider failed');
  }

  // 3. Default fallback
  return { intent: INTENTS.OTHER, confidence: 0.1 };
}

/**
 * Check if an intent should trigger agent handoff.
 */
export function shouldHandoff(intent: string, confidence: number): boolean {
  // Always hand off for these intents
  if (intent === INTENTS.SPEAK_TO_HUMAN) return true;
  if (intent === INTENTS.COMPLAINT) return true;

  // Hand off if confidence is too low (uncertain)
  if (confidence < 0.3 && intent === INTENTS.OTHER) return true;

  return false;
}
