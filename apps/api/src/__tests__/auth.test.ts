import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from './helpers';

// ─── POST /auth/register ──────────────────────────────────────────────────────

describe('POST /auth/register', () => {
  it('creates a tenant + owner and returns a token (201)', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        tenantName: `E2E Corp ${Date.now()}`,
        name: 'Alice',
        email: `alice-${Date.now()}@example.com`,
        password: 'SecurePass123!',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.role).toBe('owner');
    expect(res.body.data.tenant).toBeTruthy();
  });

  it('returns 409 when the same business name (slug) is registered twice', async () => {
    const tenantName = `Duplicate Corp ${Date.now()}`;
    const email1 = `dup1-${Date.now()}@example.com`;
    const email2 = `dup2-${Date.now()}@example.com`;

    await request(app).post('/auth/register').send({
      tenantName, name: 'Alice', email: email1, password: 'SecurePass123!',
    });

    const res = await request(app).post('/auth/register').send({
      tenantName, name: 'Bob', email: email2, password: 'SecurePass123!',
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('returns 422 when required fields are missing', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'noname@example.com' }); // missing tenantName, name, password

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });
});

// ─── POST /auth/login ─────────────────────────────────────────────────────────

describe('POST /auth/login', () => {
  it('returns token + refreshToken on valid credentials (200)', async () => {
    const email = `login-${Date.now()}@example.com`;
    await request(app).post('/auth/register').send({
      tenantName: `Login Corp ${Date.now()}`,
      name: 'Alice',
      email,
      password: 'SecurePass123!',
    });

    const res = await request(app)
      .post('/auth/login')
      .send({ email, password: 'SecurePass123!' });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.refreshToken).toBeTruthy();
  });

  it('returns 401 on wrong password', async () => {
    const email = `wrongpw-${Date.now()}@example.com`;
    await request(app).post('/auth/register').send({
      tenantName: `WrongPW Corp ${Date.now()}`,
      name: 'Bob',
      email,
      password: 'CorrectPass123!',
    });

    const res = await request(app)
      .post('/auth/login')
      .send({ email, password: 'WrongPass999!' });

    expect(res.status).toBe(401);
  });

  it('returns 401 for non-existent email', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'nobody@nowhere.com', password: 'Anything123!' });

    expect(res.status).toBe(401);
  });
});

// ─── GET /auth/me ─────────────────────────────────────────────────────────────

describe('GET /auth/me', () => {
  it('returns user + tenant for a valid token (200)', async () => {
    const email = `me-${Date.now()}@example.com`;
    const reg = await request(app).post('/auth/register').send({
      tenantName: `Me Corp ${Date.now()}`,
      name: 'Carol',
      email,
      password: 'SecurePass123!',
    });
    const { token } = reg.body.data;

    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(email);
    expect(res.body.data.tenant).toBeTruthy();
  });

  it('returns 401 when Authorization header is missing', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 for an invalid/tampered token', async () => {
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', 'Bearer totally.invalid.token');
    expect(res.status).toBe(401);
  });
});

// ─── POST /auth/refresh ───────────────────────────────────────────────────────

describe('POST /auth/refresh', () => {
  it('returns a new accessToken for a valid refreshToken (200)', async () => {
    const email = `refresh-${Date.now()}@example.com`;
    await request(app).post('/auth/register').send({
      tenantName: `Refresh Corp ${Date.now()}`,
      name: 'Dave',
      email,
      password: 'SecurePass123!',
    });
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email, password: 'SecurePass123!' });
    const { refreshToken } = loginRes.body.data;

    const res = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
  });

  it('returns 401 for an invalid refreshToken', async () => {
    const res = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: 'not.a.real.token' });
    expect(res.status).toBe(401);
  });
});

// ─── POST /auth/forgot-password ───────────────────────────────────────────────

describe('POST /auth/forgot-password', () => {
  it('always returns 200 — even for unknown email (no enumeration)', async () => {
    const res = await request(app)
      .post('/auth/forgot-password')
      .send({ email: 'nobody@nowhere.example.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
