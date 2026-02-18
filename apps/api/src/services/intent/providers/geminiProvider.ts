import { GoogleGenerativeAI } from '@google/generative-ai';
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

export class GeminiIntentProvider implements AIIntentProvider {
  private client: GoogleGenerativeAI;
  private modelName: string;

  constructor() {
    this.client = new GoogleGenerativeAI(env.GEMINI_API_KEY!);
    this.modelName = env.AI_MODEL || 'gemini-2.0-flash';
  }

  async detectIntent(
    text: string,
    context?: { tenantId?: string; conversationHistory?: string[] }
  ): Promise<IntentResult> {
    const end = aiRequestDuration.startTimer({ provider: 'gemini', type: 'intent' });

    try {
      const model = this.client.getGenerativeModel({
        model: this.modelName,
        systemInstruction: SYSTEM_PROMPT,
      });

      // Build conversation history
      const history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
      if (context?.conversationHistory?.length) {
        const recent = context.conversationHistory.slice(-3);
        for (const msg of recent) {
          history.push({ role: 'user', parts: [{ text: msg }] });
          history.push({ role: 'model', parts: [{ text: 'Understood.' }] });
        }
      }

      const chat = model.startChat({ history });

      const response = await withExponentialBackoff(
        () => chat.sendMessage(text),
        { maxAttempts: 2, baseDelayMs: 300 }
      );

      const content = response.response.text();
      if (!content) {
        aiRequestsTotal.inc({ provider: 'gemini', type: 'intent', status: 'error' });
        return { intent: 'other', confidence: 0.1 };
      }

      // Extract JSON from response (Gemini may wrap in markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        aiRequestsTotal.inc({ provider: 'gemini', type: 'intent', status: 'error' });
        return { intent: 'other', confidence: 0.1 };
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const intent = VALID_INTENTS.includes(parsed.intent) ? parsed.intent : 'other';
      const confidence = Math.min(1, Math.max(0, Number(parsed.confidence) || 0.1));

      // Log token usage if available
      const usageMetadata = response.response.usageMetadata;
      logger.info(
        {
          provider: 'gemini',
          model: this.modelName,
          promptTokens: usageMetadata?.promptTokenCount,
          completionTokens: usageMetadata?.candidatesTokenCount,
          intent,
          confidence,
        },
        'AI intent detection completed'
      );

      aiRequestsTotal.inc({ provider: 'gemini', type: 'intent', status: 'success' });
      end();

      return {
        intent,
        confidence,
        extractedQuery: parsed.extractedQuery || undefined,
      };
    } catch (err) {
      aiRequestsTotal.inc({ provider: 'gemini', type: 'intent', status: 'error' });
      end();
      throw err;
    }
  }
}
