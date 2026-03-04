import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app, createTestTenant, makeHeaders } from './helpers';

// ─── GET /products ────────────────────────────────────────────────────────────

describe('GET /products', () => {
  let ownerToken: string;

  beforeAll(async () => {
    ({ ownerToken } = await createTestTenant());
  });

  it('returns an empty list for a new tenant (200)', async () => {
    const res = await request(app)
      .get('/products')
      .set(makeHeaders(ownerToken));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(0);
  });

  it('returns 401 without an auth token', async () => {
    const res = await request(app).get('/products');
    expect(res.status).toBe(401);
  });
});

// ─── POST /products ───────────────────────────────────────────────────────────

describe('POST /products', () => {
  it('creates a product and returns 201', async () => {
    const { ownerToken } = await createTestTenant();

    const res = await request(app)
      .post('/products')
      .set(makeHeaders(ownerToken))
      .send({
        retailerId: `SKU-${Date.now()}`,
        name: 'Wireless Mouse',
        description: 'Ergonomic wireless mouse',
        price: 29.99,
        currency: 'USD',
        category: 'Electronics',
        inStock: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Wireless Mouse');
  });

  it('returns 422 when name or price is missing', async () => {
    const { ownerToken } = await createTestTenant();

    const res = await request(app)
      .post('/products')
      .set(makeHeaders(ownerToken))
      .send({ retailerId: 'SKU-X', description: 'No name or price' });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });
});

// ─── PUT /products/:id ────────────────────────────────────────────────────────

describe('PUT /products/:id', () => {
  it('updates a product and returns 200', async () => {
    const { ownerToken } = await createTestTenant();

    const createRes = await request(app)
      .post('/products')
      .set(makeHeaders(ownerToken))
      .send({ retailerId: `SKU-U-${Date.now()}`, name: 'Old Name', price: 10, currency: 'USD' });
    const productId = createRes.body.data.id;

    const res = await request(app)
      .put(`/products/${productId}`)
      .set(makeHeaders(ownerToken))
      .send({ name: 'New Name' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('New Name');
  });

  it('returns 404 for a non-existent product ID', async () => {
    const { ownerToken } = await createTestTenant();

    const res = await request(app)
      .put('/products/nonexistent-id-99999')
      .set(makeHeaders(ownerToken))
      .send({ name: 'Ghost' });

    expect(res.status).toBe(404);
  });

  it('returns 404 for a product belonging to a different tenant', async () => {
    const { ownerToken: owner1Token } = await createTestTenant();
    const { ownerToken: owner2Token } = await createTestTenant();

    const createRes = await request(app)
      .post('/products')
      .set(makeHeaders(owner1Token))
      .send({ retailerId: `SKU-T-${Date.now()}`, name: 'Tenant1 Product', price: 5, currency: 'USD' });
    const productId = createRes.body.data.id;

    // Tenant 2 tries to modify tenant 1's product
    const res = await request(app)
      .put(`/products/${productId}`)
      .set(makeHeaders(owner2Token))
      .send({ name: 'Stolen' });

    expect(res.status).toBe(404);
  });
});

// ─── DELETE /products/:id ─────────────────────────────────────────────────────

describe('DELETE /products/:id', () => {
  it('soft-deletes a product — it no longer appears in GET /products', async () => {
    const { ownerToken } = await createTestTenant();

    const createRes = await request(app)
      .post('/products')
      .set(makeHeaders(ownerToken))
      .send({ retailerId: `SKU-D-${Date.now()}`, name: 'To Delete', price: 9.99, currency: 'USD' });
    const productId = createRes.body.data.id;

    const deleteRes = await request(app)
      .delete(`/products/${productId}`)
      .set(makeHeaders(ownerToken));
    expect(deleteRes.status).toBe(200);

    // Should not appear in the list anymore
    const listRes = await request(app)
      .get('/products')
      .set(makeHeaders(ownerToken));
    const ids = listRes.body.data.map((p: { id: string }) => p.id);
    expect(ids).not.toContain(productId);
  });
});

// ─── POST /products/import (CSV) ──────────────────────────────────────────────

describe('POST /products/import', () => {
  it('bulk-imports products from a valid CSV and returns the count (200)', async () => {
    const { ownerToken } = await createTestTenant();
    const sku = `CSV-${Date.now()}`;

    const csv = [
      'retailerId,name,description,price,currency,category,inStock',
      `${sku}-1,CSV Widget A,A test widget,19.99,USD,Electronics,true`,
      `${sku}-2,CSV Widget B,Another widget,29.99,USD,Accessories,true`,
    ].join('\n');

    const res = await request(app)
      .post('/products/import')
      .set(makeHeaders(ownerToken))
      .attach('file', Buffer.from(csv), { filename: 'products.csv', contentType: 'text/csv' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.imported).toBeGreaterThanOrEqual(2);
  });

  it('returns 422 when no file is attached', async () => {
    const { ownerToken } = await createTestTenant();

    const res = await request(app)
      .post('/products/import')
      .set(makeHeaders(ownerToken));

    expect(res.status).toBe(422);
  });
});
