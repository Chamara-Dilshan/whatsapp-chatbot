import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import * as automationService from './automation.service';

/**
 * Automation event dispatcher.
 * Polls for pending events and dispatches them to n8n webhook.
 */
export class AutomationDispatcher {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Start the dispatcher with a polling interval (in seconds).
   */
  start(intervalSeconds = 30) {
    if (this.isRunning) {
      logger.warn('Dispatcher already running');
      return;
    }

    if (!env.N8N_WEBHOOK_URL) {
      logger.warn('N8N_WEBHOOK_URL not configured, dispatcher will not start');
      return;
    }

    this.isRunning = true;
    logger.info({ intervalSeconds }, 'Starting automation dispatcher');

    // Run immediately
    this.processEvents().catch((err) => {
      logger.error({ err }, 'Error in initial dispatcher run');
    });

    // Then run on interval
    this.intervalId = setInterval(() => {
      this.processEvents().catch((err) => {
        logger.error({ err }, 'Error in dispatcher interval');
      });
    }, intervalSeconds * 1000);
  }

  /**
   * Stop the dispatcher.
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info('Automation dispatcher stopped');
  }

  /**
   * Process pending events.
   */
  private async processEvents() {
    try {
      const events = await automationService.getPendingEvents(50);

      if (events.length === 0) {
        return;
      }

      logger.info({ count: events.length }, 'Processing pending automation events');

      // Process events in parallel with concurrency limit
      const concurrency = 5;
      for (let i = 0; i < events.length; i += concurrency) {
        const batch = events.slice(i, i + concurrency);
        await Promise.all(batch.map((event) => this.dispatchEvent(event)));
      }
    } catch (error) {
      logger.error({ error }, 'Error processing automation events');
    }
  }

  /**
   * Dispatch a single event to n8n.
   */
  private async dispatchEvent(event: any) {
    const { id, eventType, payload, tenantId } = event;

    try {
      logger.debug({ eventId: id, eventType, tenantId }, 'Dispatching event to n8n');

      const response = await fetch(env.N8N_WEBHOOK_URL!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Automation-API-Key': env.AUTOMATION_API_KEY || '',
        },
        body: JSON.stringify({
          eventId: id,
          eventType,
          tenantId,
          payload,
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        await automationService.markEventDispatched(id);
        logger.info({ eventId: id, eventType }, 'Event dispatched successfully');
      } else {
        const errorText = await response.text();
        throw new Error(`n8n responded with ${response.status}: ${errorText}`);
      }
    } catch (error: any) {
      logger.error({ eventId: id, error: error.message }, 'Failed to dispatch event');
      await automationService.markEventFailed(id, error.message);
    }
  }

  /**
   * Manually trigger processing (useful for testing).
   */
  async triggerProcess() {
    await this.processEvents();
  }
}

// Singleton instance
export const dispatcher = new AutomationDispatcher();
