/**
 * Order bot service.
 *
 * Handles order status inquiries from WhatsApp customers:
 * - Looks up order by order number (extracted via regex from message)
 * - Looks up last 3 orders by customer phone if no order number
 * - Returns formatted WhatsApp-compatible status messages
 */

import { prisma } from '../../lib/prisma';
import { getOrderByNumber, getOrdersByPhone } from './order.service';
import { logger } from '../../lib/logger';

// Regex: matches "#ORD-2601-0001", "ORD-2601-0001", "ORD2601-0001", "order 1234" etc.
const ORDER_NUMBER_REGEX = /#?([A-Z]{2,4}[-\s]?[\dA-Z][\dA-Z\-]{2,19})/i;

/**
 * Extract an order number from a message string.
 * Returns null if no order number pattern found.
 */
export function extractOrderNumber(text: string): string | null {
  const match = text.match(ORDER_NUMBER_REGEX);
  if (!match) return null;
  // Normalise: uppercase, replace spaces with dashes
  return match[1].toUpperCase().replace(/\s+/g, '-');
}

/**
 * Format order status for WhatsApp reply.
 */
function formatOrderStatus(order: {
  orderNumber: string;
  status: string;
  total: number | string;
  currency: string;
  createdAt: Date;
  items: Array<{ title: string; quantity: number; unitPrice: number | string }>;
  shipment?: {
    carrier?: string | null;
    trackingNumber?: string | null;
    trackingUrl?: string | null;
    shippedAt?: Date | null;
    deliveredAt?: Date | null;
    latestStatusText?: string | null;
  } | null;
}): string {
  const statusEmoji: Record<string, string> = {
    pending: '⏳',
    processing: '🔄',
    shipped: '🚚',
    delivered: '✅',
    canceled: '❌',
    refunded: '💰',
  };

  const emoji = statusEmoji[order.status] ?? '📦';
  const total = Number(order.total).toFixed(2);
  const date = new Date(order.createdAt).toLocaleDateString();

  let msg = `📦 *Order ${order.orderNumber}*\n`;
  msg += `${emoji} Status: *${order.status.charAt(0).toUpperCase() + order.status.slice(1)}*\n`;
  msg += `📅 Placed: ${date}\n`;
  msg += `💰 Total: ${order.currency} ${total}\n`;

  // Items summary
  if (order.items.length > 0) {
    msg += `\n*Items:*\n`;
    for (const item of order.items.slice(0, 5)) {
      msg += `• ${item.title} × ${item.quantity}\n`;
    }
  }

  // Shipment info
  if (order.shipment) {
    const { carrier, trackingNumber, trackingUrl, shippedAt, deliveredAt, latestStatusText } = order.shipment;
    if (carrier || trackingNumber) {
      msg += `\n*Shipping:*\n`;
      if (carrier) msg += `Carrier: ${carrier}\n`;
      if (trackingNumber) msg += `Tracking: ${trackingNumber}\n`;
      if (trackingUrl) msg += `Track here: ${trackingUrl}\n`;
      if (latestStatusText) msg += `Latest update: ${latestStatusText}\n`;
      if (shippedAt) msg += `Shipped: ${new Date(shippedAt).toLocaleDateString()}\n`;
      if (deliveredAt) msg += `Delivered: ${new Date(deliveredAt).toLocaleDateString()}\n`;
    }
  }

  return msg.trim();
}

/**
 * Main bot handler for order status inquiries.
 *
 * Resolution:
 * 1. If order number found in message → look up + return status
 * 2. If customer phone known + no order number → last 3 orders
 * 3. Otherwise → ask for order number
 */
export async function handleOrderStatusInquiry(
  tenantId: string,
  customerWaId: string,
  extractedOrderNumber?: string | null
): Promise<{ replyText: string; found: boolean }> {
  // 1. Direct order number lookup
  if (extractedOrderNumber) {
    try {
      const order = await getOrderByNumber(tenantId, extractedOrderNumber);
      const replyText = formatOrderStatus(order as unknown as Parameters<typeof formatOrderStatus>[0]);
      logger.info({ tenantId, orderNumber: extractedOrderNumber }, 'Order status replied');
      return { replyText, found: true };
    } catch {
      return {
        replyText: `Sorry, I couldn't find order *${extractedOrderNumber}*. Please check the order number and try again.`,
        found: false,
      };
    }
  }

  // 2. Look up customer's recent orders by phone
  const phoneForLookup = customerWaId.startsWith('+') ? customerWaId.slice(1) : customerWaId;

  const orders = await getOrdersByPhone(tenantId, customerWaId, 3)
    .catch(() => getOrdersByPhone(tenantId, `+${phoneForLookup}`, 3))
    .catch(() => []);

  if (orders.length === 0) {
    return {
      replyText:
        "I couldn't find any orders for your number. Please reply with your order number (e.g. *ORD-2601-0001*) and I'll look it up for you.",
      found: false,
    };
  }

  if (orders.length === 1) {
    const replyText = formatOrderStatus(orders[0] as unknown as Parameters<typeof formatOrderStatus>[0]);
    return { replyText, found: true };
  }

  // Multiple orders — show summary list
  let replyText = `Here are your recent orders:\n\n`;
  for (const order of orders) {
    const emoji = order.status === 'delivered' ? '✅' : order.status === 'shipped' ? '🚚' : '⏳';
    replyText += `${emoji} *${order.orderNumber}* — ${order.status} — ${order.currency} ${Number(order.total).toFixed(2)}\n`;
  }
  replyText += `\nReply with an order number for full details.`;

  return { replyText, found: true };
}
