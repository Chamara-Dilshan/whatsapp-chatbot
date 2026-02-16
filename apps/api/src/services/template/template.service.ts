import { prisma } from '../../lib/prisma';
import { NotFoundError, ConflictError } from '../../middleware/errorHandler';
import type { CreateTemplateInput, UpdateTemplateInput } from '@whatsapp-bot/shared';

export async function listTemplates(tenantId: string) {
  return prisma.replyTemplate.findMany({
    where: { tenantId },
    orderBy: { intent: 'asc' },
  });
}

export async function createTemplate(tenantId: string, input: CreateTemplateInput) {
  const existing = await prisma.replyTemplate.findUnique({
    where: { tenantId_intent: { tenantId, intent: input.intent } },
  });

  if (existing) {
    throw new ConflictError(`Template for intent '${input.intent}' already exists`);
  }

  return prisma.replyTemplate.create({
    data: {
      tenantId,
      intent: input.intent,
      name: input.name,
      body: input.body,
      isActive: input.isActive,
    },
  });
}

export async function updateTemplate(tenantId: string, templateId: string, input: UpdateTemplateInput) {
  const template = await prisma.replyTemplate.findFirst({
    where: { id: templateId, tenantId },
  });

  if (!template) {
    throw new NotFoundError('Template not found');
  }

  return prisma.replyTemplate.update({
    where: { id: templateId },
    data: {
      ...(input.intent !== undefined ? { intent: input.intent } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.body !== undefined ? { body: input.body } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });
}

export async function deleteTemplate(tenantId: string, templateId: string) {
  const template = await prisma.replyTemplate.findFirst({
    where: { id: templateId, tenantId },
  });

  if (!template) {
    throw new NotFoundError('Template not found');
  }

  await prisma.replyTemplate.delete({ where: { id: templateId } });
  return { deleted: true };
}
