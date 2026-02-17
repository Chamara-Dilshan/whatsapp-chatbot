/**
 * Prometheus metrics registry.
 *
 * Exposes metrics at GET /metrics for Prometheus scraping.
 * Access should be restricted to internal networks via nginx in production.
 */

import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

export const register = new Registry();

// Collect default Node.js metrics (memory, CPU, event loop, GC)
collectDefaultMetrics({ register });

// ── WhatsApp Webhooks ─────────────────────────────────────────────────

export const webhooksReceived = new Counter({
  name: 'whatsapp_webhooks_total',
  help: 'Total number of WhatsApp webhook requests received',
  labelNames: ['status'], // received | rejected | queued
  registers: [register],
});

// ── Message Processing ────────────────────────────────────────────────

export const messagesProcessed = new Counter({
  name: 'whatsapp_messages_processed_total',
  help: 'Total number of inbound messages processed',
  labelNames: ['tenant_id', 'intent'],
  registers: [register],
});

export const messageProcessingDuration = new Histogram({
  name: 'message_processing_duration_seconds',
  help: 'Time taken to process an inbound WhatsApp message',
  labelNames: ['tenant_id'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
  registers: [register],
});

// ── WhatsApp Send ─────────────────────────────────────────────────────

export const messagesSent = new Counter({
  name: 'whatsapp_send_total',
  help: 'Total outbound WhatsApp messages attempted',
  labelNames: ['tenant_id', 'status', 'type'], // status: success|failure, type: text|template
  registers: [register],
});

// ── Automation Events ─────────────────────────────────────────────────

export const automationEvents = new Counter({
  name: 'automation_events_total',
  help: 'Total automation events dispatched',
  labelNames: ['tenant_id', 'event_type', 'status'], // status: dispatched|failed|quota_exceeded
  registers: [register],
});

// ── Queue Metrics ─────────────────────────────────────────────────────

export const queueDepth = new Gauge({
  name: 'webhook_queue_depth',
  help: 'Number of pending webhook jobs in the processing queue',
  registers: [register],
});

// ── Billing / Quota ───────────────────────────────────────────────────

export const quotaExceeded = new Counter({
  name: 'quota_exceeded_total',
  help: 'Number of times a tenant quota was exceeded',
  labelNames: ['tenant_id', 'quota_type'], // quota_type: inbound|outbound|agents
  registers: [register],
});
