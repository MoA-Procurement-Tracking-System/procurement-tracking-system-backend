import {
  Prisma,
  PaymentStatus,
  UserRole,
} from '../../generated/prisma/index.js';
import { prisma } from '../../config/database.js';
import type { CreateAlertDto, UpdateAlertDto } from './alerts.schema.js';

export type AlertType =
  | 'PLAN_REVIEW'
  | 'CONTRACT_MILESTONE'
  | 'ACTIVITY_DEADLINE'
  | 'DECISION'
  | 'SYSTEM';

export type AlertSeverity = 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export interface AlertItem {
  id: string;
  title: string;
  message: string;
  createdAt: Date | string;
  targetRole?: string | undefined;
  readAt: Date | string | null;
  type: AlertType;
  severity: AlertSeverity;
  link?: string | undefined;
  contractId?: string | undefined;
  contractNo?: string | undefined;
}

interface PersistedNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  severity: string;
  link: string | null;
  readAt: Date | null;
  targetRole: string | null;
  createdAt: Date;
}

// In-memory store for user dynamic reads & manual CRUD fallback
const userDynamicReads = new Map<string, Map<string, Date>>();
const inMemoryAlerts: AlertItem[] = [];

export class AlertsService {
  /**
   * CREATE: Create a new alert
   */
  async createAlert(data: CreateAlertDto): Promise<AlertItem[]> {
    const createdItems: AlertItem[] = [];
    const now = new Date();
    const severity = (data.severity as AlertSeverity) || 'INFO';
    const type = (data.type as AlertType) || 'SYSTEM';

    // 1. If UserNotification table exists in DB, persist it
    try {
      const userNotificationModel = (
        prisma as unknown as Record<string, unknown>
      ).userNotification as
        | {
            create: (args: unknown) => Promise<PersistedNotification>;
            createMany: (args: unknown) => Promise<{ count: number }>;
          }
        | undefined;

      if (userNotificationModel) {
        if (data.userId) {
          const created = await userNotificationModel.create({
            data: {
              userId: data.userId,
              targetRole: data.targetRole,
              title: data.title,
              message: data.message,
              type,
              severity,
              link: data.link,
              readAt: null,
            },
          });
          return [
            {
              id: created.id,
              title: created.title,
              message: created.message,
              type: created.type as AlertType,
              severity: created.severity as AlertSeverity,
              link: created.link ?? undefined,
              targetRole: created.targetRole ?? undefined,
              readAt: null,
              createdAt: created.createdAt,
            },
          ];
        }

        if (data.targetRole && data.targetRole !== 'ALL') {
          const roleMatch =
            data.targetRole === 'MANAGEMENT_TEAM'
              ? 'MANAGEMENT'
              : data.targetRole;
          const targetUsers = await prisma.user.findMany({
            where: {
              authRole: roleMatch as UserRole,
              isActive: true,
            },
            select: { id: true },
          });

          if (targetUsers.length > 0) {
            await userNotificationModel.createMany({
              data: targetUsers.map((u) => ({
                userId: u.id,
                targetRole: data.targetRole,
                title: data.title,
                message: data.message,
                type,
                severity,
                link: data.link,
                readAt: null,
              })),
            });
          }
        }
      }
    } catch {
      // Table may not yet be pushed
    }

    // 2. Add to in-memory store so it is immediately visible
    const newItem: AlertItem = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: data.title,
      message: data.message,
      type,
      severity,
      link: data.link,
      targetRole: data.targetRole,
      readAt: null,
      createdAt: now,
    };
    inMemoryAlerts.unshift(newItem);
    createdItems.push(newItem);

