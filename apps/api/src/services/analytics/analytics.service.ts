import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Get overview analytics for a tenant.
 */
export async function getOverviewAnalytics(tenantId: string, dateRange?: DateRange) {
  const where: any = { tenantId };

  if (dateRange) {
    where.createdAt = {
      gte: dateRange.startDate,
      lte: dateRange.endDate,
    };
  }

  const [
    totalConversations,
    activeConversations,
    totalCases,
    openCases,
    totalMessages,
    avgResponseTime,
    slaBreaches,
  ] = await Promise.all([
    // Total conversations
    prisma.conversation.count({ where }),

    // Active conversations (not closed)
    prisma.conversation.count({
      where: { ...where, status: { not: 'closed' } },
    }),

    // Total cases
    prisma.case.count({ where }),

    // Open cases
    prisma.case.count({
      where: { ...where, status: { in: ['open', 'in_progress'] } },
    }),

    // Total messages
    prisma.message.count({ where }),

    // Average first response time (in minutes)
    (async () => {
      // Get cases with first response time
      const cases = await prisma.case.findMany({
        where: {
          ...where,
          firstResponseAt: { not: null },
        },
        select: {
          createdAt: true,
          firstResponseAt: true,
        },
      });

      if (cases.length === 0) return null;

      const totalMinutes = cases.reduce((sum, c) => {
        const diff =
          c.firstResponseAt!.getTime() - c.createdAt.getTime();
        return sum + diff / 1000 / 60;
      }, 0);

      return Math.round(totalMinutes / cases.length);
    })(),

    // SLA breaches (cases that exceeded SLA deadline)
    (async () => {
      // Get cases with SLA and resolution data
      const cases = await prisma.case.findMany({
        where: {
          ...where,
          slaDeadline: { not: null },
          resolvedAt: { not: null },
        },
        select: {
          slaDeadline: true,
          resolvedAt: true,
        },
      });

      // Count actual breaches by comparing resolvedAt > slaDeadline
      const breachCount = cases.filter(
        (c) => c.resolvedAt! > c.slaDeadline!
      ).length;

      return breachCount;
    })(),
  ]);

  return {
    totalConversations,
    activeConversations,
    totalCases,
    openCases,
    totalMessages,
    avgResponseTime,
    slaBreaches,
  };
}

/**
 * Get intent distribution analytics.
 */
export async function getIntentAnalytics(tenantId: string, dateRange?: DateRange) {
  const where: any = { tenantId, intent: { not: null } };

  if (dateRange) {
    where.createdAt = {
      gte: dateRange.startDate,
      lte: dateRange.endDate,
    };
  }

  const messages = await prisma.message.groupBy({
    by: ['intent'],
    where,
    _count: {
      id: true,
    },
    orderBy: {
      _count: {
        id: 'desc',
      },
    },
  });

  return messages.map((m) => ({
    intent: m.intent!,
    count: m._count.id,
  }));
}

/**
 * Get agent performance analytics.
 */
export async function getAgentAnalytics(tenantId: string, dateRange?: DateRange) {
  const where: any = { tenantId };

  if (dateRange) {
    where.createdAt = {
      gte: dateRange.startDate,
      lte: dateRange.endDate,
    };
  }

  // Get all agents
  const agents = await prisma.tenantUser.findMany({
    where: { tenantId },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  const agentStats = await Promise.all(
    agents.map(async (agent) => {
      const [assignedConversations, sentMessages, resolvedCases, avgResolutionTime] =
        await Promise.all([
          // Assigned conversations
          prisma.conversation.count({
            where: { ...where, assignedToUserId: agent.id },
          }),

          // Messages sent by agent
          prisma.message.count({
            where: { ...where, sentBy: agent.id },
          }),

          // Resolved cases
          prisma.case.count({
            where: {
              ...where,
              assignedTo: agent.id,
              status: { in: ['resolved', 'closed'] },
            },
          }),

          // Average resolution time
          prisma.case
            .findMany({
              where: {
                ...where,
                assignedTo: agent.id,
                resolvedAt: { not: null },
              },
              select: {
                createdAt: true,
                resolvedAt: true,
              },
            })
            .then((cases) => {
              if (cases.length === 0) return null;

              const totalMinutes = cases.reduce((sum, c) => {
                const diff = c.resolvedAt!.getTime() - c.createdAt.getTime();
                return sum + diff / 1000 / 60;
              }, 0);

              return Math.round(totalMinutes / cases.length);
            }),
        ]);

      return {
        agentId: agent.id,
        agentName: agent.name,
        agentEmail: agent.email,
        assignedConversations,
        sentMessages,
        resolvedCases,
        avgResolutionTime,
      };
    })
  );

  return agentStats;
}

/**
 * Get SLA performance metrics.
 */
export async function getSLAMetrics(tenantId: string, dateRange?: DateRange) {
  const where: any = { tenantId };

  if (dateRange) {
    where.createdAt = {
      gte: dateRange.startDate,
      lte: dateRange.endDate,
    };
  }

  // Get all cases with SLA data
  const cases = await prisma.case.findMany({
    where: {
      ...where,
      slaDeadline: { not: null },
    },
    select: {
      priority: true,
      slaDeadline: true,
      resolvedAt: true,
      createdAt: true,
      firstResponseAt: true,
    },
  });

  // Calculate metrics by priority
  const metricsByPriority: Record<string, any> = {};

  for (const caseRecord of cases) {
    const priority = caseRecord.priority;

    if (!metricsByPriority[priority]) {
      metricsByPriority[priority] = {
        priority,
        total: 0,
        resolved: 0,
        breached: 0,
        avgResponseTime: 0,
        avgResolutionTime: 0,
        responseTimes: [],
        resolutionTimes: [],
      };
    }

    const stats = metricsByPriority[priority];
    stats.total++;

    // First response time
    if (caseRecord.firstResponseAt) {
      const responseTime =
        (caseRecord.firstResponseAt.getTime() - caseRecord.createdAt.getTime()) / 1000 / 60;
      stats.responseTimes.push(responseTime);
    }

    // Resolution tracking
    if (caseRecord.resolvedAt) {
      stats.resolved++;

      const resolutionTime =
        (caseRecord.resolvedAt.getTime() - caseRecord.createdAt.getTime()) / 1000 / 60;
      stats.resolutionTimes.push(resolutionTime);

      // Check SLA breach
      if (caseRecord.resolvedAt > caseRecord.slaDeadline!) {
        stats.breached++;
      }
    }
  }

  // Calculate averages
  const slaMetrics = Object.values(metricsByPriority).map((stats: any) => {
    const avgResponseTime =
      stats.responseTimes.length > 0
        ? Math.round(
            stats.responseTimes.reduce((a: number, b: number) => a + b, 0) /
              stats.responseTimes.length
          )
        : null;

    const avgResolutionTime =
      stats.resolutionTimes.length > 0
        ? Math.round(
            stats.resolutionTimes.reduce((a: number, b: number) => a + b, 0) /
              stats.resolutionTimes.length
          )
        : null;

    const slaCompliance =
      stats.resolved > 0 ? ((stats.resolved - stats.breached) / stats.resolved) * 100 : 100;

    return {
      priority: stats.priority,
      total: stats.total,
      resolved: stats.resolved,
      breached: stats.breached,
      slaCompliance: Math.round(slaCompliance),
      avgResponseTime,
      avgResolutionTime,
    };
  });

  return slaMetrics;
}
