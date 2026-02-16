import { prisma } from '../../lib/prisma';
import { encrypt, decrypt } from '../../lib/crypto.util';
import { invalidateCache } from './tenantRouting.service';
import { ConflictError, NotFoundError } from '../../middleware/errorHandler';
import type { ConnectWhatsAppInput } from '@whatsapp-bot/shared';

export async function connectWhatsApp(tenantId: string, input: ConnectWhatsAppInput) {
  // Check if phoneNumberId is already in use by another tenant
  const existing = await prisma.tenantWhatsApp.findUnique({
    where: { phoneNumberId: input.phoneNumberId },
  });

  if (existing && existing.tenantId !== tenantId) {
    throw new ConflictError('This phone number is already connected to another tenant');
  }

  const data = {
    tenantId,
    phoneNumberId: input.phoneNumberId,
    displayPhone: input.displayPhone,
    wabaId: input.wabaId || null,
    accessTokenEnc: encrypt(input.accessToken),
    appSecretEnc: encrypt(input.appSecret),
    webhookVerifyToken: input.webhookVerifyToken,
    catalogId: input.catalogId || null,
    isActive: true,
  };

  const result = await prisma.tenantWhatsApp.upsert({
    where: { phoneNumberId: input.phoneNumberId },
    update: data,
    create: data,
  });

  invalidateCache(input.phoneNumberId);

  return {
    id: result.id,
    phoneNumberId: result.phoneNumberId,
    displayPhone: result.displayPhone,
    wabaId: result.wabaId,
    catalogId: result.catalogId,
    isActive: result.isActive,
  };
}

export async function getStatus(tenantId: string) {
  const connections = await prisma.tenantWhatsApp.findMany({
    where: { tenantId },
    select: {
      id: true,
      phoneNumberId: true,
      displayPhone: true,
      wabaId: true,
      catalogId: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return connections;
}

export async function updateCatalog(tenantId: string, catalogId: string) {
  const connection = await prisma.tenantWhatsApp.findFirst({
    where: { tenantId },
  });

  if (!connection) {
    throw new NotFoundError('No WhatsApp connection found for this tenant');
  }

  const updated = await prisma.tenantWhatsApp.update({
    where: { id: connection.id },
    data: { catalogId },
  });

  invalidateCache(connection.phoneNumberId);

  return { catalogId: updated.catalogId };
}
