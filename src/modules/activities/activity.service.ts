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
  const where = planId ? { planId, isActive: true } : { isActive: true };
  return prisma.activity.findMany({
    where,
    include: {
      plan: true,
      lots: true,
      fundings: true,
      components: true,
      procurementMethod: true,
    },
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
    const plan = await tx.plan.findUniqueOrThrow({
      where: { id: data.planId },
    });
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

    const reference = await generateActivityReference(data.procurementMethodId);

    const { lots, fundings, components, planId, ...activityData } = data;

    const createData: Prisma.ActivityCreateInput = {
      ...(activityData as unknown as Prisma.ActivityCreateInput),
      reference,
      plan: { connect: { id: planId } },
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

// ─── Stage Status Calculation ────────────────────────────────────────────────
function determineStageStatus(stage: {
  isNotApplicable: boolean;
  actualStartDate: Date | null;
  actualEndDate: Date | null;
  currentTargetEndDate: Date | null;
}): StageStatus {
  if (stage.isNotApplicable) {
    return StageStatus.NOT_APPLICABLE;
  }
  if (stage.actualEndDate) {
    return StageStatus.COMPLETED;
  }
  if (stage.actualStartDate) {
    return StageStatus.IN_PROGRESS;
  }
  if (stage.currentTargetEndDate && stage.currentTargetEndDate < new Date()) {
    return StageStatus.DELAYED;
  }
  return StageStatus.NOT_STARTED;
}

// ─── Stage: Update Planning Dates ────────────────────────────────────────────

export const updateStageService = async (
  stageId: string,
  data: UpdateStageInput,
) => {
  return prisma.$transaction(async (tx) => {
    const stage = await tx.stage.findUniqueOrThrow({ where: { id: stageId } });

    const updateData: Prisma.StageUpdateInput = {};
    if (data.plannedStartDate !== undefined) {
      updateData.plannedStartDate = data.plannedStartDate;
      updateData.currentTargetStartDate = data.plannedStartDate;
    }
    if (data.plannedEndDate !== undefined) {
      updateData.plannedEndDate = data.plannedEndDate;
      updateData.currentTargetEndDate = data.plannedEndDate;
    }
    if (data.plannedDays !== undefined)
      updateData.plannedDays = data.plannedDays;
    if (data.isNotApplicable !== undefined)
      updateData.isNotApplicable = data.isNotApplicable;
    if (data.remarks !== undefined) updateData.remarks = data.remarks;

    // Pre-calculate status
    const tempStage = {
      isNotApplicable:
        data.isNotApplicable !== undefined
          ? data.isNotApplicable
          : stage.isNotApplicable,
      actualStartDate: stage.actualStartDate,
      actualEndDate: stage.actualEndDate,
      currentTargetEndDate:
        data.plannedEndDate !== undefined
          ? data.plannedEndDate
          : stage.currentTargetEndDate,
    };
    updateData.status = determineStageStatus(tempStage);

    return tx.stage.update({
      where: { id: stageId },
      data: updateData,
    });
  });
};

// ─── Stage: Record Actual Date ────────────────────────────────────────────────

export const updateStageActualService = async (
  stageId: string,
  data: UpdateStageActualInput,
) => {
  return prisma.$transaction(async (tx) => {
    const stage = await tx.stage.findUniqueOrThrow({
      where: { id: stageId },
      include: { activity: { include: { stages: true } } },
    });

    const newStartDate =
      data.actualStartDate !== undefined
        ? data.actualStartDate
        : stage.actualStartDate;
    const newEndDate =
      data.actualEndDate !== undefined
        ? data.actualEndDate
        : stage.actualEndDate;

    // Enforce Date order: Actual completion cannot precede start date or preceding stages' actual completions
    if (newEndDate) {
      const end = new Date(newEndDate);
      if (newStartDate && new Date(newStartDate) > end) {
        throw new Error('Actual end date cannot precede actual start date.');
      }
      for (const other of stage.activity.stages) {
        if (
          other.sequence < stage.sequence &&
          !other.isNotApplicable &&
          other.actualEndDate &&
          new Date(other.actualEndDate) > end
        ) {
          throw new Error(
            `Actual end date cannot precede the actual completion of preceding stage (${other.sequence}).`,
          );
        }
      }
    }

    const updateData: Prisma.StageUpdateInput = {};
    if (data.actualStartDate !== undefined)
      updateData.actualStartDate = data.actualStartDate;
    if (data.actualEndDate !== undefined)
      updateData.actualEndDate = data.actualEndDate;
    if (data.remarks !== undefined) updateData.remarks = data.remarks;

    // Sync status
    const tempStage = {
      isNotApplicable: stage.isNotApplicable,
      actualStartDate: newStartDate,
      actualEndDate: newEndDate,
      currentTargetEndDate: stage.currentTargetEndDate,
    };
    updateData.status = determineStageStatus(tempStage);

    return tx.stage.update({
      where: { id: stageId },
      data: updateData,
    });
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

    // Pre-calculate status with new target end date
    const tempStage = {
      isNotApplicable: stage.isNotApplicable,
      actualStartDate: stage.actualStartDate,
      actualEndDate: stage.actualEndDate,
      currentTargetEndDate:
        data.revisedEndDate !== undefined
          ? data.revisedEndDate
          : stage.currentTargetEndDate,
    };
    stageUpdateData.status = determineStageStatus(tempStage);

    return tx.stage.update({
      where: { id: stage.id },
      data: stageUpdateData,
      include: { revisions: { orderBy: { revisionNo: 'asc' } } },
    });
  });
};
