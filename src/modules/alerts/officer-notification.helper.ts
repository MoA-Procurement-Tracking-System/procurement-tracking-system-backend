import { prisma } from '../../config/database.js';
import { UserRole } from '../../generated/prisma/index.js';
import {
  createNotification,
  type AlertType,
  type AlertSeverity,
} from './alerts.service.js';

export interface NotifyOfficersParams {
  planId?: string | undefined;
  projectId?: string | undefined;
  creatorId?: string | null | undefined;
  actorUserId?: string | null | undefined;
  title: string;
  message: string;
  type?: AlertType | undefined;
  severity?: AlertSeverity | undefined;
  link?: string | undefined;
}

/**
 * Notifies all relevant Officers assigned to a Plan or Project whenever changes occur.
 * Excludes the actor themselves from receiving redundant self-notifications.
 */
export async function notifyOfficersOnEntityChange(
  params: NotifyOfficersParams,
): Promise<void> {
  const {
    planId,
    projectId: rawProjectId,
    creatorId: rawCreatorId,
    actorUserId,
    title,
    message,
    type = 'SYSTEM',
    severity = 'INFO',
    link = '/workspace/plan-management',
  } = params;

  try {
    let projectId = rawProjectId;
    let creatorId = rawCreatorId;

    if (planId && (!projectId || !creatorId)) {
      const plan = await prisma.plan.findUnique({
        where: { id: planId },
        select: { projectId: true, createdBy: true },
      });
      if (plan) {
        projectId = projectId || plan.projectId;
        creatorId = creatorId || plan.createdBy;
      }
    }

    const recipientIds = new Set<string>();

    // 1. Plan creator (if not the actor)
    if (creatorId && creatorId !== actorUserId) {
      recipientIds.add(creatorId);
    }

    // 2. Project assigned officers (from UserProject)
    if (projectId) {
      const projectOfficers = await prisma.userProject.findMany({
        where: {
          projectId,
          user: {
            authRole: UserRole.OFFICER,
            isActive: true,
          },
        },
        select: { userId: true },
      });

      for (const po of projectOfficers) {
        if (po.userId !== actorUserId) {
          recipientIds.add(po.userId);
        }
      }
    }

    // Dispatch notifications to resolved officers
    if (recipientIds.size > 0) {
      await Promise.all(
        Array.from(recipientIds).map((userId) =>
          createNotification({
            userId,
            title,
            message,
            type,
            severity,
            link,
          }),
        ),
      );
    } else if (!creatorId && !projectId) {
      // Fallback only if no specific project or plan could be identified
      await createNotification({
        targetRole: 'OFFICER',
        title,
        message,
        type,
        severity,
        link,
      });
    }
  } catch (err) {
    console.warn('notifyOfficersOnEntityChange warning:', err);
  }
}
