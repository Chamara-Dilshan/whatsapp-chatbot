import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma';
import { ConflictError, ForbiddenError, NotFoundError } from '../../middleware/errorHandler';
import { checkAgentLimit } from '../billing/quota.service';
import type { CreateTeamMemberInput, UpdateTeamMemberInput } from '@whatsapp-bot/shared';

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  createdAt: true,
} as const;

export async function listTeamMembers(tenantId: string) {
  const [members, quota] = await Promise.all([
    prisma.tenantUser.findMany({
      where: { tenantId },
      select: USER_SELECT,
      orderBy: { createdAt: 'asc' },
    }),
    checkAgentLimit(tenantId),
  ]);

  return { members, quota: { current: quota.current, limit: quota.limit } };
}

export async function createTeamMember(tenantId: string, input: CreateTeamMemberInput) {
  const quota = await checkAgentLimit(tenantId);
  if (!quota.allowed) {
    throw new ForbiddenError(
      `Agent limit reached for your plan (${quota.current}/${quota.limit})`
    );
  }

  const existing = await prisma.tenantUser.findUnique({
    where: { tenantId_email: { tenantId, email: input.email } },
  });
  if (existing) {
    throw new ConflictError('Email is already registered in this tenant');
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const user = await prisma.tenantUser.create({
    data: {
      tenantId,
      email: input.email,
      passwordHash,
      name: input.name,
      role: input.role,
    },
    select: USER_SELECT,
  });

  return user;
}

export async function updateTeamMember(
  tenantId: string,
  userId: string,
  input: UpdateTeamMemberInput
) {
  const user = await prisma.tenantUser.findFirst({
    where: { id: userId, tenantId },
  });

  if (!user) {
    throw new NotFoundError('Team member not found');
  }

  if (user.role === 'owner') {
    throw new ForbiddenError('Cannot modify the owner account');
  }

  const updated = await prisma.tenantUser.update({
    where: { id: userId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.role !== undefined && { role: input.role }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
    select: USER_SELECT,
  });

  return updated;
}
