import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { app } from './helpers';
import { prisma } from '../lib/prisma';
import { encryptVersioned } from '../lib/crypto.keyRotation.util';

// ─── GET /webhook/whatsapp — hub challenge ────────────────────────────────────

describe('GET /webhook/whatsapp — hub challenge', () => {
  const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN!;

  it('responds with the hub.challenge when verify_token matches (200)', async () => {
    const res = await request(app)
      .get('/webhook/whatsapp')
      .query({
        'hub.mode': 'subscribe',
        'hub.verify_token': VERIFY_TOKEN,
        'hub.challenge': 'test_challenge_12345',
      });

    expect(res.status).toBe(200);
    expect(res.text).toBe('test_challenge_12345');
  });

  it('returns 403 when verify_token does not match', async () => {
    const res = await request(app)
      .get('/webhook/whatsapp')
      .query({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'wrong-token',
        'hub.challenge': 'anything',
      });

    expect(res.status).toBe(403);
  });
});

// ─── POST /webhook/whatsapp — signature verification ─────────────────────────

describe('POST /webhook/whatsapp — signature verification', () => {
  const APP_SECRET = 'test-app-secret-for-hmac';
  const PHONE_NUMBER_ID = `test-phone-${Date.now()}`;

  beforeAll(async () => {
    // Seed a TenantWhatsApp row so the middleware can look up the app secret
    const tenant = await prisma.tenant.create({
      data: {
        id: `webhook-tenant-${Date.now()}`,
        name: 'Webhook Test Tenant',
        slug: `webhook-tenant-${Date.now()}`,
        plan: 'pro',
      },
    });
    await prisma.tenantWhatsApp.create({
      data: {
        tenantId: tenant.id,
        phoneNumberId: PHONE_NUMBER_ID,
        displayPhone: '+1555000000',
        wabaId: 'WABA_TEST',
        accessTokenEnc: encryptVersioned('DUMMY_ACCESS_TOKEN'),
        appSecretEnc: encryptVersioned(APP_SECRET),
        webhookVerifyToken: 'test-webhook-verify-token',
      },
    });
  });

  it('returns 403 when X-Hub-Signature-256 header is missing', async () => {
    const body = JSON.stringify({ entry: [{ changes: [{ value: { metadata: { phone_number_id: PHONE_NUMBER_ID } } }] }] });

    const res = await request(app)
      .post('/webhook/whatsapp')
      .set('Content-Type', 'application/json')
      .send(body);

    expect(res.status).toBe(403);
  });

  it('returns 403 when the HMAC signature is invalid', async () => {
    const body = JSON.stringify({ entry: [{ changes: [{ value: { metadata: { phone_number_id: PHONE_NUMBER_ID } } }] }] });
    const wrongSignature = 'sha256=0000000000000000000000000000000000000000000000000000000000000000';

    const res = await request(app)
      .post('/webhook/whatsapp')
      .set('Content-Type', 'application/json')
      .set('X-Hub-Signature-256', wrongSignature)
      .send(body);

    expect(res.status).toBe(403);
  });

  it('returns 200 when the HMAC signature is correct', async () => {
    const body = JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [{
        id: 'WABA_TEST',
        changes: [{
          value: {
            metadata: { phone_number_id: PHONE_NUMBER_ID, display_phone_number: '+1555000000' },
            contacts: [],
            messages: [],
          },
          field: 'messages',
        }],
      }],
    });

    // Compute valid HMAC the same way signatureVerify.ts does
    const hmac = crypto.createHmac('sha256', APP_SECRET).update(body).digest('hex');
    const signature = `sha256=${hmac}`;

    const res = await request(app)
      .post('/webhook/whatsapp')
      .set('Content-Type', 'application/json')
      .set('X-Hub-Signature-256', signature)
      .send(body);

    // The webhook is processed asynchronously (enqueued to BullMQ).
    // A correctly verified request always returns 200.
    expect(res.status).toBe(200);
  });
});
