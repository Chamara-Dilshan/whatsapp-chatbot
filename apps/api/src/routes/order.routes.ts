/**
 * Order management routes.
 *
 * GET  /orders                      - List orders (filters: status, q)
 * GET  /orders/:id                  - Get single order with items + shipment
 * POST /orders                      - Create order (admin/owner)
 * PUT  /orders/:id                  - Update order status/notes (admin/owner)
 * POST /orders/:id/mark-shipped     - Mark as shipped, upsert shipment
 * POST /orders/:id/mark-delivered   - Mark as delivered
 * POST /orders/:id/cancel           - Cancel order
 * POST /orders/:id/refund           - Refund order
 * POST /shipments/:id/update-status - Update shipment latest status text
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import * as orderService from '../services/order/order.service';
import * as shipmentService from '../services/order/shipment.service';
import * as automationService from '../services/automation/automation.service';
import { logger } from '../lib/logger';

const router = Router();
router.use(requireAuth);

// ── GET /orders ────────────────────────────────────────────────────────────
router.get('/orders', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.auth!;
    const { status, q, limit = '20', offset = '0' } = req.query as Record<string, string>;

    const result = await orderService.listOrders(tenantId, {
      status,
      q,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// ── GET /orders/:id ────────────────────────────────────────────────────────
router.get('/orders/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.auth!;
    const order = await orderService.getOrderById(tenantId, req.params.id);
    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
});

// ── POST /orders ───────────────────────────────────────────────────────────
router.post(
  '/orders',
  requireRole('owner', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = req.auth!;
      const order = await orderService.createOrder(tenantId, req.body);
      res.status(201).json({ success: true, data: order });
    } catch (err) {
      next(err);
    }
  }
);

// ── PUT /orders/:id ────────────────────────────────────────────────────────
router.put(
  '/orders/:id',
  requireRole('owner', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = req.auth!;
      const order = await orderService.updateOrder(tenantId, req.params.id, req.body);
      res.json({ success: true, data: order });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /orders/:id/mark-shipped ──────────────────────────────────────────
router.post(
  '/orders/:id/mark-shipped',
  requireRole('owner', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = req.auth!;
      const order = await orderService.markShipped(tenantId, req.params.id, {
        carrier: req.body.carrier,
        trackingNumber: req.body.trackingNumber,
        trackingUrl: req.body.trackingUrl,
      });

      // Emit automation event for n8n
      await automationService.createAutomationEvent({
        tenantId,
        eventType: 'order.shipped',
        payload: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerPhone: order.customerPhone,
          trackingNumber: req.body.trackingNumber,
        },
      });

      res.json({ success: true, data: order });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /orders/:id/mark-delivered ───────────────────────────────────────
router.post(
  '/orders/:id/mark-delivered',
  requireRole('owner', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = req.auth!;
      const order = await orderService.markDelivered(tenantId, req.params.id);

      // Emit automation event for n8n post-delivery flow
      await automationService.createAutomationEvent({
        tenantId,
        eventType: 'order.delivered',
        payload: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerPhone: order.customerPhone,
          deliveredAt: new Date().toISOString(),
        },
      });

      res.json({ success: true, data: order });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /orders/:id/cancel ────────────────────────────────────────────────
router.post(
  '/orders/:id/cancel',
  requireRole('owner', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = req.auth!;
      const order = await orderService.cancelOrder(tenantId, req.params.id);
      res.json({ success: true, data: order });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /orders/:id/refund ────────────────────────────────────────────────
router.post(
  '/orders/:id/refund',
  requireRole('owner', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = req.auth!;
      const order = await orderService.refundOrder(tenantId, req.params.id);
      res.json({ success: true, data: order });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /shipments/:id/update-status ─────────────────────────────────────
router.post(
  '/shipments/:id/update-status',
  requireRole('owner', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = req.auth!;
      const { statusText } = req.body;

      if (!statusText) {
        res.status(400).json({ error: 'statusText is required' });
        return;
      }

      const shipment = await shipmentService.updateTrackingStatus(tenantId, req.params.id, statusText);
      res.json({ success: true, data: shipment });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
