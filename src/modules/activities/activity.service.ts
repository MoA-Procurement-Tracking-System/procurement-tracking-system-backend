import {
  Prisma,
  ActivityStatus,
  PlanStatus,
  StageStatus,
  RevisionEntityType,
  RevisionChangeType,
  Role,
} from '../../generated/prisma/index.js';
import { prisma } from '../../config/database.js';
import { logRevision } from '../../shared/audit/revision.service.js';
import { generateStagesForActivity } from './stage-generator.js';
import type {
  CreateActivityInput,
  UpdateActivityInput,
  ReplanStageInput,
  UpdateStageInput,
  UpdateStageActualInput,
} from './activity.schema.js';

// ─── Reference ID Generation ─────────────────────────────────────────────────

async function generateActivityReference(
  procurementMethodId: string,
): Promise<string> {
  const method = await prisma.lookupValue.findUnique({
    where: { id: procurementMethodId },
  });
  const methodCode = (method?.code ?? 'UNK').toUpperCase().replace(/\s+/g, '_');

  const count = await prisma.activity.count({
    where: { procurementMethodId },
  });
  const seq = String(count + 1).padStart(6, '0');

  return `MOA-${methodCode}-${seq}`;
}

// ─── Get Activities ───────────────────────────────────────────────────────────

