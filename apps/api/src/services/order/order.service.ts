/**
 * Order management service.
 *
 * Provides CRUD operations for Orders and their items/shipments.
 * All operations are scoped to tenantId for multi-tenant safety.
 */

import { prisma } from '../../lib/prisma';
import { NotFoundError } from '../../middleware/errorHandler';

// ── Types ─────────────────────────────────────────────────────────────────

export interface CreateOrderInput {
  customerPhone: string;
  customerId?: string;
  customerName?: string;
  currency?: string;
  notes?: string;
  shippingFee?: number;
  items: Array<{
    productId?: string;
    title: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export interface UpdateOrderInput {
  status?: string;
  notes?: string;
  customerName?: string;
}

export interface ListOrdersQuery {
  status?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

// ── Order number generation ───────────────────────────────────────────────

async function generateOrderNumber(tenantId: string): Promise<string> {
  const prefix = 'ORD';
  const count = await prisma.order.count({ where: { tenantId } });
  const num = String(count + 1).padStart(4, '0');
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${prefix}-${year}${month}-${num}`;
}

// ── CRUD ─────────────────────────────────────────────────────────────────

export async function createOrder(tenantId: string, input: CreateOrderInput) {
  const orderNumber = await generateOrderNumber(tenantId);

  const subtotal = input.items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  const shippingFee = input.shippingFee ?? 0;
  const total = subtotal + shippingFee;

  const order = await prisma.order.create({
    data: {
      tenantId,
      orderNumber,
      customerId: input.customerId ?? null,
      customerPhone: input.customerPhone,
      customerName: input.customerName ?? null,
      status: 'pending',
      subtotal,
      shippingFee,
      total,
      currency: input.currency ?? 'USD',
      notes: input.notes ?? null,
      items: {
        create: input.items.map((item) => ({
          tenantId,
          productId: item.productId ?? null,
          title: item.title,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      },
    },
    include: {
      items: true,
      shipment: true,
    },
  });

  return order;
}

export async function getOrderById(tenantId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId },
    include: { items: true, shipment: true, customer: true },
  });
  if (!order) throw new NotFoundError('Order not found');
  return order;
}

export async function getOrderByNumber(tenantId: string, orderNumber: string) {
  const order = await prisma.order.findUnique({
    where: { tenantId_orderNumber: { tenantId, orderNumber } },
    include: { items: true, shipment: true },
  });
  if (!order) throw new NotFoundError(`Order ${orderNumber} not found`);
  return order;
}

export async function getOrdersByPhone(tenantId: string, customerPhone: string, limit = 5) {
  return prisma.order.findMany({
    where: { tenantId, customerPhone },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { items: true, shipment: true },
  });
}

export async function listOrders(tenantId: string, query: ListOrdersQuery = {}) {
  const { status, q, limit = 20, offset = 0 } = query;

  const where: Record<string, unknown> = { tenantId };
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { orderNumber: { contains: q, mode: 'insensitive' } },
      { customerName: { contains: q, mode: 'insensitive' } },
      { customerPhone: { contains: q } },
    ];
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
      include: { items: { take: 3 }, shipment: true },
    }),
    prisma.order.count({ where }),
  ]);

  return { orders, total };
}

export async function updateOrder(tenantId: string, orderId: string, input: UpdateOrderInput) {
  await getOrderById(tenantId, orderId); // ensures tenantId scope

  return prisma.order.update({
    where: { id: orderId },
    data: {
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.customerName !== undefined ? { customerName: input.customerName } : {}),
    },
    include: { items: true, shipment: true },
  });
}

export async function markShipped(
  tenantId: string,
  orderId: string,
  shipmentData: {
    carrier?: string;
    trackingNumber?: string;
    trackingUrl?: string;
  }
) {
  await getOrderById(tenantId, orderId);

  const [order] = await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: { status: 'shipped' },
      include: { items: true, shipment: true },
    }),
    prisma.shipment.upsert({
      where: { orderId },
      create: {
        tenantId,
        orderId,
        carrier: shipmentData.carrier ?? null,
        trackingNumber: shipmentData.trackingNumber ?? null,
        trackingUrl: shipmentData.trackingUrl ?? null,
        shippedAt: new Date(),
      },
      update: {
        carrier: shipmentData.carrier ?? undefined,
        trackingNumber: shipmentData.trackingNumber ?? undefined,
        trackingUrl: shipmentData.trackingUrl ?? undefined,
        shippedAt: new Date(),
      },
    }),
  ]);

  return order;
}

export async function markDelivered(tenantId: string, orderId: string) {
  await getOrderById(tenantId, orderId);

  const [order] = await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: { status: 'delivered' },
      include: { items: true, shipment: true },
    }),
    prisma.shipment.upsert({
      where: { orderId },
      create: {
        tenantId,
        orderId,
        deliveredAt: new Date(),
      },
      update: {
        deliveredAt: new Date(),
        latestStatusText: 'Delivered',
      },
    }),
  ]);

  return order;
}

export async function cancelOrder(tenantId: string, orderId: string) {
  await getOrderById(tenantId, orderId);
  return prisma.order.update({
    where: { id: orderId },
    data: { status: 'canceled' },
    include: { items: true, shipment: true },
  });
}

export async function refundOrder(tenantId: string, orderId: string) {
  await getOrderById(tenantId, orderId);
  return prisma.order.update({
    where: { id: orderId },
    data: { status: 'refunded' },
    include: { items: true, shipment: true },
  });
}
