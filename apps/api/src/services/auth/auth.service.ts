import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { signToken } from '../../lib/jwt.util';
import { computeHmacSha256 } from '../../lib/crypto.util';
import { ConflictError, UnauthorizedError, ValidationError } from '../../middleware/errorHandler';
import { sendPasswordResetEmail } from '../email/email.service';
import { env } from '../../config/env';
import type { RegisterInput, LoginInput, ForgotPasswordInput, ResetPasswordInput } from '@whatsapp-bot/shared';

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

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function requestPasswordReset(input: ForgotPasswordInput): Promise<void> {
  // Always returns silently — no email enumeration possible
  const user = await prisma.tenantUser.findFirst({
    where: { email: input.email, isActive: true },
  });

  if (!user) return;

  // Generate cryptographically random 32-byte token (64 hex chars)
  const rawToken = crypto.randomBytes(32).toString('hex');

  // Hash before storing — keyed on JWT_SECRET so the hash is useless without the secret
  const tokenHash = computeHmacSha256(rawToken, env.JWT_SECRET);

  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  // Delete any existing unused tokens for this user (one active reset per user)
  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id, usedAt: null },
  });

  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  const resetUrl = `${env.DASHBOARD_URL}/reset-password?token=${rawToken}`;
  await sendPasswordResetEmail(user.email, resetUrl);
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const tokenHash = computeHmacSha256(input.token, env.JWT_SECRET);

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  if (!record) {
    throw new ValidationError('Invalid or expired password reset link');
  }

  if (record.usedAt) {
    throw new ValidationError('This password reset link has already been used');
  }

  if (record.expiresAt < new Date()) {
    throw new ValidationError('This password reset link has expired');
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  // Atomic: update password + mark token used in one transaction
  await prisma.$transaction([
    prisma.tenantUser.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);
}
