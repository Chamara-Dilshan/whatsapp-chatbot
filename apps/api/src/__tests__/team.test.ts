import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app, createTestTenant, addAgent, makeHeaders } from './helpers';

// ─── GET /team ────────────────────────────────────────────────────────────────

describe('GET /team', () => {
  let ownerToken: string;

  beforeAll(async () => {
    ({ ownerToken } = await createTestTenant());
  });

  it('returns members array + quota meta (200)', async () => {
    const res = await request(app)
      .get('/team')
      .set(makeHeaders(ownerToken));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.members)).toBe(true);
    expect(res.body.data.quota).toBeTruthy();
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).get('/team');
    expect(res.status).toBe(401);
  });
});

// ─── POST /team ───────────────────────────────────────────────────────────────

describe('POST /team', () => {
  it('owner creates an agent on a pro plan (201)', async () => {
    const { ownerToken } = await createTestTenant({ plan: 'pro' });

    const res = await request(app)
      .post('/team')
      .set(makeHeaders(ownerToken))
      .send({
        name: 'New Agent',
        email: `newagent-${Date.now()}@test.com`,
        password: 'AgentPass123!',
        role: 'agent',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe('agent');
  });

  it('agent cannot create a team member (403)', async () => {
    const { tenantId, ownerToken } = await createTestTenant({ plan: 'pro' });
    // Create an agent first via the owner
    await request(app)
      .post('/team')
      .set(makeHeaders(ownerToken))
      .send({ name: 'Agent A', email: `agenta-${Date.now()}@test.com`, password: 'Pass123!', role: 'agent' });

    // Add a second agent directly via DB to get their token
    const { agentToken } = await addAgent(tenantId);

    const res = await request(app)
      .post('/team')
      .set(makeHeaders(agentToken))
      .send({ name: 'Forbidden', email: `forbidden-${Date.now()}@test.com`, password: 'Pass123!', role: 'agent' });

    expect(res.status).toBe(403);
  });

  it('returns 409 on duplicate email within the same tenant', async () => {
    const { ownerToken } = await createTestTenant({ plan: 'pro' });
    const email = `dup-${Date.now()}@test.com`;

    await request(app)
      .post('/team')
      .set(makeHeaders(ownerToken))
      .send({ name: 'First', email, password: 'Pass123!', role: 'agent' });

    const res = await request(app)
      .post('/team')
      .set(makeHeaders(ownerToken))
      .send({ name: 'Second', email, password: 'Pass123!', role: 'agent' });

    expect(res.status).toBe(409);
  });

  it('free-plan tenant is blocked immediately (owner = 1 user, maxAgents = 1)', async () => {
    // On free plan: maxAgents=1, owner counts as 1 → current(1) < limit(1) = false
    const { ownerToken } = await createTestTenant({ plan: 'free' });

    const res = await request(app)
      .post('/team')
      .set(makeHeaders(ownerToken))
      .send({ name: 'Overflow', email: `overflow-${Date.now()}@test.com`, password: 'Pass123!', role: 'agent' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toMatch(/QUOTA|LIMIT|FORBIDDEN/i);
  });

  it('pro-plan tenant is blocked after reaching 3 total users', async () => {
    // Pro plan: maxAgents=3. Owner already = 1, add 2 more via DB helper.
    const { ownerToken, tenantId } = await createTestTenant({ plan: 'pro' });
    await addAgent(tenantId); // total = 2
    await addAgent(tenantId); // total = 3

    const res = await request(app)
      .post('/team')
      .set(makeHeaders(ownerToken))
      .send({ name: 'Fourth', email: `fourth-${Date.now()}@test.com`, password: 'Pass123!', role: 'agent' });

    expect(res.status).toBe(403);
  });
});

// ─── PUT /team/:userId ────────────────────────────────────────────────────────

describe('PUT /team/:userId', () => {
  it('owner can update an agent name and role (200)', async () => {
    const { ownerToken, tenantId } = await createTestTenant({ plan: 'pro' });
    const { agent } = await addAgent(tenantId);

    const res = await request(app)
      .put(`/team/${agent.id}`)
      .set(makeHeaders(ownerToken))
      .send({ name: 'Updated Name', role: 'agent', isActive: true });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated Name');
  });

  it('cannot modify the owner user (403)', async () => {
    const { ownerToken, ownerId } = await createTestTenant({ plan: 'pro' });

    const res = await request(app)
      .put(`/team/${ownerId}`)
      .set(makeHeaders(ownerToken))
      .send({ name: 'Hacked Owner', role: 'agent', isActive: false });

    expect(res.status).toBe(403);
  });
});
