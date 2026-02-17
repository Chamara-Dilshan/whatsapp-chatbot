/**
 * Language detection and resolution service.
 *
 * Supported languages:
 * - EN (English)   — default
 * - SI (Sinhala)   — Unicode block U+0D80–U+0DFF
 * - TA (Tamil)     — Unicode block U+0B80–U+0BFF
 *
 * Resolution order:
 * 1. Customer explicit keyword override ("english" / "සිංහල" / "தமிழ்")
 * 2. autoDetectLanguage: true → Unicode detection
 * 3. Tenant defaultLanguage (from TenantPolicies)
 * 4. Falls back to "EN"
 */

import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';

export type SupportedLanguage = 'EN' | 'SI' | 'TA';

const SINHALA_RANGE = /[\u0D80-\u0DFF]/g;
const TAMIL_RANGE = /[\u0B80-\u0BFF]/g;
const UNICODE_THRESHOLD = 3; // Minimum script chars to trigger detection

// Customer keyword overrides (case-insensitive for Latin)
const OPT_KEYWORDS: Record<SupportedLanguage, string[]> = {
  EN: ['english', 'in english', 'speak english'],
  SI: ['සිංහල', 'sinhala', 'in sinhala'],
  TA: ['தமிழ்', 'tamil', 'in tamil'],
};

/**
 * Detect language from raw message text using Unicode ranges.
 * Returns null if detection is inconclusive (falls back to tenant default).
 */
export function detectLanguage(text: string): SupportedLanguage | null {
  const sinhalaChars = (text.match(SINHALA_RANGE) ?? []).length;
  const tamilChars = (text.match(TAMIL_RANGE) ?? []).length;

  if (sinhalaChars >= UNICODE_THRESHOLD && sinhalaChars > tamilChars) return 'SI';
  if (tamilChars >= UNICODE_THRESHOLD && tamilChars > sinhalaChars) return 'TA';

  return null;
}

/**
 * Check if the message contains an explicit language switch keyword.
 */
function extractKeywordLanguage(text: string): SupportedLanguage | null {
  const lower = text.toLowerCase();
  for (const [lang, keywords] of Object.entries(OPT_KEYWORDS) as [SupportedLanguage, string[]][]) {
    if (keywords.some((kw) => lower.includes(kw))) return lang;
  }
  return null;
}

/**
 * Resolve the effective language for a conversation message.
 *
 * Stores the resolved language to Conversation.language in the DB.
 *
 * @returns The resolved language code (EN | SI | TA)
 */
export async function resolveLanguage(
  tenantId: string,
  conversationId: string,
  messageText: string
): Promise<SupportedLanguage> {
  // Load policies for tenant defaults
  const policies = await prisma.tenantPolicies.findUnique({
    where: { tenantId },
    select: { defaultLanguage: true, autoDetectLanguage: true },
  });

  const tenantDefault = (policies?.defaultLanguage as SupportedLanguage) ?? 'EN';
  const autoDetect = policies?.autoDetectLanguage ?? false;

  // 1. Explicit keyword from customer
  const keywordLang = extractKeywordLanguage(messageText);
  if (keywordLang) {
    await persistLanguage(conversationId, keywordLang);
    logger.debug({ conversationId, language: keywordLang }, 'Language set by customer keyword');
    return keywordLang;
  }

  // 2. Auto-detect from Unicode if enabled
  if (autoDetect) {
    const detected = detectLanguage(messageText);
    if (detected) {
      await persistLanguage(conversationId, detected);
      logger.debug({ conversationId, language: detected }, 'Language auto-detected');
      return detected;
    }
  }

  // 3. Check existing conversation language (sticky after first detection)
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { language: true },
  });
  if (conversation?.language) {
    return conversation.language as SupportedLanguage;
  }

  // 4. Fall back to tenant default
  await persistLanguage(conversationId, tenantDefault);
  return tenantDefault;
}

async function persistLanguage(conversationId: string, language: SupportedLanguage): Promise<void> {
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { language },
  });
}
