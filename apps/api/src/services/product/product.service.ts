import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import type { CreateProductInput, UpdateProductInput, ProductQueryInput } from '@whatsapp-bot/shared';
import { NotFoundError, ConflictError } from '../../middleware/errorHandler';

/**
 * Create a new product for a tenant.
 */
export async function createProduct(tenantId: string, input: CreateProductInput) {
  // Check for duplicate retailerId within tenant
  const existing = await prisma.product.findUnique({
    where: { tenantId_retailerId: { tenantId, retailerId: input.retailerId } },
  });

  if (existing) {
    throw new ConflictError(`Product with retailerId "${input.retailerId}" already exists`);
  }

  return prisma.product.create({
    data: {
      tenantId,
      retailerId: input.retailerId,
      name: input.name,
      description: input.description,
      price: input.price,
      currency: input.currency || 'USD',
      imageUrl: input.imageUrl,
      category: input.category,
      keywords: input.keywords || [],
      inStock: input.inStock ?? true,
    },
  });
}

/**
 * Get a product by ID (scoped to tenant).
 */
export async function getProduct(tenantId: string, productId: string) {
  const product = await prisma.product.findFirst({
    where: { id: productId, tenantId },
  });

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  return product;
}

/**
 * Get a product by retailerId (scoped to tenant).
 */
export async function getProductByRetailerId(tenantId: string, retailerId: string) {
  const product = await prisma.product.findUnique({
    where: { tenantId_retailerId: { tenantId, retailerId } },
  });

  if (!product) {
    throw new NotFoundError(`Product with retailerId "${retailerId}" not found`);
  }

  return product;
}

/**
 * List products for a tenant with optional filtering.
 */
export async function listProducts(tenantId: string, query: ProductQueryInput) {
  const where: Record<string, unknown> = { tenantId };

  if (query.category) {
    where.category = query.category;
  }
  if (query.inStock !== undefined) {
    where.inStock = query.inStock;
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
      take: query.limit,
      skip: query.offset,
    }),
    prisma.product.count({ where }),
  ]);

  return { products, total };
}

/**
 * Update a product (scoped to tenant).
 */
export async function updateProduct(tenantId: string, productId: string, input: UpdateProductInput) {
  // Verify product exists and belongs to tenant
  const product = await prisma.product.findFirst({
    where: { id: productId, tenantId },
  });

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  // If retailerId is being changed, check for duplicate
  if (input.retailerId && input.retailerId !== product.retailerId) {
    const existing = await prisma.product.findUnique({
      where: { tenantId_retailerId: { tenantId, retailerId: input.retailerId } },
    });
    if (existing) {
      throw new ConflictError(`Product with retailerId "${input.retailerId}" already exists`);
    }
  }

  return prisma.product.update({
    where: { id: productId },
    data: input,
  });
}

/**
 * Delete a product (scoped to tenant). Sets isActive = false (soft delete).
 */
export async function deleteProduct(tenantId: string, productId: string) {
  const product = await prisma.product.findFirst({
    where: { id: productId, tenantId },
  });

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  return prisma.product.update({
    where: { id: productId },
    data: { isActive: false },
  });
}

/**
 * Get all distinct categories for a tenant.
 */
export async function getCategories(tenantId: string): Promise<string[]> {
  const results = await prisma.product.findMany({
    where: { tenantId, isActive: true, category: { not: null } },
    select: { category: true },
    distinct: ['category'],
    orderBy: { category: 'asc' },
  });

  return results.map((r) => r.category!).filter(Boolean);
}

/**
 * Bulk upsert products from CSV import.
 * Uses retailerId as the unique key within tenant for upsert.
 */
export async function bulkUpsertProducts(
  tenantId: string,
  products: CreateProductInput[]
): Promise<{ imported: number; skipped: number; errors: Array<{ row: number; error: string }> }> {
  let imported = 0;
  let skipped = 0;
  const errors: Array<{ row: number; error: string }> = [];

  for (let i = 0; i < products.length; i++) {
    const input = products[i];
    try {
      await prisma.product.upsert({
        where: { tenantId_retailerId: { tenantId, retailerId: input.retailerId } },
        update: {
          name: input.name,
          description: input.description,
          price: input.price,
          currency: input.currency || 'USD',
          imageUrl: input.imageUrl,
          category: input.category,
          keywords: input.keywords || [],
          inStock: input.inStock ?? true,
          isActive: true,
        },
        create: {
          tenantId,
          retailerId: input.retailerId,
          name: input.name,
          description: input.description,
          price: input.price,
          currency: input.currency || 'USD',
          imageUrl: input.imageUrl,
          category: input.category,
          keywords: input.keywords || [],
          inStock: input.inStock ?? true,
        },
      });
      imported++;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      errors.push({ row: i + 2, error: errorMsg }); // row + 2 for 1-indexed + header
      skipped++;
      logger.warn({ tenantId, row: i + 2, retailerId: input.retailerId, error: errorMsg }, 'CSV import row failed');
    }
  }

  logger.info({ tenantId, imported, skipped, errorCount: errors.length }, 'CSV import completed');
  return { imported, skipped, errors };
}