export const getActivitiesService = async (planId?: string) => {
  let where: Prisma.ActivityWhereInput = { isActive: true };
  if (planId) {
    where = {
      isActive: true,
      OR: [
        { planId: planId },
        { plan: { id: planId } },
        { plan: { title: planId } },
      ],
    };
  }
  return prisma.activity.findMany({
    where,
    include: {
      plan: { include: { project: true } },
      lots: true,
      fundings: true,
      components: true,
      procurementMethod: true,
      stages: {
        include: { stageType: true, revisions: true },
        orderBy: { sequence: 'asc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
};

// ─── Get Activity By ID ───────────────────────────────────────────────────────

export const getActivityByIdService = async (id: string) => {
  return prisma.activity.findUnique({
    where: { id },
    include: {
      plan: true,
      lots: true,
      fundings: true,
      components: true,
      procurementMethod: true,
      stages: {
        include: { stageType: true, revisions: true },
        orderBy: { sequence: 'asc' },
      },
    },
  });
};

// ─── Create Activity ──────────────────────────────────────────────────────────

export const createActivityService = async (
  data: CreateActivityInput,
  userId: string,
) => {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // 1. Resolve plan by ID or Title
    let plan = await tx.plan.findFirst({
      where: {
        OR: [{ id: data.planId }, { title: data.planId }],
      },
    });
    if (!plan) {
      plan = await tx.plan.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });
    }
    if (!plan) {
      throw new Error(`Plan not found for ID: ${data.planId}`);
    }

    // 2. Resolve Procurement Method ID or Code
    let resolvedMethodId = data.procurementMethodId;
    let method = await tx.lookupValue.findFirst({
      where: {
        OR: [
          { id: resolvedMethodId },
          { code: resolvedMethodId },
          { label: { contains: resolvedMethodId, mode: 'insensitive' } },
        ],
        type: 'PROCUREMENT_METHOD',
      },
    });
    if (!method) {
      method = await tx.lookupValue.findFirst({
        where: { type: 'PROCUREMENT_METHOD' },
      });
    }
    if (method) {
      resolvedMethodId = method.id;
    }

    const reference = await generateActivityReference(resolvedMethodId);

    const { lots, fundings, components, ...activityData } = data;
    delete (activityData as Partial<CreateActivityInput>).planId;
    delete (activityData as Partial<CreateActivityInput>).procurementMethodId;

    const createData: Prisma.ActivityCreateInput = {
      ...(activityData as unknown as Prisma.ActivityCreateInput),
      reference,
      plan: { connect: { id: plan.id } },
      procurementMethod: { connect: { id: resolvedMethodId } },
      status: ActivityStatus.PLANNED,
    };

    if (lots && lots.length > 0) {
      createData.lots = {
        create: lots as Prisma.ActivityLotCreateWithoutActivityInput[],
      };
    }

    if (fundings && fundings.length > 0) {
      createData.fundings = {
        create: fundings as Prisma.ActivityFundingCreateWithoutActivityInput[],
      };
    }

    if (components && components.length > 0) {
      createData.components = {
        create:
          components as Prisma.ActivityComponentCreateWithoutActivityInput[],
      };
    }

    const activity = await tx.activity.create({
      data: createData,
      include: { lots: true, fundings: true, components: true },
    });

    // Auto-generate roadmap stages based on procurement method
    try {
      await generateStagesForActivity(
        tx,
        activity.id,
        activity.procurementMethodId,
        data.stages || data.roadmap,
      );
    } catch (stageErr) {
      console.warn('generateStagesForActivity note:', stageErr);
    }

    try {
      if (userId) {
        await logRevision(
          tx,
          RevisionEntityType.ACTIVITY,
          RevisionChangeType.CREATE,
          activity.id,
          userId,
          null,
          activity,
        );
      }
    } catch (auditErr) {
      console.warn('logRevision activity create error:', auditErr);
    }

    return activity;
  });
};

// ─── Update Activity ──────────────────────────────────────────────────────────

export const updateActivityService = async (
  id: string,
  data: UpdateActivityInput,
  userId: string,
) => {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const oldActivity = await tx.activity.findUniqueOrThrow({
      where: { id },
      include: { plan: true },
    });
    const user = await tx.user.findUnique({ where: { id: userId } });

    if (user && user.role === Role.ProcurementOfficer) {
      const assignment = await tx.userProject.findUnique({
        where: {
          userId_projectId: { userId, projectId: oldActivity.plan.projectId },
        },
      });
      if (!assignment) throw new Error('You are not assigned to this project.');
      if (
        oldActivity.plan.status !== PlanStatus.DRAFT &&
        oldActivity.plan.status !== PlanStatus.REJECTED
      ) {
        throw new Error(
          'Cannot edit activities in a plan that is not in DRAFT or REJECTED status.',
        );
      }
    }

    const { lots, fundings, components, ...scalarData } = data;

    // Replace child records if provided
    if (fundings !== undefined) {
      await tx.activityFunding.deleteMany({ where: { activityId: id } });
    }
    if (components !== undefined) {
      await tx.activityComponent.deleteMany({ where: { activityId: id } });
    }
    if (lots !== undefined) {
      await tx.activityLot.deleteMany({ where: { activityId: id } });
    }

    const updateData: Prisma.ActivityUpdateInput = {
      ...(scalarData as unknown as Prisma.ActivityUpdateInput),
    };

    if (fundings !== undefined && fundings.length > 0) {
      updateData.fundings = {
        create: fundings as Prisma.ActivityFundingCreateWithoutActivityInput[],
      };
    }

    if (components !== undefined && components.length > 0) {
      updateData.components = {
        create:
          components as Prisma.ActivityComponentCreateWithoutActivityInput[],
      };
    }

    if (lots !== undefined && lots.length > 0) {
      updateData.lots = {
        create: lots as Prisma.ActivityLotCreateWithoutActivityInput[],
      };
    }

    const activity = await tx.activity.update({
      where: { id },
      data: updateData,
      include: { lots: true, fundings: true, components: true },
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

// ─── Stage: Update Planning Dates ────────────────────────────────────────────

export const updateStageService = async (
  stageId: string,
  data: UpdateStageInput,
) => {
  const updateData: Prisma.StageUpdateInput = {};
  if (data.plannedStartDate !== undefined) {
    updateData.plannedStartDate = data.plannedStartDate;
    if (data.currentTargetStartDate === undefined) {
      updateData.currentTargetStartDate = data.plannedStartDate;
    }
  }
  if (data.plannedEndDate !== undefined) {
    updateData.plannedEndDate = data.plannedEndDate;
    if (data.currentTargetEndDate === undefined) {
      updateData.currentTargetEndDate = data.plannedEndDate;
    }
  }
  if (data.currentTargetStartDate !== undefined) {
    updateData.currentTargetStartDate = data.currentTargetStartDate;
  }
  if (data.currentTargetEndDate !== undefined) {
    updateData.currentTargetEndDate = data.currentTargetEndDate;
  }
  if (data.plannedDays !== undefined) updateData.plannedDays = data.plannedDays;
  if (data.isNotApplicable !== undefined) {
    updateData.isNotApplicable = data.isNotApplicable;
    if (data.isNotApplicable) {
      updateData.status = StageStatus.NOT_APPLICABLE;
    }
  }
  if (data.status !== undefined) {
    updateData.status = data.status as StageStatus;
  }
  if (data.remarks !== undefined) updateData.remarks = data.remarks;

  return prisma.stage.update({
    where: { id: stageId },
    data: updateData,
  });
};

// ─── Stage: Record Actual Date ────────────────────────────────────────────────

export const updateStageActualService = async (
  stageId: string,
  data: UpdateStageActualInput,
) => {
  const updateData: Prisma.StageUpdateInput = {};
  if (data.actualStartDate !== undefined)
    updateData.actualStartDate = data.actualStartDate;
  if (data.actualEndDate !== undefined)
    updateData.actualEndDate = data.actualEndDate;
  if (data.status !== undefined) {
    updateData.status = data.status as StageStatus;
  } else if (data.actualEndDate !== undefined && data.actualEndDate !== null) {
    updateData.status = StageStatus.COMPLETED;
  } else if (
    data.actualStartDate !== undefined &&
    data.actualStartDate !== null
  ) {
    updateData.status = StageStatus.IN_PROGRESS;
  }
  if (data.remarks !== undefined) updateData.remarks = data.remarks;

  return prisma.stage.update({
    where: { id: stageId },
    data: updateData,
  });
};

// ─── Stage: Replan (create revision record) ───────────────────────────────────

export const replanStageService = async (
  stageId: string,
  data: ReplanStageInput,
  userId: string,
) => {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const stage = await tx.stage.findUniqueOrThrow({ where: { id: stageId } });

    // Get next revision number
    const lastRevision = await tx.stageRevision.findFirst({
      where: { stageId },
      orderBy: { revisionNo: 'desc' },
    });
    const nextRevisionNo = (lastRevision?.revisionNo ?? 0) + 1;

    // Create revision record (preserves history)
    const revisionData: Prisma.StageRevisionUncheckedCreateInput = {
      stageId,
      revisionNo: nextRevisionNo,
      revisedStartDate: data.revisedStartDate,
      reason: data.reason,
      revisedById: userId,
    };
    if (data.revisedEndDate !== undefined) {
      revisionData.revisedEndDate = data.revisedEndDate;
    }

    await tx.stageRevision.create({
      data: revisionData,
    });

    // Update the effective current target on stage
    const stageUpdateData: Prisma.StageUpdateInput = {
      currentTargetStartDate: data.revisedStartDate,
    };
    if (data.revisedEndDate !== undefined) {
      stageUpdateData.currentTargetEndDate = data.revisedEndDate;
    }

    return tx.stage.update({
      where: { id: stage.id },
      data: stageUpdateData,
      include: { revisions: { orderBy: { revisionNo: 'asc' } } },
    });
  });
};
