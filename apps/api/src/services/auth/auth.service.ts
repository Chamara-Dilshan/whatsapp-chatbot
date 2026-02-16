import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma';
import { signToken } from '../../lib/jwt.util';
import { ConflictError, UnauthorizedError } from '../../middleware/errorHandler';
import type { RegisterInput, LoginInput } from '@whatsapp-bot/shared';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function registerOwner(input: RegisterInput) {
  const slug = slugify(input.tenantName);

  // Check if tenant slug already exists
  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (existing) {
    throw new ConflictError(`Tenant with slug '${slug}' already exists`);
  }

  // Check if email is already registered
  const existingUser = await prisma.tenantUser.findFirst({
    where: { email: input.email },
  });
  if (existingUser) {
    throw new ConflictError('Email is already registered');
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const result = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: { name: input.tenantName, slug },
    });

    const user = await tx.tenantUser.create({
      data: {
        tenantId: tenant.id,
        email: input.email,
        passwordHash,
        name: input.name,
        role: 'owner',
      },
    });

    // Create default policies
    await tx.tenantPolicies.create({
      data: { tenantId: tenant.id },
    });

    return { tenant, user };
  });

  const token = signToken({
    userId: result.user.id,
    tenantId: result.tenant.id,
    role: result.user.role,
  });

  return {
    token,
    user: {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role,
    },
    tenant: {
      id: result.tenant.id,
      name: result.tenant.name,
      slug: result.tenant.slug,
    },
  };
}

export async function login(input: LoginInput) {
  const user = await prisma.tenantUser.findFirst({
    where: { email: input.email, isActive: true },
    include: { tenant: true },
  });

  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const token = signToken({
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    tenant: {
      id: user.tenant.id,
      name: user.tenant.name,
      slug: user.tenant.slug,
    },
  };
}

export async function getMe(userId: string, tenantId: string) {
  const user = await prisma.tenantUser.findFirst({
    where: { id: userId, tenantId, isActive: true },
    include: { tenant: true },
  });

  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    tenant: {
      id: user.tenant.id,
      name: user.tenant.name,
      slug: user.tenant.slug,
      plan: user.tenant.plan,
    },
  };
}
