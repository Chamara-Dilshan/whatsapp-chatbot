import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import * as caseService from '../services/case/case.service';
import { logger } from '../lib/logger';

const router = Router();

/**
 * GET /cases
 * List cases for tenant.
 */
router.get('/cases', requireAuth, async (req, res, next) => {
  try {
    const tenantId = req.auth!.tenantId;
    const { status, assignedTo, priority, limit, offset } = req.query;

    const result = await caseService.listCases(tenantId, {
      status: status as string,
      assignedTo: assignedTo as string,
      priority: priority as string,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /cases/:caseId
 * Get case by ID.
 */
router.get('/cases/:caseId', requireAuth, async (req, res, next) => {
  try {
    const tenantId = req.auth!.tenantId;
    const { caseId } = req.params;

    const caseRecord = await caseService.getCaseById(caseId, tenantId);

    if (!caseRecord) {
      return res.status(404).json({ error: 'Case not found' });
    }

    res.json(caseRecord);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /cases
 * Create a new case.
 */
router.post('/cases', requireAuth, async (req, res, next) => {
  try {
    const tenantId = req.auth!.tenantId;
    const { conversationId, subject, priority, assignedTo, tags } = req.body;

    if (!conversationId) {
      return res.status(400).json({ error: 'conversationId is required' });
    }

    const caseRecord = await caseService.createCase({
      tenantId,
      conversationId,
      subject,
      priority,
      assignedTo,
      tags,
    });

    res.status(201).json(caseRecord);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /cases/:caseId
 * Update a case.
 */
router.put('/cases/:caseId', requireAuth, async (req, res, next) => {
  try {
    const tenantId = req.auth!.tenantId;
    const { caseId } = req.params;
    const { subject, priority, status, assignedTo, tags, notes, resolution } = req.body;

    const caseRecord = await caseService.updateCase(caseId, tenantId, {
      subject,
      priority,
      status,
      assignedTo,
      tags,
      notes,
      resolution,
    });

    res.json(caseRecord);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /cases/:caseId/assign
 * Assign case to agent.
 */
router.post('/cases/:caseId/assign', requireAuth, async (req, res, next) => {
  try {
    const tenantId = req.auth!.tenantId;
    const { caseId } = req.params;
    const { assignedTo } = req.body;

    const caseRecord = await caseService.assignCase(caseId, tenantId, assignedTo);

    res.json(caseRecord);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /cases/:caseId/close
 * Close a case.
 */
router.post('/cases/:caseId/close', requireAuth, async (req, res, next) => {
  try {
    const tenantId = req.auth!.tenantId;
    const { caseId } = req.params;
    const { resolution } = req.body;

    const caseRecord = await caseService.closeCase(caseId, tenantId, resolution);

    res.json(caseRecord);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /cases/:caseId/sla
 * Get SLA metrics for a case.
 */
router.get('/cases/:caseId/sla', requireAuth, async (req, res, next) => {
  try {
    const { caseId } = req.params;

    const slaMetrics = await caseService.computeCaseSLA(caseId);

    if (!slaMetrics) {
      return res.status(404).json({ error: 'Case not found' });
    }

    res.json(slaMetrics);
  } catch (error) {
    next(error);
  }
});

export default router;
