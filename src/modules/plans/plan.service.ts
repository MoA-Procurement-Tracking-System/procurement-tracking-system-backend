import {
  Prisma,
  PlanStatus,
  RevisionEntityType,
  RevisionChangeType,
  Role,
  VoteDecision,
} from '../../generated/prisma/index.js';
import { prisma } from '../../config/database.js';
import { logRevision } from '../../shared/audit/revision.service.js';

export const getPlansService = async () => {
  return prisma.plan.findMany({
    where: { isActive: true },
    include: { project: true, creator: true, committeeVotes: true },
  });
};

export const getPlanByIdService = async (id: string) => {
  return prisma.plan.findUnique({
    where: { id },
    include: {
      project: true,
      creator: true,
      activities: true,
      committeeVotes: true,
    },
  });
};

export const createPlanService = async (
  data: Prisma.PlanUncheckedCreateInput,
  userId: string,
) => {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const plan = await tx.plan.create({
      data: {
        ...data,
        status: PlanStatus.DRAFT,
        createdBy: userId,
      },
    });

    await logRevision(
      tx,
      RevisionEntityType.PLAN,
      RevisionChangeType.CREATE,
      plan.id,
      userId,
      null,
      plan,
    );

    return plan;
  });
};

export const updatePlanService = async (
  id: string,
  data: Prisma.PlanUpdateInput,
  userId: string,
) => {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const oldPlan = await tx.plan.findUniqueOrThrow({ where: { id } });

    // Fetch user to check role
    const user = await tx.user.findUnique({ where: { id: userId } });

    // Check permissions: Officers must be assigned to the project and can only edit DRAFT or REJECTED plans.
    if (user && user.role === Role.ProcurementOfficer) {
      const assignment = await tx.userProject.findUnique({
        where: { userId_projectId: { userId, projectId: oldPlan.projectId } },
      });
      if (!assignment) {
        throw new Error('You are not assigned to this project.');
      }
      if (
        oldPlan.status !== PlanStatus.DRAFT &&
        oldPlan.status !== PlanStatus.REJECTED
      ) {
        throw new Error(
          'Officers cannot edit plans that are not in DRAFT or REJECTED status. Please request an update.',
        );
      }
    }

    const plan = await tx.plan.update({
      where: { id },
      data,
    });

    await logRevision(
      tx,
      RevisionEntityType.PLAN,
      RevisionChangeType.UPDATE,
      id,
      userId,
      oldPlan,
      plan,
    );

    return plan;
  });
};

export const submitPlanService = async (id: string, userId: string) => {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const oldPlan = await tx.plan.findUniqueOrThrow({
      where: { id },
      include: { activities: true },
    });

    const user = await tx.user.findUnique({ where: { id: userId } });
    if (user && user.role === Role.ProcurementOfficer) {
      const assignment = await tx.userProject.findUnique({
        where: { userId_projectId: { userId, projectId: oldPlan.projectId } },
      });
      if (!assignment) {
        throw new Error('You are not assigned to this project.');
      }
    }

    if (oldPlan.status !== PlanStatus.DRAFT) {
      throw new Error('Only DRAFT plans can be submitted.');
    }

    if (oldPlan.activities.length === 0) {
      throw new Error(
        'A Plan cannot be submitted without at least one Procurement Activity.',
      );
    }

    const plan = await tx.plan.update({
      where: { id },
      data: { status: PlanStatus.SUBMITTED },
    });

    await logRevision(
      tx,
      RevisionEntityType.PLAN,
      RevisionChangeType.UPDATE,
      id,
      userId,
      oldPlan,
      plan,
    );
    return plan;
  });
};

export const sendToCommitteeService = async (id: string, userId: string) => {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (
      user &&
      user.role !== Role.ProcurementDirector &&
      user.role !== Role.Administrator
    ) {
      throw new Error('Only a director can send a plan to the committee.');
    }

    const oldPlan = await tx.plan.findUniqueOrThrow({ where: { id } });
    if (oldPlan.status !== PlanStatus.SUBMITTED) {
      throw new Error('Only SUBMITTED plans can be sent to the committee.');
    }

    const plan = await tx.plan.update({
      where: { id },
      data: {
        status: PlanStatus.WITH_COMMITTEE,
        committeeRound: oldPlan.committeeRound + 1,
      },
    });

    await logRevision(
      tx,
      RevisionEntityType.PLAN,
      RevisionChangeType.UPDATE,
      id,
      userId,
      oldPlan,
      plan,
    );
    return plan;
  });
};