    return createdItems;
  }

  /**
   * READ ALL: Get alerts for authenticated user/role
   */
  async getAlertsForUser(params: {
    userId: string;
    role?: string | undefined;
    region?: string | undefined;
    unreadOnly?: boolean | undefined;
  }): Promise<AlertItem[]> {
    const { userId, role, region, unreadOnly } = params;
    const normalizedRole = (role || 'OFFICER')
      .toUpperCase()
      .replace(/[\s-]/g, '_');
    const alerts: AlertItem[] = [];

    // 1. Fetch persisted user notifications from DB
    try {
      const userNotificationModel = (
        prisma as unknown as Record<string, unknown>
      ).userNotification as
        | {
            findMany: (args: unknown) => Promise<PersistedNotification[]>;
          }
        | undefined;

      if (userNotificationModel) {
        const persisted = await userNotificationModel.findMany({
          where: {
            userId,
            ...(unreadOnly ? { readAt: null } : {}),
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        });

        for (const item of persisted) {
          alerts.push({
            id: item.id,
            title: item.title,
            message: item.message,
            createdAt: item.createdAt,
            targetRole: item.targetRole || normalizedRole,
            readAt: item.readAt,
            type: (item.type as AlertType) || 'SYSTEM',
            severity: (item.severity as AlertSeverity) || 'INFO',
            link: item.link ?? undefined,
          });
        }
      }
    } catch {
      // Table may not yet be migrated; fallback to in-memory + dynamic
    }

    // 2. Include in-memory alerts matching this user or role
    for (const mem of inMemoryAlerts) {
      if (
        !mem.targetRole ||
        mem.targetRole === 'ALL' ||
        mem.targetRole === normalizedRole
      ) {
        if (!alerts.some((a) => a.id === mem.id)) {
          alerts.push(mem);
        }
      }
    }

    // 3. Generate dynamic event-based alerts
    const dynamicAlerts = await this.generateDynamicAlerts({
      userId,
      role: normalizedRole,
      region,
    });
    const userReads = userDynamicReads.get(userId) || new Map<string, Date>();

    for (const d of dynamicAlerts) {
      const readTimestamp = userReads.get(d.id) || null;
      if (unreadOnly && readTimestamp !== null) {
        continue;
      }
      alerts.push({
        ...d,
        readAt: readTimestamp,
      });
    }

    // Sort newest first
    alerts.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return alerts;
  }

  /**
   * READ ONE: Get single alert by ID
   */
  async getAlertById(id: string, userId?: string): Promise<AlertItem | null> {
    try {
      const userNotificationModel = (
        prisma as unknown as Record<string, unknown>
      ).userNotification as
        | {
            findUnique: (
              args: unknown,
            ) => Promise<PersistedNotification | null>;
          }
        | undefined;

      if (userNotificationModel) {
        const found = await userNotificationModel.findUnique({ where: { id } });
        if (found) {
          return {
            id: found.id,
            title: found.title,
            message: found.message,
            type: found.type as AlertType,
            severity: found.severity as AlertSeverity,
            link: found.link ?? undefined,
            targetRole: found.targetRole ?? undefined,
            readAt: found.readAt,
            createdAt: found.createdAt,
          };
        }
      }
    } catch {
      // Ignore
    }

    const inMem = inMemoryAlerts.find((a) => a.id === id);
    if (inMem) return inMem;

    // Check dynamic alerts
    const dynamicAlerts = await this.generateDynamicAlerts({
      userId: userId || 'anonymous',
      role: 'OFFICER',
    });
    return dynamicAlerts.find((a) => a.id === id) || null;
  }

  /**
   * UPDATE: Update alert by ID
   */
  async updateAlert(
    id: string,
    data: UpdateAlertDto,
  ): Promise<AlertItem | null> {
    try {
      const userNotificationModel = (
        prisma as unknown as Record<string, unknown>
      ).userNotification as
        | {
            update: (args: unknown) => Promise<PersistedNotification>;
          }
        | undefined;

      if (userNotificationModel) {
        const updated = await userNotificationModel.update({
          where: { id },
          data: {
            ...(data.title ? { title: data.title } : {}),
            ...(data.message ? { message: data.message } : {}),
            ...(data.type ? { type: data.type } : {}),
            ...(data.severity ? { severity: data.severity } : {}),
            ...(data.link !== undefined ? { link: data.link } : {}),
            ...(data.readAt !== undefined
              ? { readAt: data.readAt ? new Date(data.readAt) : null }
              : {}),
          },
        });

        return {
          id: updated.id,
          title: updated.title,
          message: updated.message,
          type: updated.type as AlertType,
          severity: updated.severity as AlertSeverity,
          link: updated.link ?? undefined,
          targetRole: updated.targetRole ?? undefined,
          readAt: updated.readAt,
          createdAt: updated.createdAt,
        };
      }
    } catch {
      // Ignore
    }

    const inMem = inMemoryAlerts.find((a) => a.id === id);
    if (inMem) {
      if (data.title) inMem.title = data.title;
      if (data.message) inMem.message = data.message;
      if (data.type) inMem.type = data.type as AlertType;
      if (data.severity) inMem.severity = data.severity as AlertSeverity;
      if (data.link !== undefined) inMem.link = data.link;
      if (data.readAt !== undefined)
        inMem.readAt = data.readAt ? new Date(data.readAt) : null;
      return inMem;
    }

    return null;
  }

  /**
   * DELETE: Delete/dismiss alert by ID
   */
  async deleteAlert(id: string): Promise<boolean> {
    let deleted = false;

    try {
      const userNotificationModel = (
        prisma as unknown as Record<string, unknown>
      ).userNotification as
        | {
            delete: (args: unknown) => Promise<PersistedNotification>;
          }
        | undefined;

      if (userNotificationModel) {
        await userNotificationModel.delete({ where: { id } });
        deleted = true;
      }
    } catch {
      // Ignore
    }

    const idx = inMemoryAlerts.findIndex((a) => a.id === id);
    if (idx >= 0) {
      inMemoryAlerts.splice(idx, 1);
      deleted = true;
    }

    return deleted;
  }

  async markAlertAsRead(
    alertId: string,
    userId: string,
  ): Promise<{ success: boolean; readAt: Date }> {
    const now = new Date();

    try {
      const userNotificationModel = (
        prisma as unknown as Record<string, unknown>
      ).userNotification as
        | {
            updateMany: (args: unknown) => Promise<{ count: number }>;
          }
        | undefined;

      if (userNotificationModel) {
        const updated = await userNotificationModel.updateMany({
          where: { id: alertId, userId },
          data: { readAt: now },
        });
        if (updated.count > 0) {
          return { success: true, readAt: now };
        }
      }
    } catch {
      // Ignore
    }

    const inMem = inMemoryAlerts.find((a) => a.id === alertId);
    if (inMem) {
      inMem.readAt = now;
    }

    let userReads = userDynamicReads.get(userId);
    if (!userReads) {
      userReads = new Map<string, Date>();
      userDynamicReads.set(userId, userReads);
    }
    userReads.set(alertId, now);

    return { success: true, readAt: now };
  }

  async markAllAlertsAsRead(
    userId: string,
  ): Promise<{ success: boolean; readAt: Date }> {
    const now = new Date();

    try {
      const userNotificationModel = (
        prisma as unknown as Record<string, unknown>
      ).userNotification as
        | {
            updateMany: (args: unknown) => Promise<{ count: number }>;
          }
        | undefined;

      if (userNotificationModel) {
        await userNotificationModel.updateMany({
          where: { userId, readAt: null },
          data: { readAt: now },
        });
      }
    } catch {
      // Ignore
    }

    for (const mem of inMemoryAlerts) {
      mem.readAt = now;
    }

    const alerts = await this.getAlertsForUser({ userId });
    let userReads = userDynamicReads.get(userId);
    if (!userReads) {
      userReads = new Map<string, Date>();
      userDynamicReads.set(userId, userReads);
    }
    for (const a of alerts) {
      userReads.set(a.id, now);
    }

    return { success: true, readAt: now };
  }

  private async generateDynamicAlerts(params: {
    userId: string;
    role: string;
    region?: string | undefined;
  }): Promise<AlertItem[]> {
    const { userId, role, region } = params;
    const items: AlertItem[] = [];
    const now = new Date();

    const isDirector = role === 'DIRECTOR';
    const isManagement = role === 'MANAGEMENT' || role === 'MANAGEMENT_TEAM';
    const isCommittee = role === 'ENDORSING_COMMITTEE' || isManagement;

    // Director alerts: Plans awaiting review
    if (isDirector) {
      try {
        const pendingPlans = await prisma.plan.findMany({
          where: {
            status: 'SUBMITTED',
            isActive: true,
          },
          include: {
            creator: { select: { name: true, displayName: true } },
            project: { select: { name: true, code: true } },
          },
          take: 10,
          orderBy: { createdAt: 'desc' },
        });

        for (const plan of pendingPlans) {
          const author =
            plan.creator?.displayName || plan.creator?.name || 'Officer';
          items.push({
            id: `alert-plan-sub-${plan.id}`,
            title: `Plan Awaiting Review: ${plan.title}`,
            message: `Procurement plan for "${plan.project?.name || plan.title}" was submitted by ${author} and is awaiting director review.`,
            createdAt: plan.createdAt,
            targetRole: 'DIRECTOR',
            readAt: null,
            type: 'PLAN_REVIEW',
            severity: 'HIGH',
            link: '/workspace/plan-for-review',
          });
        }
      } catch {
        // Ignore
      }
    }

    // Director & Management alerts: Track plans in WITH_COMMITTEE status & voting progress
    if (isDirector || isManagement) {
      try {
        const committeeCount = await prisma.user.count({
          where: {
            authRole: {
              in: [UserRole.ENDORSING_COMMITTEE, UserRole.MANAGEMENT],
            },
            isActive: true,
          },
        });

        const activeWithCommitteePlans = await prisma.plan.findMany({
          where: {
            status: 'WITH_COMMITTEE',
            isActive: true,
          },
          include: {
            project: { select: { name: true } },
            committeeVotes: true,
          },
          take: 10,
          orderBy: { updatedAt: 'desc' },
        });

        for (const plan of activeWithCommitteePlans) {
          const approveVotes = plan.committeeVotes.filter(
            (v: { decision: string }) => v.decision === 'APPROVE',
          ).length;
          const rejectVotes = plan.committeeVotes.filter(
            (v: { decision: string }) => v.decision === 'REJECT',
          ).length;
          const totalVoted = plan.committeeVotes.length;
          const pendingCount = Math.max(0, committeeCount - totalVoted);

          let message = '';
          let severity: AlertSeverity = 'MEDIUM';

          if (pendingCount > 0) {
            severity = 'HIGH';
            message = `Plan "${plan.title}" is under committee review. ${totalVoted}/${committeeCount} members voted (${approveVotes} approve, ${rejectVotes} reject). ${pendingCount} member(s) have not voted yet.`;
          } else {
            message = `All committee members have cast votes on "${plan.title}" (${approveVotes} approve, ${rejectVotes} reject). Ready for final outcome.`;
          }

          items.push({
            id: `alert-committee-progress-${plan.id}`,
            title:
              pendingCount > 0
                ? `Pending Committee Votes: ${plan.title}`
                : `Committee Voting Complete: ${plan.title}`,
            message,
            createdAt: plan.updatedAt || plan.createdAt,
            targetRole: role,
            readAt: null,
            type: 'PLAN_REVIEW',
            severity,
            link: '/workspace/plan-for-review',
          });
        }

        // Also show recently decided plans (Approved or Rejected by committee)
        const recentlyDecidedPlans = await prisma.plan.findMany({
          where: {
            status: { in: ['APPROVED', 'REJECTED'] },
            isActive: true,
          },
          take: 5,
          orderBy: { updatedAt: 'desc' },
        });

        for (const plan of recentlyDecidedPlans) {
          const isApproved = plan.status === 'APPROVED';
          items.push({
            id: `alert-decision-${plan.id}`,
            title: isApproved
              ? `Plan Approved: ${plan.title}`
              : `Plan Rejected: ${plan.title}`,
            message: isApproved
              ? `Procurement plan "${plan.title}" has been approved by the Endorsement Committee.`
              : `Procurement plan "${plan.title}" was rejected by the Endorsement Committee${plan.rejectionReason ? `: ${plan.rejectionReason}` : '.'}`,
            createdAt: plan.updatedAt,
            targetRole: role,
            readAt: null,
            type: 'DECISION',
            severity: isApproved ? 'INFO' : 'HIGH',
            link: '/workspace/plan-for-review',
          });
        }
      } catch {
        // Ignore
      }
    }

    // Committee Member alerts: Plans in WITH_COMMITTEE status requiring their vote
    if (isCommittee) {
      try {
        const committeePlans = await prisma.plan.findMany({
          where: {
            status: 'WITH_COMMITTEE',
            isActive: true,
          },
          include: {
            project: { select: { name: true } },
            committeeVotes: { where: { memberId: userId } },
          },
          take: 10,
          orderBy: { createdAt: 'desc' },
        });

        for (const plan of committeePlans) {
          const hasVoted =
            plan.committeeVotes && plan.committeeVotes.length > 0;
          if (!hasVoted) {
            items.push({
              id: `alert-vote-${plan.id}`,
              title: `Committee Endorsement Vote: ${plan.title}`,
              message: `Plan "${plan.title}" is currently open for committee vote and requires your decision.`,
              createdAt: plan.createdAt,
              targetRole: role,
              readAt: null,
              type: 'PLAN_REVIEW',
              severity: 'HIGH',
              link: '/workspace/plan-for-review',
            });
          }
        }
      } catch {
        // Ignore
      }
    }

    // Officer alerts: Plan updates requested or approved
    if (role === 'OFFICER') {
      try {
        const officerPlans = await prisma.plan.findMany({
          where: {
            createdBy: userId,
            status: { in: ['UPDATE_REQUESTED', 'APPROVED', 'REJECTED'] },
            isActive: true,
          },
          include: { project: { select: { name: true } } },
          take: 10,
          orderBy: { updatedAt: 'desc' },
        });

        for (const plan of officerPlans) {
          if (plan.status === 'UPDATE_REQUESTED') {
            items.push({
              id: `alert-revision-${plan.id}`,
              title: `Update Requested: ${plan.title}`,
              message: `Director has requested updates on procurement plan "${plan.title}".`,
              createdAt: plan.updatedAt,
              targetRole: 'OFFICER',
              readAt: null,
              type: 'DECISION',
              severity: 'HIGH',
              link: '/workspace/plan-management',
            });
          } else if (plan.status === 'APPROVED') {
            items.push({
              id: `alert-approved-${plan.id}`,
              title: `Plan Approved: ${plan.title}`,
              message: `Congratulations! Procurement plan "${plan.title}" has been approved.`,
              createdAt: plan.updatedAt,
              targetRole: 'OFFICER',
              readAt: null,
              type: 'DECISION',
              severity: 'INFO',
              link: '/workspace/plan-management',
            });
          }
        }
      } catch {
        // Ignore
      }
    }

    // Contract Milestones & Overdue Payments
    try {
      const where: Prisma.ContractWhereInput = {
        deletedAt: null,
        ...(region ? { region } : {}),
      };

      const contracts = await prisma.contract.findMany({
        where,
        include: {
          payments: {
            where: {
              deletedAt: null,
              status: PaymentStatus.PENDING,
            },
          },
        },
        take: 20,
      });

      for (const contract of contracts) {
        const totalVal = Number(contract.totalValue);
        const paidVal = Number(contract.paidAmount);

        for (const payment of contract.payments) {
          const daysPending = Math.floor(
            (now.getTime() - new Date(payment.createdAt).getTime()) /
              (1000 * 60 * 60 * 24),
          );

          if (daysPending > 30) {
            items.push({
              id: `alert-overdue-${payment.id}`,
              title: `Overdue Payment: ${contract.contractNo}`,
              message: `Payment ref ${payment.referenceNo ?? payment.id} has been pending for ${daysPending} days.`,
              createdAt: payment.createdAt,
              targetRole: 'DIRECTOR',
              readAt: null,
              type: 'CONTRACT_MILESTONE',
              severity: 'HIGH',
              link: '/workspace/contracts',
              contractId: contract.id,
              contractNo: contract.contractNo,
            });
          }
        }

        if (
          totalVal > 0 &&
          paidVal / totalVal >= 0.9 &&
          paidVal / totalVal < 1.0
        ) {
          items.push({
            id: `alert-completion-${contract.id}`,
            title: `Contract Near Completion: ${contract.contractNo}`,
            message: `Contract ${contract.contractNo} is over 90% paid (${((paidVal / totalVal) * 100).toFixed(1)}%).`,
            createdAt: contract.updatedAt || now,
            targetRole: 'DIRECTOR',
            readAt: null,
            type: 'CONTRACT_MILESTONE',
            severity: 'INFO',
            link: '/workspace/contracts',
            contractId: contract.id,
            contractNo: contract.contractNo,
          });
        }
      }
    } catch {
      // Ignore
    }

    return items;
  }
}

