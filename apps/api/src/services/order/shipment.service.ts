/**
 * Shipment tracking service.
 *
 * Handles shipment record management and tracking status updates.
 */

import { prisma } from '../../lib/prisma';
import { NotFoundError } from '../../middleware/errorHandler';

export async function upsertShipment(
  tenantId: string,
  orderId: string,
  data: {
    carrier?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    shippedAt?: Date;
    deliveredAt?: Date;
    latestStatusText?: string;
  }
) {
  return prisma.shipment.upsert({
    where: { orderId },
    create: {
      tenantId,
      orderId,
      ...data,
    },
    update: data,
  });
}

export async function updateTrackingStatus(
  tenantId: string,
  shipmentId: string,
  statusText: string
) {
  const shipment = await prisma.shipment.findFirst({
    where: { id: shipmentId, tenantId },
  });
  if (!shipment) throw new NotFoundError('Shipment not found');

  return prisma.shipment.update({
    where: { id: shipmentId },
    data: { latestStatusText: statusText },
  });
}

export async function getShipmentByOrder(tenantId: string, orderId: string) {
  const shipment = await prisma.shipment.findFirst({
    where: { orderId, tenantId },
    include: { order: true },
  });
  if (!shipment) throw new NotFoundError('Shipment not found');
  return shipment;
}