export const rejectPlanService = async (
  id: string,
  reason: string,
  userId: string,
) => {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (
      user &&
      user.role !== Role.ProcurementDirector &&
      user.role !== Role.Administrator
    ) {
      throw new Error('Only a director can reject a submitted plan.');
    }

    const oldPlan = await tx.plan.findUniqueOrThrow({ where: { id } });
    if (oldPlan.status !== PlanStatus.SUBMITTED) {
      throw new Error('Only SUBMITTED plans can be rejected.');
    }

    const plan = await tx.plan.update({
      where: { id },
      data: {
        status: PlanStatus.REJECTED,
        rejectedById: userId,
        rejectionReason: reason,
        rejectedAt: new Date(),
      },
    });

    await logRevision(
      tx,
      RevisionEntityType.PLAN,
      RevisionChangeType.REJECT,
      id,
      userId,
      oldPlan,
      plan,
    );
    return plan;
  });
};

export const submitCommitteeVoteService = async (
  id: string,
  decision: VoteDecision,
  comment: string,
  userId: string,
) => {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (
      user &&
      user.role !== Role.ManagementTeam &&
      user.role !== Role.Administrator
    ) {
      throw new Error('Only committee members can vote.');
    }

    const oldPlan = await tx.plan.findUniqueOrThrow({ where: { id } });
    if (oldPlan.status !== PlanStatus.WITH_COMMITTEE) {
      throw new Error('Plan is not currently with the committee for voting.');
    }

    // Record the vote
    await tx.committeeVote.upsert({
      where: {
        planId_round_memberId: {
          planId: id,
          round: oldPlan.committeeRound,
          memberId: userId,
        },
      },
      update: { decision, comment },
      create: {
        planId: id,
        round: oldPlan.committeeRound,
        memberId: userId,
        decision,
        comment,
      },
    });

    // Tally votes
    const votes = await tx.committeeVote.findMany({
      where: { planId: id, round: oldPlan.committeeRound },
    });

    const approveCount = votes.filter(
      (v: { decision: VoteDecision }) => v.decision === VoteDecision.APPROVE,
    ).length;
    const rejectCount = votes.filter(
      (v: { decision: VoteDecision }) => v.decision === VoteDecision.REJECT,
    ).length;

    let plan = oldPlan;
    if (approveCount >= 3) {
      plan = await tx.plan.update({
        where: { id },
        data: {
          status: PlanStatus.APPROVED,
          approvedById: userId, // The person who cast the 3rd vote or maybe the director later. Setting to the final voter for now.
          approvedAt: new Date(),
        },
      });
      await logRevision(
        tx,
        RevisionEntityType.PLAN,
        RevisionChangeType.APPROVE,
        id,
        userId,
        oldPlan,
        plan,
      );
    } else if (rejectCount >= 3) {
      plan = await tx.plan.update({
        where: { id },
        data: {
          status: PlanStatus.REJECTED,
          rejectedById: userId,
          rejectionReason: 'Rejected by Management Committee vote.',
          rejectedAt: new Date(),
        },
      });
      await logRevision(
        tx,
        RevisionEntityType.PLAN,
        RevisionChangeType.REJECT,
        id,
        userId,
        oldPlan,
        plan,
      );
    }

    return plan;
  });
};

export const requestPlanUpdateService = async (id: string, userId: string) => {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const oldPlan = await tx.plan.findUniqueOrThrow({ where: { id } });

    const user = await tx.user.findUnique({ where: { id: userId } });
    if (user && user.role === Role.ProcurementOfficer) {
      const assignment = await tx.userProject.findUnique({
        where: { userId_projectId: { userId, projectId: oldPlan.projectId } },
      });
      if (!assignment) {
        throw new Error('You are not assigned to this project.');
      }
    }

    if (
      oldPlan.status === PlanStatus.DRAFT ||
      oldPlan.status === PlanStatus.REJECTED
    ) {
      throw new Error('Plan is already editable.');
    }

    const plan = await tx.plan.update({
      where: { id },
      data: { status: PlanStatus.UPDATE_REQUESTED },
    });

    await logRevision(
      tx,
      RevisionEntityType.PLAN,
      RevisionChangeType.UPDATE,
      id,
      userId,
      oldPlan,
      plan,
    );
    return plan;
  });
};

export const approvePlanUpdateService = async (id: string, userId: string) => {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const user = await tx.user.findUnique({ where: { id: userId } });

    if (
      user &&
      user.role !== Role.ProcurementDirector &&
      user.role !== Role.Administrator
    ) {
      throw new Error('Only a director can approve update requests.');
    }

    const oldPlan = await tx.plan.findUniqueOrThrow({ where: { id } });
    if (oldPlan.status !== PlanStatus.UPDATE_REQUESTED) {
      throw new Error('Plan is not awaiting update approval.');
    }

    const plan = await tx.plan.update({
      where: { id },
      data: { status: PlanStatus.DRAFT },
    });

    await logRevision(
      tx,
      RevisionEntityType.PLAN,
      RevisionChangeType.UPDATE,
      id,
      userId,
      oldPlan,
      plan,
    );
    return plan;
  });
};
