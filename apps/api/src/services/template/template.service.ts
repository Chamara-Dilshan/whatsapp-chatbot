import { prisma } from '../../lib/prisma';
import { NotFoundError, ConflictError } from '../../middleware/errorHandler';
import { getOrSet, invalidateCache, cacheKeys } from '../cache/cache.service';
import type { CreateTemplateInput, UpdateTemplateInput } from '@whatsapp-bot/shared';

export async function listTemplates(tenantId: string) {
  return getOrSet(
    cacheKeys.templates(tenantId),
    () =>
      prisma.replyTemplate.findMany({
        where: { tenantId },
        orderBy: [{ intent: 'asc' }, { language: 'asc' }, { tone: 'asc' }],
      }),
    60
  );
}

export async function createTemplate(tenantId: string, input: CreateTemplateInput) {
  const language = input.language ?? 'EN';
  const tone = input.tone ?? 'FRIENDLY';

  // Check for duplicate with same language + tone
  const existing = await prisma.replyTemplate.findUnique({
    where: {
      tenantId_intent_language_tone: {
        tenantId,
        intent: input.intent,
        language,
        tone,
      },
    },
  });

  if (existing) {
    throw new ConflictError(
      `Template for intent '${input.intent}' (${language}/${tone}) already exists`
    );
  }

  const template = await prisma.replyTemplate.create({
    data: {
      tenantId,
      intent: input.intent,
      language,
      tone,
      name: input.name,
      body: input.body,
      isActive: input.isActive ?? true,
    },
  });

  await invalidateCache(cacheKeys.templates(tenantId));
  return template;
}

export async function updateTemplate(
  tenantId: string,
  templateId: string,
  input: UpdateTemplateInput
) {
  const template = await prisma.replyTemplate.findFirst({
    where: { id: templateId, tenantId },
  });

  if (!template) {
    throw new NotFoundError('Template not found');
  }

  const updated = await prisma.replyTemplate.update({
    where: { id: templateId },
    data: {
      ...(input.intent !== undefined ? { intent: input.intent } : {}),
      ...(input.language !== undefined ? { language: input.language } : {}),
      ...(input.tone !== undefined ? { tone: input.tone } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.body !== undefined ? { body: input.body } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });

  await invalidateCache(cacheKeys.templates(tenantId));
  return updated;
}

export async function deleteTemplate(tenantId: string, templateId: string) {
  const template = await prisma.replyTemplate.findFirst({
    where: { id: templateId, tenantId },
  });

  if (!template) {
    throw new NotFoundError('Template not found');
  }

  await prisma.replyTemplate.delete({ where: { id: templateId } });
  await invalidateCache(cacheKeys.templates(tenantId));
  return { deleted: true };
}
