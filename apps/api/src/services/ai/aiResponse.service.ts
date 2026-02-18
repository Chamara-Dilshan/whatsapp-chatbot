import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { env } from '../../config/env';
import { checkAiQuota } from '../billing/quota.service';
import { incrementUsage } from '../billing/usage.service';
import { prisma } from '../../lib/prisma';
import { withExponentialBackoff } from '../../lib/retry.util';
import { logger } from '../../lib/logger';
import { aiRequestsTotal, aiRequestDuration } from '../../lib/metrics';

export interface AIResponseContext {
  tenantId: string;
  conversationId: string;
  customerName?: string;
  intent: string;
  messageText: string;
  conversationHistory?: string[];
}

/**
 * Generate a contextual AI response for the customer.
 * Returns null on failure so the caller can fall back to templates.
 */
export async function generateAIResponse(ctx: AIResponseContext): Promise<string | null> {
  const { tenantId, conversationId, intent, messageText, conversationHistory } = ctx;

  // Check tenant AI toggle
  const policies = await prisma.tenantPolicies.findUnique({
    where: { tenantId },
    select: {
      aiEnabled: true,
      tone: true,
      defaultLanguage: true,
      returnPolicy: true,
      shippingPolicy: true,
      businessHours: true,
    },
  });

  if (!policies?.aiEnabled) return null;

  // Check AI quota
  const quota = await checkAiQuota(tenantId);
  if (!quota.allowed) return null;

  // Get business name
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true },
  });

  // Get conversation language
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { language: true },
  });

  const language = conv?.language || policies.defaultLanguage || 'EN';
  const businessName = tenant?.name || 'our business';

  const systemPrompt = `You are a customer support assistant for ${businessName}.
Tone: ${policies.tone || 'FRIENDLY'} (FORMAL = professional language, FRIENDLY = warm and casual, SHORT = brief and direct)
Language: ${language === 'SI' ? 'Sinhala' : language === 'TA' ? 'Tamil' : 'English'}

${policies.returnPolicy ? `Return policy: ${policies.returnPolicy}` : ''}
${policies.shippingPolicy ? `Shipping policy: ${policies.shippingPolicy}` : ''}
${policies.businessHours ? `Business hours: ${JSON.stringify(policies.businessHours)}` : ''}

The customer's intent has been classified as: ${intent}

Generate a helpful, accurate response. If you don't have enough information to answer, say so and offer to connect them with a human agent.
Keep responses under 300 characters (WhatsApp messages should be concise).
Do NOT make up information about products, orders, or policies that wasn't provided.
Do NOT use markdown formatting. Use plain text only.`;

  const provider = env.AI_PROVIDER;
  const end = aiRequestDuration.startTimer({ provider, type: 'response' });

  try {
    let responseText: string | null = null;

    if (provider === 'anthropic' && env.ANTHROPIC_API_KEY) {
      responseText = await generateWithAnthropic(systemPrompt, messageText, conversationHistory);
    } else if (provider === 'openai' && env.OPENAI_API_KEY) {
      responseText = await generateWithOpenAI(systemPrompt, messageText, conversationHistory);
    }

    if (!responseText) {
      aiRequestsTotal.inc({ provider, type: 'response', status: 'error' });
      end();
      return null;
    }

    // Track AI usage
    await incrementUsage(tenantId, 'aiCallsCount');

    aiRequestsTotal.inc({ provider, type: 'response', status: 'success' });
    end();

    // Truncate to 300 chars for WhatsApp
    return responseText.length > 300 ? responseText.slice(0, 297) + '...' : responseText;
  } catch (err) {
    logger.error({ err, tenantId }, 'AI response generation failed');
    aiRequestsTotal.inc({ provider, type: 'response', status: 'error' });
    end();
    return null;
  }
}

async function generateWithAnthropic(
  systemPrompt: string,
  messageText: string,
  conversationHistory?: string[]
): Promise<string | null> {
  const client = new Anthropic({
    apiKey: env.ANTHROPIC_API_KEY,
    timeout: env.AI_TIMEOUT_MS,
  });

  const messages: Anthropic.MessageParam[] = [];
  if (conversationHistory?.length) {
    for (const msg of conversationHistory.slice(-5)) {
      messages.push({ role: 'user', content: msg });
      messages.push({ role: 'assistant', content: 'Understood.' });
    }
  }
  messages.push({ role: 'user', content: messageText });

  const response = await withExponentialBackoff(
    () =>
      client.messages.create({
        model: env.AI_MODEL || 'claude-3-5-haiku-20241022',
        max_tokens: 256,
        system: systemPrompt,
        messages,
      }),
    { maxAttempts: 2, baseDelayMs: 300 }
  );

  const content = response.content[0];
  if (content.type !== 'text') return null;

  logger.info(
    {
      provider: 'anthropic',
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
    'AI response generation completed'
  );

  return content.text;
}

async function generateWithOpenAI(
  systemPrompt: string,
  messageText: string,
  conversationHistory?: string[]
): Promise<string | null> {
  const client = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    timeout: env.AI_TIMEOUT_MS,
  });

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
  ];
  if (conversationHistory?.length) {
    for (const msg of conversationHistory.slice(-5)) {
      messages.push({ role: 'user', content: msg });
    }
  }
  messages.push({ role: 'user', content: messageText });

  const response = await withExponentialBackoff(
    () =>
      client.chat.completions.create({
        model: env.AI_MODEL || 'gpt-4o-mini',
        max_tokens: 256,
        messages,
      }),
    { maxAttempts: 2, baseDelayMs: 300 }
  );

  const content = response.choices[0]?.message?.content;
  if (!content) return null;

  logger.info(
    {
      provider: 'openai',
      promptTokens: response.usage?.prompt_tokens,
      completionTokens: response.usage?.completion_tokens,
    },
    'AI response generation completed'
  );

  return content;
}
