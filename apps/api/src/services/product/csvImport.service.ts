import { parse } from 'csv-parse/sync';
import { createProductSchema } from '@whatsapp-bot/shared';
import { logger } from '../../lib/logger';
import type { CreateProductInput } from '@whatsapp-bot/shared';

interface CsvRow {
  retailerId?: string;
  retailer_id?: string;
  name?: string;
  description?: string;
  price?: string;
  currency?: string;
  imageUrl?: string;
  image_url?: string;
  category?: string;
  keywords?: string;
  inStock?: string;
  in_stock?: string;
}

/**
 * Parse a CSV buffer into validated product inputs.
 * Supports both camelCase and snake_case column headers.
 *
 * Expected CSV columns:
 *  retailerId (or retailer_id), name, description, price, currency,
 *  imageUrl (or image_url), category, keywords (comma-separated), inStock (or in_stock)
 */
export function parseCsvToProducts(
  csvBuffer: Buffer
): { products: CreateProductInput[]; errors: Array<{ row: number; error: string }> } {
  const products: CreateProductInput[] = [];
  const errors: Array<{ row: number; error: string }> = [];

  let records: CsvRow[];
  try {
    records = parse(csvBuffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      relaxColumnCount: true,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error({ err }, 'CSV parse error');
    throw new Error(`Failed to parse CSV: ${errorMsg}`);
  }

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const rowNum = i + 2; // 1-indexed + header row

    try {
      // Normalize column names (support both camelCase and snake_case)
      const normalized = {
        retailerId: row.retailerId || row.retailer_id || '',
        name: row.name || '',
        description: row.description || undefined,
        price: parseFloat(row.price || '0'),
        currency: row.currency || 'USD',
        imageUrl: row.imageUrl || row.image_url || undefined,
        category: row.category || undefined,
        keywords: row.keywords ? row.keywords.split(',').map((k) => k.trim()).filter(Boolean) : [],
        inStock: row.inStock !== undefined
          ? row.inStock.toLowerCase() !== 'false' && row.inStock !== '0'
          : row.in_stock !== undefined
            ? row.in_stock.toLowerCase() !== 'false' && row.in_stock !== '0'
            : true,
      };

      // Remove undefined values so Zod defaults can apply
      const cleaned: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(normalized)) {
        if (value !== undefined && value !== '') {
          cleaned[key] = value;
        }
      }
      // retailerId and name are required
      cleaned.retailerId = normalized.retailerId;
      cleaned.name = normalized.name;
      cleaned.price = normalized.price;

      const validated = createProductSchema.parse(cleaned);
      products.push(validated);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      errors.push({ row: rowNum, error: errorMsg });
    }
  }

  logger.info(
    { parsedCount: products.length, errorCount: errors.length },
    'CSV parsing completed'
  );

  return { products, errors };
}
