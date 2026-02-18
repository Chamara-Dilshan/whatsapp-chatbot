import Anthropic from '@anthropic-ai/sdk';
import type { AIIntentProvider, IntentResult } from '../aiProvider.interface';
import { INTENTS } from '@whatsapp-bot/shared';
import { withExponentialBackoff } from '../../../lib/retry.util';
import { logger } from '../../../lib/logger';
import { env } from '../../../config/env';
import { aiRequestsTotal, aiRequestDuration } from '../../../lib/metrics';

const VALID_INTENTS = Object.values(INTENTS);

const SYSTEM_PROMPT = `You are an intent classifier for a WhatsApp customer support chatbot.
Classify the customer message into exactly one intent from this list:
${VALID_INTENTS.join(', ')}

Rules:
- greeting: Hi, hello, good morning, etc.
- product_inquiry: asking about products, catalog, items
- price_inquiry: asking about price specifically
- availability_stock: asking if something is in stock
- order_status: asking about order tracking, delivery status
- delivery_info: asking about shipping/delivery times or policies
- refund_cancel: requesting refund, return, or cancellation
- complaint: expressing dissatisfaction, anger, problem
- hours_location: asking about business hours or location
- speak_to_human: requesting a human agent
- opt_out: wanting to unsubscribe
- opt_in: wanting to re-subscribe
- other: none of the above

Respond with ONLY a JSON object: {"intent":"<intent>","confidence":<0.0-1.0>,"extractedQuery":"<relevant entity or search term if any>"}
Do not include any other text.`;

export class AnthropicIntentProvider implements AIIntentProvider {
  private client: Anthropic;
  private model: string;

  constructor() {
    this.client = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY,
      timeout: env.AI_TIMEOUT_MS,
    });
    this.model = env.AI_MODEL || 'claude-3-5-haiku-20241022';
  }

  async detectIntent(
    text: string,
    context?: { tenantId?: string; conversationHistory?: string[] }
  ): Promise<IntentResult> {
    const end = aiRequestDuration.startTimer({ provider: 'anthropic', type: 'intent' });

    try {
      const messages: Anthropic.MessageParam[] = [];

      // Include last 3 conversation messages for context
      if (context?.conversationHistory?.length) {
        const recent = context.conversationHistory.slice(-3);
        for (const msg of recent) {
          messages.push({ role: 'user', content: msg });
          messages.push({ role: 'assistant', content: 'Understood.' });
        }
      }
      messages.push({ role: 'user', content: text });

      const response = await withExponentialBackoff(
        () =>
          this.client.messages.create({
            model: this.model,
            max_tokens: 256,
            system: SYSTEM_PROMPT,
            messages,
          }),
        { maxAttempts: 2, baseDelayMs: 300 }
      );

      const content = response.content[0];
      if (content.type !== 'text') {
        aiRequestsTotal.inc({ provider: 'anthropic', type: 'intent', status: 'error' });
        return { intent: 'other', confidence: 0.1 };
      }

      const parsed = JSON.parse(content.text);
      const intent = VALID_INTENTS.includes(parsed.intent) ? parsed.intent : 'other';
      const confidence = Math.min(1, Math.max(0, Number(parsed.confidence) || 0.1));

      logger.info(
        {
          provider: 'anthropic',
          model: this.model,
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          intent,
          confidence,
        },
        'AI intent detection completed'
      );

      aiRequestsTotal.inc({ provider: 'anthropic', type: 'intent', status: 'success' });
      end();

      return {
        intent,
        confidence,
        extractedQuery: parsed.extractedQuery || undefined,
      };
    } catch (err) {
      aiRequestsTotal.inc({ provider: 'anthropic', type: 'intent', status: 'error' });
      end();
      throw err;
    }
  }
}
