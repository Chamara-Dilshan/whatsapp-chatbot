import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';

interface CreateCaseInput {
  tenantId: string;
  conversationId: string;
  subject?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  tags?: string[];
}

interface UpdateCaseInput {
  subject?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: 'open' | 'in_progress' | 'resolved' | 'closed';
  assignedTo?: string | null;
  tags?: string[];
  notes?: string;
  resolution?: string;
}

/**
 * Create a new case for a conversation.
 * Automatically calculates SLA deadline based on tenant policies.
 */
export async function createCase(input: CreateCaseInput) {
  const { tenantId, conversationId, subject, priority = 'medium', assignedTo, tags = [] } = input;

  // Calculate SLA deadline (default: 24 hours for medium priority)
  const slaHours = getSLAHours(priority);
  const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000);

  // Get conversation details for subject generation
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      customer: true,
      messages: {
        where: { direction: 'inbound' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  // Generate subject from last customer message if not provided
  const generatedSubject =
    subject ||
    (conversation?.messages[0]?.body
      ? `Support request: ${conversation.messages[0].body.substring(0, 50)}...`
      : 'Customer support request');

  const caseRecord = await prisma.case.create({
    data: {
      tenantId,
      conversationId,
      subject: generatedSubject,
      priority,
      assignedTo,
      tags,
      slaDeadline,
      status: 'open',
    },
    include: {
      conversation: {
        include: {
          customer: true,
        },
      },
    },
  });

  logger.info({ caseId: caseRecord.id, conversationId, tenantId }, 'Case created');

  return caseRecord;
}

/**
 * Get case by ID with related data.
 */
export async function getCaseById(caseId: string, tenantId: string) {
  const caseRecord = await prisma.case.findFirst({
    where: { id: caseId, tenantId },
    include: {
      conversation: {
        include: {
          customer: true,
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      },
    },
  });

  return caseRecord;
}

/**
 * List cases for a tenant with filters.
 */
export async function listCases(
  tenantId: string,
  filters: {
    status?: string;
    assignedTo?: string;
    priority?: string;
    limit?: number;
    offset?: number;
  } = {}
) {
  const { status, assignedTo, priority, limit = 50, offset = 0 } = filters;

  const where: any = { tenantId };
  if (status) where.status = status;
  if (assignedTo) where.assignedTo = assignedTo;
  if (priority) where.priority = priority;

  const [cases, total] = await Promise.all([
    prisma.case.findMany({
      where,
      include: {
        conversation: {
          include: {
            customer: true,
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      skip: offset,
    }),
    prisma.case.count({ where }),
  ]);

  return { cases, total, limit, offset };
}

/**
 * Update a case.
 */
export async function updateCase(caseId: string, tenantId: string, input: UpdateCaseInput) {
  const updateData: any = { ...input };

  // Track first response time
  if (input.status === 'in_progress') {
    const existing = await prisma.case.findFirst({
      where: { id: caseId, tenantId },
      select: { firstResponseAt: true },
    });

    if (!existing?.firstResponseAt) {
      updateData.firstResponseAt = new Date();
    }
  }

  // Track resolution time
  if (input.status === 'resolved' || input.status === 'closed') {
    const existing = await prisma.case.findFirst({
      where: { id: caseId, tenantId },
      select: { resolvedAt: true },
    });

    if (!existing?.resolvedAt) {
      updateData.resolvedAt = new Date();
    }
  }

  const caseRecord = await prisma.case.update({
    where: { id: caseId },
    data: updateData,
    include: {
      conversation: {
        include: {
          customer: true,
        },
      },
    },
  });

  logger.info({ caseId, tenantId, updates: Object.keys(input) }, 'Case updated');

  return caseRecord;
}

/**
 * Assign case to an agent.
 */
export async function assignCase(caseId: string, tenantId: string, assignedTo: string | null) {
  return updateCase(caseId, tenantId, { assignedTo, status: assignedTo ? 'in_progress' : 'open' });
}

/**
 * Close a case with resolution.
 */
export async function closeCase(caseId: string, tenantId: string, resolution?: string) {
  const caseRecord = await updateCase(caseId, tenantId, {
    status: 'closed',
    resolution,
  });

  // Also close the conversation
  await prisma.conversation.update({
    where: { id: caseRecord.conversationId },
    data: {
      status: 'closed',
      closedAt: new Date(),
    },
  });

  logger.info({ caseId, tenantId }, 'Case closed');

  return caseRecord;
}

/**
 * Get SLA hours based on priority.
 */
function getSLAHours(priority: string): number {
  switch (priority) {
    case 'urgent':
      return 4;
    case 'high':
      return 8;
    case 'medium':
      return 24;
    case 'low':
      return 48;
    default:
      return 24;
  }
}

/**
 * Compute SLA metrics for a case.
 */
export async function computeCaseSLA(caseId: string) {
  const caseRecord = await prisma.case.findUnique({
    where: { id: caseId },
  });

  if (!caseRecord) return null;

  const now = new Date();
  const createdAt = caseRecord.createdAt;
  const firstResponseAt = caseRecord.firstResponseAt;
  const resolvedAt = caseRecord.resolvedAt;
  const slaDeadline = caseRecord.slaDeadline;

  // Time to first response (in minutes)
  const timeToFirstResponse = firstResponseAt
    ? Math.floor((firstResponseAt.getTime() - createdAt.getTime()) / 1000 / 60)
    : null;

  // Time to resolution (in minutes)
  const timeToResolution = resolvedAt
    ? Math.floor((resolvedAt.getTime() - createdAt.getTime()) / 1000 / 60)
    : null;

  // SLA breach
  const slaBreached = slaDeadline && !resolvedAt && now > slaDeadline;

  // Time until SLA deadline (in minutes, negative if breached)
  const timeUntilSLA = slaDeadline
    ? Math.floor((slaDeadline.getTime() - now.getTime()) / 1000 / 60)
    : null;

  return {
    caseId,
    timeToFirstResponse,
    timeToResolution,
    slaBreached,
    timeUntilSLA,
    slaDeadline,
  };
}
