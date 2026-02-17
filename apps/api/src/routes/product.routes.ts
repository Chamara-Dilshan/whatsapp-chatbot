import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
} from '@whatsapp-bot/shared';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import * as productService from '../services/product/product.service';
import * as productSearchService from '../services/product/productSearch.service';
import * as csvImportService from '../services/product/csvImport.service';
import { ValidationError } from '../middleware/errorHandler';

const router = Router();

// Multer config for CSV upload (memory storage, 5MB limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

// All product routes require authentication
router.use(requireAuth);

// ─── Product CRUD ────────────────────────────────────────────────

/**
 * GET /products
 * List products with optional query, category, inStock filters + pagination
 */
router.get('/products', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = productQuerySchema.parse(req.query);
    const tenantId = req.auth!.tenantId;

    // If query.query is provided, use fuzzy search
    if (query.query) {
      const results = await productSearchService.searchProducts(
        tenantId,
        query.query,
        query.limit,
        query.category
      );
      res.json({
        success: true,
        data: results,
        meta: { total: results.length, limit: query.limit, offset: query.offset },
      });
      return;
    }

    // Otherwise, regular listing with filters
    const { products, total } = await productService.listProducts(tenantId, query);
    res.json({
      success: true,
      data: products,
      meta: { total, limit: query.limit, offset: query.offset },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /products/categories
 * List distinct product categories for the tenant
 */
router.get('/products/categories', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await productService.getCategories(req.auth!.tenantId);
    res.json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /products/search
 * Fuzzy search products (dedicated endpoint)
 */
router.get('/products/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = productQuerySchema.parse(req.query);
    const tenantId = req.auth!.tenantId;

    const results = await productSearchService.searchProducts(
      tenantId,
      query.query || '',
      query.limit,
      query.category
    );

    res.json({
      success: true,
      data: results,
      meta: { total: results.length, limit: query.limit, offset: query.offset },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /products/:id
 * Get a single product by ID
 */
router.get('/products/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await productService.getProduct(req.auth!.tenantId, req.params.id);
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /products
 * Create a new product (owner/admin only)
 */
router.post(
  '/products',
  requireRole('owner', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = createProductSchema.parse(req.body);
      const product = await productService.createProduct(req.auth!.tenantId, input);
      res.status(201).json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /products/import
 * Import products from CSV file (owner/admin only)
 */
router.post(
  '/products/import',
  requireRole('owner', 'admin'),
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new ValidationError('CSV file is required. Use form field name "file".');
      }

      // Parse CSV
      const { products, errors: parseErrors } = csvImportService.parseCsvToProducts(req.file.buffer);

      if (products.length === 0 && parseErrors.length > 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'CSV_PARSE_ERROR',
            message: 'No valid products found in CSV',
            details: parseErrors,
          },
        });
        return;
      }

      // Bulk upsert
      const result = await productService.bulkUpsertProducts(req.auth!.tenantId, products);

      // Merge parse errors with DB errors
      const allErrors = [...parseErrors, ...result.errors];

      res.json({
        success: true,
        data: {
          imported: result.imported,
          skipped: result.skipped + parseErrors.length,
          errors: allErrors,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /products/:id
 * Update a product (owner/admin only)
 */
router.put(
  '/products/:id',
  requireRole('owner', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = updateProductSchema.parse(req.body);
      const product = await productService.updateProduct(req.auth!.tenantId, req.params.id, input);
      res.json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /products/:id
 * Soft-delete a product (owner/admin only)
 */
router.delete(
  '/products/:id',
  requireRole('owner', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await productService.deleteProduct(req.auth!.tenantId, req.params.id);
      res.json({ success: true, data: { deleted: true } });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
