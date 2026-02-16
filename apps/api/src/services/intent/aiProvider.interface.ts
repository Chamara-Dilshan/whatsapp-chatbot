/**
 * Interface for AI-based intent detection providers.
 * Implement this with OpenAI, Claude, or any other LLM.
 * The intent engine falls back to this when rules don't match with high confidence.
 */
export interface IntentResult {
  intent: string;
  confidence: number;
  extractedQuery?: string; // e.g., product name extracted from message
}

export interface AIIntentProvider {
  detectIntent(text: string, context?: { tenantId?: string; conversationHistory?: string[] }): Promise<IntentResult>;
}

/**
 * Stub AI provider - always returns 'other' with low confidence.
 * Replace with a real implementation (OpenAI, Claude, etc.) when ready.
 */
export class StubAIProvider implements AIIntentProvider {
  async detectIntent(text: string): Promise<IntentResult> {
    // Placeholder: In production, call an LLM API here
    return {
      intent: 'other',
      confidence: 0.1,
      extractedQuery: text,
    };
  }
}
