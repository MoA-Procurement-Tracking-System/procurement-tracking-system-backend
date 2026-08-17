import {
  Prisma,
  ActivityStatus,
  PlanStatus,
  RevisionEntityType,
  RevisionChangeType,
  Role,
} from '../../generated/prisma/client.js';
import { prisma } from '../../config/database.js';
import { logRevision } from '../../shared/audit/revision.service.js';
import { generateStagesForActivity } from './stage-generator.js';

export const getActivitiesService = async (planId?: string) => {
  const where = planId ? { planId, isActive: true } : { isActive: true };
  return prisma.activity.findMany({
    where,
    include: { plan: true, lots: true, procurementMethod: true },
  });
};

export const getActivityByIdService = async (id: string) => {
  return prisma.activity.findUnique({
    where: { id },
    include: { plan: true, lots: true, procurementMethod: true },
  });
};

export const createActivityService = async (
  planId: string,
  data: Prisma.ActivityUncheckedCreateInput,
  lotsData: Prisma.ActivityLotCreateWithoutActivityInput[],
  userId: string,
) => {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const plan = await tx.plan.findUniqueOrThrow({ where: { id: planId } });
    const user = await tx.user.findUnique({ where: { id: userId } });

    // Officers must be assigned to the project and can only add activities to DRAFT or REJECTED plans
    if (user && user.role === Role.ProcurementOfficer) {
      const assignment = await tx.userProject.findUnique({
        where: { userId_projectId: { userId, projectId: plan.projectId } },
      });
      if (!assignment) {
        throw new Error('You are not assigned to this project.');
      }
      if (
        plan.status !== PlanStatus.DRAFT &&
        plan.status !== PlanStatus.REJECTED
      ) {
        throw new Error(
          'Cannot add activities to a plan that is not in DRAFT or REJECTED status.',
        );
      }
    }

    const activityCreateData: Prisma.ActivityUncheckedCreateInput = {
      ...data,
      planId,
      status: ActivityStatus.PLANNED,
    };

    if (lotsData && lotsData.length > 0) {
      activityCreateData.lots = {
        create: lotsData,
      };
    }

    const activity = await tx.activity.create({
      data: activityCreateData,
      include: { lots: true },
    });

    // Trigger stage generation immediately based on the selected procurement method
    await generateStagesForActivity(
      tx,
      activity.id,
      activity.procurementMethodId,
    );

    await logRevision(
      tx,
      RevisionEntityType.ACTIVITY,
      RevisionChangeType.CREATE,
      activity.id,
      userId,
      null,
      activity,
    );

    return activity;
  });
};

export const updateActivityService = async (
  id: string,
  data: Prisma.ActivityUncheckedUpdateInput,
  userId: string,
) => {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const oldActivity = await tx.activity.findUniqueOrThrow({
      where: { id },
      include: { plan: true },
    });
    const user = await tx.user.findUnique({ where: { id: userId } });

    // Ensure plan is editable by officer and officer is assigned to the project
    if (user && user.role === Role.ProcurementOfficer) {
      const assignment = await tx.userProject.findUnique({
        where: {
          userId_projectId: { userId, projectId: oldActivity.plan.projectId },
        },
      });
      if (!assignment) {
        throw new Error('You are not assigned to this project.');
      }
      if (
        oldActivity.plan.status !== PlanStatus.DRAFT &&
        oldActivity.plan.status !== PlanStatus.REJECTED
      ) {
        throw new Error(
          'Cannot edit activities in a plan that is not in DRAFT or REJECTED status.',
        );
      }
    }

    const activity = await tx.activity.update({
      where: { id },
      data,
    });

    await logRevision(
      tx,
      RevisionEntityType.ACTIVITY,
      RevisionChangeType.UPDATE,
      id,
      userId,
      oldActivity,
      activity,
    );

    return activity;
  });
};