export async function createNotification(params: {
  userId?: string | undefined;
  targetRole?: string | undefined;
  title: string;
  message: string;
  type: AlertType;
  severity?: AlertSeverity | undefined;
  link?: string | undefined;
}): Promise<void> {
  const alertPayload: CreateAlertDto = {
    title: params.title,
    message: params.message,
    type: params.type,
    severity: params.severity || 'INFO',
    ...(params.userId !== undefined ? { userId: params.userId } : {}),
    ...(params.targetRole !== undefined
      ? { targetRole: params.targetRole as CreateAlertDto['targetRole'] }
      : {}),
    ...(params.link !== undefined ? { link: params.link } : {}),
  };

  try {
    const userNotificationModel = (prisma as unknown as Record<string, unknown>)
      .userNotification as
      | {
          create: (args: unknown) => Promise<unknown>;
          createMany: (args: unknown) => Promise<unknown>;
        }
      | undefined;

    if (!userNotificationModel) {
      alertsService.createAlert(alertPayload).catch(() => {});
      return;
    }

    if (params.userId) {
      await userNotificationModel.create({
        data: {
          userId: params.userId,
          targetRole: params.targetRole,
          title: params.title,
          message: params.message,
          type: params.type,
          severity: params.severity || 'INFO',
          link: params.link,
          readAt: null,
        },
      });
      return;
    }

    if (params.targetRole) {
      const roleMatch =
        params.targetRole === 'MANAGEMENT_TEAM'
          ? 'MANAGEMENT'
          : params.targetRole;
      const users = await prisma.user.findMany({
        where: {
          authRole: roleMatch as UserRole,
          isActive: true,
        },
        select: { id: true },
      });

      if (users.length > 0) {
        await userNotificationModel.createMany({
          data: users.map((u) => ({
            userId: u.id,
            targetRole: params.targetRole,
            title: params.title,
            message: params.message,
            type: params.type,
            severity: params.severity || 'INFO',
            link: params.link,
            readAt: null,
          })),
        });
      }
    }
  } catch {
    alertsService.createAlert(alertPayload).catch(() => {});
  }
}

export const alertsService = new AlertsService();
