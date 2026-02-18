import type { AIIntentProvider } from '../aiProvider.interface';
import { StubAIProvider } from '../aiProvider.interface';
import { env } from '../../../config/env';
import { logger } from '../../../lib/logger';

export function createAIProvider(): AIIntentProvider {
  switch (env.AI_PROVIDER) {
    case 'anthropic': {
      if (!env.ANTHROPIC_API_KEY) {
        logger.warn('AI_PROVIDER=anthropic but ANTHROPIC_API_KEY missing, using stub');
        return new StubAIProvider();
      }
      // Lazy import so SDK is only loaded when configured
      const { AnthropicIntentProvider } = require('./anthropicProvider');
      logger.info('AI intent provider initialized: Anthropic');
      return new AnthropicIntentProvider();
    }
    case 'openai': {
      if (!env.OPENAI_API_KEY) {
        logger.warn('AI_PROVIDER=openai but OPENAI_API_KEY missing, using stub');
        return new StubAIProvider();
      }
      const { OpenAIIntentProvider } = require('./openaiProvider');
      logger.info('AI intent provider initialized: OpenAI');
      return new OpenAIIntentProvider();
    }
    default:
      logger.info('AI intent provider: stub (disabled)');
      return new StubAIProvider();
  }
}
