import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import { incrementUsage } from '../billing/usage.service';
import { checkAutomationEnabled } from '../billing/quota.service';

interface CreateAutomationEventInput {
  tenantId: string;
  eventType: string;
  payload: any;
}

/**
 * Create an automation event to be dispatched to n8n.
 * Event types: case_created, case_assigned, case_resolved, high_priority_case, sla_breach
 */
export async function createAutomationEvent(input: CreateAutomationEventInput) {
  const { tenantId, eventType, payload } = input;

  // Plan gate: automation is a paid feature
  const automationEnabled = await checkAutomationEnabled(tenantId);
  if (!automationEnabled) {
    logger.warn({ tenantId, eventType }, 'Automation event skipped — feature not enabled on current plan');
    return null;
  }

  const event = await prisma.automationEvent.create({
    data: {
      tenantId,
      eventType,
      payload,
      status: 'pending',
      nextRetryAt: new Date(), // Ready to dispatch immediately
    },
  });

  // Track automation event usage
  incrementUsage(tenantId, 'automationEventsCount').catch(() => {});

  logger.info({ eventId: event.id, eventType, tenantId }, 'Automation event created');

  return event;
}

/**
 * Get pending automation events ready for dispatch.
 * Used by the dispatcher to poll for events.
 */
export async function getPendingEvents(limit = 50) {
  const now = new Date();

  const events = await prisma.automationEvent.findMany({
    where: {
      status: 'pending',
      nextRetryAt: {
        lte: now,
      },
      attempts: {
        lt: 5, // Max 5 retry attempts
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
    take: limit,
  });

  return events;
}

/**
 * Mark an event as dispatched successfully.
 */
export async function markEventDispatched(eventId: string) {
  const event = await prisma.automationEvent.update({
    where: { id: eventId },
    data: {
      status: 'dispatched',
      processedAt: new Date(),
    },
  });

  logger.info({ eventId }, 'Automation event dispatched');

  return event;
}

/**
 * Mark an event as delivered (acknowledged by n8n).
 */
export async function markEventDelivered(eventId: string) {
  const event = await prisma.automationEvent.update({
    where: { id: eventId },
    data: {
      status: 'delivered',
      processedAt: new Date(),
    },
  });

  logger.info({ eventId }, 'Automation event delivered');

  return event;
}

/**
 * Mark an event as failed and schedule retry.
 */
export async function markEventFailed(eventId: string, error: string) {
  const event = await prisma.automationEvent.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new Error(`Event ${eventId} not found`);
  }

  const attempts = event.attempts + 1;
  const maxAttempts = 5;

  // Exponential backoff: 1min, 5min, 15min, 30min, 60min
  const backoffMinutes = [1, 5, 15, 30, 60];
  const nextRetryDelay = backoffMinutes[Math.min(attempts - 1, backoffMinutes.length - 1)];
  const nextRetryAt = new Date(Date.now() + nextRetryDelay * 60 * 1000);

  const updated = await prisma.automationEvent.update({
    where: { id: eventId },
    data: {
      status: attempts >= maxAttempts ? 'failed' : 'pending',
      attempts,
      lastAttemptAt: new Date(),
      nextRetryAt: attempts >= maxAttempts ? null : nextRetryAt,
      error,
    },
  });

  logger.warn(
    { eventId, attempts, maxAttempts, nextRetryAt, error },
    'Automation event failed, retry scheduled'
  );

  return updated;
}

/**
 * Get event by ID.
 */
export async function getEventById(eventId: string) {
  return prisma.automationEvent.findUnique({
    where: { id: eventId },
  });
}
