import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import * as sendService from '../whatsapp/send.service';
import * as messageService from '../message/message.service';
import * as conversationService from '../conversation/conversation.service';

/**
 * List conversations in inbox (needs_agent or agent status).
 */
export async function listInboxConversations(
  tenantId: string,
  filters: {
    status?: 'needs_agent' | 'agent' | 'all';
    assignedTo?: string;
    limit?: number;
    offset?: number;
  } = {}
) {
  const { status = 'all', assignedTo, limit = 50, offset = 0 } = filters;

  const where: any = {
    tenantId,
  };

  // Filter by status
  if (status === 'all') {
    where.status = { in: ['needs_agent', 'agent'] };
  } else {
    where.status = status;
  }

  // Filter by assigned agent
  if (assignedTo) {
    where.assignedToUserId = assignedTo;
  }

  const [conversations, total] = await Promise.all([
    prisma.conversation.findMany({
      where,
      include: {
        customer: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        cases: {
          where: {
            status: { in: ['open', 'in_progress'] },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: [
        { lastMessageAt: 'desc' },
      ],
      take: limit,
      skip: offset,
    }),
    prisma.conversation.count({ where }),
  ]);

  return { conversations, total, limit, offset };
}

/**
 * Get a single inbox conversation with full details and message history.
 */
export async function getInboxConversation(conversationId: string, tenantId: string) {
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      tenantId,
    },
    include: {
      customer: true,
      messages: {
        orderBy: { createdAt: 'asc' },
      },
      cases: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!conversation) {
    return null;
  }

  return conversation;
}

/**
 * Assign a conversation to an agent.
 */
export async function assignConversation(
  conversationId: string,
  tenantId: string,
  assignedToUserId: string | null
) {
  // Verify the user belongs to this tenant
  if (assignedToUserId) {
    const user = await prisma.tenantUser.findFirst({
      where: {
        id: assignedToUserId,
        tenantId,
      },
    });

    if (!user) {
      throw new Error('User not found or does not belong to this tenant');
    }
  }

  // Update conversation
  const conversation = await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      assignedToUserId,
      status: assignedToUserId ? 'agent' : 'needs_agent',
    },
    include: {
      customer: true,
    },
  });

  // Update any open cases for this conversation
  await prisma.case.updateMany({
    where: {
      conversationId,
      status: { in: ['open', 'in_progress'] },
    },
    data: {
      assignedTo: assignedToUserId,
      status: assignedToUserId ? 'in_progress' : 'open',
    },
  });

  logger.info(
    { conversationId, assignedToUserId, tenantId },
    'Conversation assigned'
  );

  return conversation;
}

/**
 * Send a reply from an agent to a customer.
 */
export async function sendAgentReply(
  conversationId: string,
  tenantId: string,
  agentUserId: string,
  message: string
) {
  // Get conversation details
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, tenantId },
    include: { customer: true },
  });

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  // Send message via WhatsApp
  const sendResult = await sendService.sendText({
    tenantId,
    toWaId: conversation.customer.waId,
    text: message,
    conversationId,
  });

  // Save outbound message
  const messageRecord = await messageService.createOutbound({
    tenantId,
    conversationId,
    body: message,
    waMessageId: sendResult.waMessageId,
    sentBy: agentUserId,
  });

  // Update conversation timestamp
  await conversationService.onOutboundMessage(conversationId);

  // Update case first response time if applicable
  const openCase = await prisma.case.findFirst({
    where: {
      conversationId,
      status: { in: ['open', 'in_progress'] },
      firstResponseAt: null,
    },
  });

  if (openCase) {
    await prisma.case.update({
      where: { id: openCase.id },
      data: { firstResponseAt: new Date() },
    });
  }

  logger.info(
    { conversationId, agentUserId, messageId: messageRecord.id },
    'Agent sent reply'
  );

  return messageRecord;
}

/**
 * Close a conversation and any open cases.
 */
export async function closeConversation(
  conversationId: string,
  tenantId: string,
  resolution?: string
) {
  // Close conversation
  const conversation = await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      status: 'closed',
      closedAt: new Date(),
    },
  });

  // Close any open cases
  const openCases = await prisma.case.findMany({
    where: {
      conversationId,
      status: { in: ['open', 'in_progress'] },
    },
  });

  for (const caseRecord of openCases) {
    await prisma.case.update({
      where: { id: caseRecord.id },
      data: {
        status: 'closed',
        resolvedAt: new Date(),
        resolution: resolution || 'Conversation closed by agent',
      },
    });
  }

  logger.info({ conversationId, tenantId, casesCount: openCases.length }, 'Conversation closed');

  return conversation;
}

/**
 * Get inbox statistics for a tenant.
 */
export async function getInboxStats(tenantId: string, userId?: string) {
  const where: any = { tenantId };
  if (userId) {
    where.assignedToUserId = userId;
  }

  const [
    needsAgentCount,
    agentCount,
    unassignedCount,
    myAssignedCount,
  ] = await Promise.all([
    prisma.conversation.count({
      where: { ...where, status: 'needs_agent' },
    }),
    prisma.conversation.count({
      where: { ...where, status: 'agent' },
    }),
    prisma.conversation.count({
      where: { tenantId, status: 'needs_agent', assignedToUserId: null },
    }),
    userId
      ? prisma.conversation.count({
          where: { tenantId, assignedToUserId: userId, status: { in: ['needs_agent', 'agent'] } },
        })
      : 0,
  ]);

  return {
    needsAgent: needsAgentCount,
    inProgress: agentCount,
    unassigned: unassignedCount,
    myAssigned: myAssignedCount,
    total: needsAgentCount + agentCount,
  };
}
