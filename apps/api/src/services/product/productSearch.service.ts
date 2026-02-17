import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import { Prisma } from '@prisma/client';

export interface ProductSearchResult {
  id: string;
  tenantId: string;
  retailerId: string;
  name: string;
  description: string | null;
  price: Prisma.Decimal;
  currency: string;
  imageUrl: string | null;
  category: string | null;
  keywords: string[];
  inStock: boolean;
  isActive: boolean;
  similarity?: number;
}

/**
 * Fuzzy search products using PostgreSQL pg_trgm.
 * Searches across name, description, and keywords fields.
 * Falls back to ILIKE if pg_trgm similarity is too low.
 *
 * @param tenantId - Tenant to search within
 * @param query - Search query string
 * @param limit - Max results (default 10)
 * @param category - Optional category filter
 * @returns Matching products ordered by relevance
 */
export async function searchProducts(
  tenantId: string,
  query: string,
  limit = 10,
  category?: string
): Promise<ProductSearchResult[]> {
  if (!query || query.trim().length === 0) {
    // No query: return active in-stock products
    const products = await prisma.product.findMany({
      where: {
        tenantId,
        isActive: true,
        inStock: true,
        ...(category ? { category } : {}),
      },
      take: limit,
      orderBy: { name: 'asc' },
    });
    return products.map((p) => ({ ...p, similarity: undefined }));
  }

  const sanitizedQuery = query.trim().replace(/'/g, "''");

  // Use pg_trgm similarity search with fallback to ILIKE
  // We search name, description, and check keywords array
  try {
    const categoryFilter = category
      ? Prisma.sql`AND p."category" = ${category}`
      : Prisma.empty;

    const results = await prisma.$queryRaw<ProductSearchResult[]>`
      SELECT
        p.*,
        GREATEST(
          COALESCE(similarity(p."name", ${sanitizedQuery}), 0),
          COALESCE(similarity(COALESCE(p."description", ''), ${sanitizedQuery}), 0)
        ) AS similarity
      FROM "Product" p
      WHERE p."tenantId" = ${tenantId}
        AND p."isActive" = true
        AND p."inStock" = true
        ${categoryFilter}
        AND (
          similarity(p."name", ${sanitizedQuery}) > 0.1
          OR similarity(COALESCE(p."description", ''), ${sanitizedQuery}) > 0.1
          OR p."name" ILIKE ${'%' + sanitizedQuery + '%'}
          OR COALESCE(p."description", '') ILIKE ${'%' + sanitizedQuery + '%'}
          OR ${sanitizedQuery} = ANY(p."keywords")
          OR EXISTS (
            SELECT 1 FROM unnest(p."keywords") AS kw
            WHERE kw ILIKE ${'%' + sanitizedQuery + '%'}
          )
        )
      ORDER BY similarity DESC, p."name" ASC
      LIMIT ${limit}
    `;

    logger.debug(
      { tenantId, query, resultCount: results.length },
      'Product search completed'
    );

    return results;
  } catch (err) {
    // If pg_trgm is not available, fall back to simple ILIKE
    logger.warn({ err, tenantId, query }, 'pg_trgm search failed, falling back to ILIKE');

    const products = await prisma.product.findMany({
      where: {
        tenantId,
        isActive: true,
        inStock: true,
        ...(category ? { category } : {}),
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { keywords: { has: query } },
        ],
      },
      take: limit,
      orderBy: { name: 'asc' },
    });

    return products.map((p) => ({ ...p, similarity: undefined }));
  }
}

/**
 * Search products and format them for WhatsApp interactive list message.
 * Returns up to 10 products formatted as list sections.
 */
export async function searchProductsForWhatsApp(
  tenantId: string,
  query: string,
  limit = 10
): Promise<{
  products: ProductSearchResult[];
  sections: Array<{
    title: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  }>;
}> {
  const products = await searchProducts(tenantId, query, limit);

  if (products.length === 0) {
    return { products: [], sections: [] };
  }

  // Group by category for sections
  const byCategory = new Map<string, ProductSearchResult[]>();
  for (const product of products) {
    const cat = product.category || 'Products';
    if (!byCategory.has(cat)) {
      byCategory.set(cat, []);
    }
    byCategory.get(cat)!.push(product);
  }

  const sections = Array.from(byCategory.entries()).map(([title, items]) => ({
    title: title.substring(0, 24), // WhatsApp section title limit
    rows: items.map((item) => ({
      id: item.retailerId,
      title: item.name.substring(0, 24), // WhatsApp row title limit
      description: `${item.currency} ${Number(item.price).toFixed(2)}${item.description ? ' - ' + item.description.substring(0, 48) : ''}`,
    })),
  }));

  return { products, sections };
}
