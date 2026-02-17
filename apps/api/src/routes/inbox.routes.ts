import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import * as inboxService from '../services/inbox/inbox.service';
import { logger } from '../lib/logger';

const router = Router();

/**
 * GET /inbox
 * List inbox conversations (needs_agent or agent status).
 */
router.get('/inbox', requireAuth, async (req, res, next) => {
  try {
    const tenantId = req.auth!.tenantId;
    const { status, assignedTo, limit, offset } = req.query;

    const result = await inboxService.listInboxConversations(tenantId, {
      status: status as any,
      assignedTo: assignedTo as string,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /inbox/stats
 * Get inbox statistics.
 */
router.get('/inbox/stats', requireAuth, async (req, res, next) => {
  try {
    const tenantId = req.auth!.tenantId;
    const userId = req.query.userId as string | undefined;

    const stats = await inboxService.getInboxStats(tenantId, userId);

    res.json(stats);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /inbox/:conversationId
 * Get a single inbox conversation with full details.
 */
router.get('/inbox/:conversationId', requireAuth, async (req, res, next) => {
  try {
    const tenantId = req.auth!.tenantId;
    const { conversationId } = req.params;

    const conversation = await inboxService.getInboxConversation(conversationId, tenantId);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json(conversation);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /inbox/:conversationId/assign
 * Assign a conversation to an agent.
 */
router.post('/inbox/:conversationId/assign', requireAuth, async (req, res, next) => {
  try {
    const tenantId = req.auth!.tenantId;
    const { conversationId } = req.params;
    const { assignedToUserId } = req.body;

    const conversation = await inboxService.assignConversation(
      conversationId,
      tenantId,
      assignedToUserId
    );

    res.json(conversation);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /inbox/:conversationId/reply
 * Send a reply from an agent.
 */
router.post('/inbox/:conversationId/reply', requireAuth, async (req, res, next) => {
  try {
    const tenantId = req.auth!.tenantId;
    const agentUserId = req.auth!.userId;
    const { conversationId } = req.params;
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const messageRecord = await inboxService.sendAgentReply(
      conversationId,
      tenantId,
      agentUserId,
      message
    );

    res.json(messageRecord);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /inbox/:conversationId/close
 * Close a conversation.
 */
router.post('/inbox/:conversationId/close', requireAuth, async (req, res, next) => {
  try {
    const tenantId = req.auth!.tenantId;
    const { conversationId } = req.params;
    const { resolution } = req.body;

    const conversation = await inboxService.closeConversation(
      conversationId,
      tenantId,
      resolution
    );

    res.json(conversation);
  } catch (error) {
    next(error);
  }
});

export default router;
