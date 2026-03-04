import { createApp } from '../app';
import { prisma } from '../lib/prisma';
import { signToken } from '../lib/jwt.util';
import { hashSync } from 'bcryptjs';

/** Shared Express app instance reused across all tests in a file. */
export const app = createApp();

/** Returns an Authorization header object for use with supertest. */
export function makeHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

/** Unique suffix generator — timestamp + 5-char random string. */
function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Creates an isolated tenant + owner in the DB, returns the tenant,
 * owner record, and a signed owner JWT.
 *
 * Default plan is 'pro' (maxAgents: 3) — pass { plan: 'free' } for
 * quota-enforcement tests where maxAgents: 1 is needed.
 */
export async function createTestTenant(overrides?: { plan?: string }) {
  const id = uid();
  const tenantId = `test-tenant-${id}`;
  const ownerId = `test-owner-${id}`;

  const tenant = await prisma.tenant.create({
    data: {
      id: tenantId,
      name: `Test Tenant ${id}`,
      slug: `test-tenant-${id}`,
      plan: overrides?.plan ?? 'pro',
    },
  });

  const owner = await prisma.tenantUser.create({
    data: {
      id: ownerId,
      tenantId,
      email: `owner-${id}@test.com`,
      // 10 rounds — fast enough for tests, still exercises bcrypt path
      passwordHash: hashSync('password123', 10),
      name: 'Test Owner',
      role: 'owner',
    },
  });

  // TenantPolicies is required by some routes (e.g. settings)
  await prisma.tenantPolicies.create({ data: { tenantId } });

  const ownerToken = signToken({ userId: ownerId, tenantId, role: 'owner' });

  return { tenant, owner, ownerToken, tenantId, ownerId };
}

/**
 * Adds an agent user to an existing tenant.
 * Returns the agent record and a signed agent JWT.
 */
export async function addAgent(tenantId: string) {
  const id = uid();
  const agent = await prisma.tenantUser.create({
    data: {
      id: `test-agent-${id}`,
      tenantId,
      email: `agent-${id}@test.com`,
      passwordHash: hashSync('password123', 10),
      name: 'Test Agent',
      role: 'agent',
    },
  });
  const agentToken = signToken({ userId: agent.id, tenantId, role: 'agent' });
  return { agent, agentToken };
}
