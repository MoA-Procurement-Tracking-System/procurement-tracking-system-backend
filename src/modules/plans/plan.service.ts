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
  const [plans, committeeUsers] = await Promise.all([
    prisma.plan.findMany({
      where: { isActive: true },
      include: {
        project: {
          include: {
            members: {
              include: { user: true },
            },
          },
        },
        creator: true,
        activities: {
          include: {
            procurementMethod: true,
            stages: {
              include: {
                stageType: true,
                revisions: { orderBy: { revisionNo: 'asc' } },
              },
              orderBy: { sequence: 'asc' },
            },
          },
        },
        committeeVotes: true,
        reviews: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.findMany({
      where: {
        OR: [{ role: 'ManagementTeam' }, { authRole: 'ENDORSING_COMMITTEE' }],
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        email: true,
        role: true,
        authRole: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const voterIds = Array.from(
    new Set(
      plans.flatMap((p) => (p.committeeVotes || []).map((v) => v.memberId)),
    ),
  );
  const users = await prisma.user.findMany({
    where: { id: { in: voterIds } },
    select: {
      id: true,
      name: true,
      displayName: true,
      email: true,
      role: true,
      authRole: true,
    },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  return plans.map((p) => ({
    ...p,
    committeeMembers: committeeUsers,
    committeeVotes: (p.committeeVotes || []).map((v) => {
      const u = userMap.get(v.memberId);
      return {
        ...v,
        memberName: u?.name || u?.displayName || 'Committee Member',
        memberRole: 'Endorsement Committee Member',
        memberEmail: u?.email,
      };
    }),
  }));
};

export const getPlanByIdService = async (id: string) => {
  const [plan, committeeUsers] = await Promise.all([
    prisma.plan.findFirst({
      where: {
        OR: [{ id }, { title: id }],
        isActive: true,
      },
      include: {
        project: {
          include: {
            members: {
              include: { user: true },
            },
          },
        },
        creator: true,
        activities: {
          include: {
            procurementMethod: true,
            stages: {
              include: {
                stageType: true,
                revisions: { orderBy: { revisionNo: 'asc' } },
              },
              orderBy: { sequence: 'asc' },
            },
          },
        },
        committeeVotes: true,
        reviews: true,
      },
    }),
    prisma.user.findMany({
      where: {
        OR: [{ role: 'ManagementTeam' }, { authRole: 'ENDORSING_COMMITTEE' }],
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        email: true,
        role: true,
        authRole: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  if (!plan) return null;

  const voterIds = (plan.committeeVotes || []).map((v) => v.memberId);
  const users = await prisma.user.findMany({
    where: { id: { in: voterIds } },
    select: {
      id: true,
      name: true,
      displayName: true,
      email: true,
      role: true,
      authRole: true,
    },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  return {
    ...plan,
    committeeMembers: committeeUsers,
    committeeVotes: (plan.committeeVotes || []).map((v) => {
      const u = userMap.get(v.memberId);
      return {
        ...v,
        memberName: u?.name || u?.displayName || 'Committee Member',
        memberRole: 'Endorsement Committee Member',
        memberEmail: u?.email,
      };
    }),
  };
};

export const createPlanService = async (
  data: Prisma.PlanUncheckedCreateInput,
  userId: string,
) => {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // 1. Resolve projectId by ID or code
    let resolvedProjectId = data.projectId;
    const project = await tx.project.findFirst({
      where: {
        OR: [{ id: resolvedProjectId }, { code: resolvedProjectId }],
      },
    });
    if (project) {
      resolvedProjectId = project.id;
    }

    // 2. Resolve creator user
    let validUserId = userId;
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) {
      const fallbackUser = await tx.user.findFirst({ select: { id: true } });
      if (fallbackUser) validUserId = fallbackUser.id;
    }

    const plan = await tx.plan.create({
      data: {
        ...data,
        projectId: resolvedProjectId,
        status: PlanStatus.DRAFT,
        createdBy: validUserId,
      },
      include: {
        project: true,
        creator: true,
        activities: true,
        committeeVotes: true,
      },
    });

    try {
      if (validUserId) {
        await logRevision(
          tx,
          RevisionEntityType.PLAN,
          RevisionChangeType.CREATE,
          plan.id,
          validUserId,
          null,
          plan,
        );
      }
    } catch (auditErr) {
      console.warn('logRevision create plan warning:', auditErr);
    }

    return plan;
  });
};

export const updatePlanService = async (
  id: string,
  data: Prisma.PlanUpdateInput,
  userId: string,
) => {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const oldPlan = await tx.plan.findFirst({
      where: { OR: [{ id }, { title: id }] },
      include: { activities: true, committeeVotes: true },
    });
    if (!oldPlan) {
      throw new Error(`Plan not found with id: ${id}`);
    }

    let validUserId = userId;
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) {
      const fallbackUser = await tx.user.findFirst({ select: { id: true } });
      if (fallbackUser) validUserId = fallbackUser.id;
    }

    const plan = await tx.plan.update({
      where: { id: oldPlan.id },
      data,
      include: {
        project: true,
        creator: true,
        activities: true,
        committeeVotes: true,
      },
    });

    try {
      if (validUserId) {
        await logRevision(
          tx,
          RevisionEntityType.PLAN,
          RevisionChangeType.UPDATE,
          oldPlan.id,
          validUserId,
          oldPlan,
          plan,
        );
      }
    } catch (auditErr) {
      console.warn('logRevision update plan warning:', auditErr);
    }

    return plan;
  });
};

export const submitPlanService = async (id: string, userId: string) => {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const oldPlan = await tx.plan.findFirst({
      where: { OR: [{ id }, { title: id }] },
      include: { activities: true, committeeVotes: true },
    });
    if (!oldPlan) {
      throw new Error(`Plan not found with id: ${id}`);
    }

    let validUserId = userId;
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) {
      const fallbackUser = await tx.user.findFirst({ select: { id: true } });
      if (fallbackUser) validUserId = fallbackUser.id;
    }

    const plan = await tx.plan.update({
      where: { id: oldPlan.id },
      data: { status: PlanStatus.SUBMITTED },
      include: {
        project: true,
        creator: true,
        activities: true,
        committeeVotes: true,
      },
    });

    try {
      if (validUserId) {
        await logRevision(
          tx,
          RevisionEntityType.PLAN,
          RevisionChangeType.UPDATE,
          oldPlan.id,
          validUserId,
          oldPlan,
          plan,
        );
      }
    } catch (auditErr) {
      console.warn('logRevision submit plan warning:', auditErr);
    }

    return plan;
  });
};

export const sendToCommitteeService = async (id: string, userId: string) => {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const oldPlan = await tx.plan.findFirst({
      where: { OR: [{ id }, { title: id }] },
      include: { activities: true, committeeVotes: true },
    });
    if (!oldPlan) {
      throw new Error(`Plan not found with id: ${id}`);
    }

    let validUserId = userId;
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) {
      const fallbackUser = await tx.user.findFirst({ select: { id: true } });
      if (fallbackUser) validUserId = fallbackUser.id;
    }

    const plan = await tx.plan.update({
      where: { id: oldPlan.id },
      data: {
        status: PlanStatus.WITH_COMMITTEE,
        committeeRound: oldPlan.committeeRound + 1,
      },
      include: {
        project: true,
        creator: true,
        activities: true,
        committeeVotes: true,
      },
    });

    try {
      if (validUserId) {
        await logRevision(
          tx,
          RevisionEntityType.PLAN,
          RevisionChangeType.UPDATE,
          oldPlan.id,
          validUserId,
          oldPlan,
          plan,
        );
      }
    } catch (auditErr) {
      console.warn('logRevision sendToCommittee warning:', auditErr);
    }

    return plan;
  });
};

export const rejectPlanService = async (
  id: string,
  reason: string,
  userId: string,
) => {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const oldPlan = await tx.plan.findFirst({
      where: { OR: [{ id }, { title: id }] },
      include: { activities: true, committeeVotes: true },
    });
    if (!oldPlan) {
      throw new Error(`Plan not found with id: ${id}`);
    }

    let validUserId = userId;
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) {
      const fallbackUser = await tx.user.findFirst({ select: { id: true } });
      if (fallbackUser) validUserId = fallbackUser.id;
    }

    const plan = await tx.plan.update({
      where: { id: oldPlan.id },
      data: {
        status: PlanStatus.REJECTED,
        rejectedById: validUserId,
        rejectionReason: reason,
        rejectedAt: new Date(),
      },
      include: {
        project: true,
        creator: true,
        activities: true,
        committeeVotes: true,
      },
    });

    try {
      if (validUserId) {
        await logRevision(
          tx,
          RevisionEntityType.PLAN,
          RevisionChangeType.REJECT,
          oldPlan.id,
          validUserId,
          oldPlan,
          plan,
        );
      }
    } catch (auditErr) {
      console.warn('logRevision rejectPlan warning:', auditErr);
    }

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
    const oldPlan = await tx.plan.findFirst({
      where: { OR: [{ id }, { title: id }] },
      include: { committeeVotes: true },
    });
    if (!oldPlan) {
      throw new Error(`Plan not found with id: ${id}`);
    }

    let validUserId = userId;
    const user = await tx.user.findFirst({
      where: {
        OR: [{ id: userId }, { email: userId }],
      },
    });

    if (user) {
      validUserId = user.id;
    } else {
      const fallbackUser =
        (await tx.user.findFirst({
          where: {
            OR: [
              { role: Role.ManagementTeam },
              { authRole: 'ENDORSING_COMMITTEE' },
            ],
          },
          select: { id: true },
        })) || (await tx.user.findFirst({ select: { id: true } }));
      if (fallbackUser) validUserId = fallbackUser.id;
    }

    // Record the vote
    await tx.committeeVote.upsert({
      where: {
        planId_round_memberId: {
          planId: oldPlan.id,
          round: oldPlan.committeeRound,
          memberId: validUserId,
        },
      },
      update: { decision, comment },
      create: {
        planId: oldPlan.id,
        round: oldPlan.committeeRound,
        memberId: validUserId,
        decision,
        comment,
      },
    });

    // Tally votes
    const votes = await tx.committeeVote.findMany({
      where: { planId: oldPlan.id, round: oldPlan.committeeRound },
    });

    const approveCount = votes.filter(
      (v: { decision: VoteDecision }) => v.decision === VoteDecision.APPROVE,
    ).length;
    const rejectCount = votes.filter(
      (v: { decision: VoteDecision }) => v.decision === VoteDecision.REJECT,
    ).length;

    let plan = oldPlan;
    // Business Rule:
    // 1. If at least 3 members vote APPROVE, the plan is officially APPROVED.
    // 2. If at least 3 members vote REJECT, the plan is REJECTED (majority rejection).
    // 3. Otherwise (fewer than 3 approvals and fewer than 3 rejections), the plan stays in WITH_COMMITTEE (Pending Approval).
    if (approveCount >= 3) {
      plan = await tx.plan.update({
        where: { id: oldPlan.id },
        data: {
          status: PlanStatus.APPROVED,
          approvedById: validUserId,
          approvedAt: new Date(),
        },
        include: {
          project: true,
          creator: true,
          activities: true,
          committeeVotes: true,
        },
      });
      try {
        await logRevision(
          tx,
          RevisionEntityType.PLAN,
          RevisionChangeType.APPROVE,
          oldPlan.id,
          validUserId,
          oldPlan,
          plan,
        );
      } catch (auditErr) {
        console.warn('logRevision vote approve warning:', auditErr);
      }
    } else if (rejectCount >= 3) {
      plan = await tx.plan.update({
        where: { id: oldPlan.id },
        data: {
          status: PlanStatus.REJECTED,
          rejectedById: validUserId,
          rejectionReason:
            comment || 'Rejected by majority Endorsement Committee vote.',
          rejectedAt: new Date(),
        },
        include: {
          project: true,
          creator: true,
          activities: true,
          committeeVotes: true,
        },
      });
      try {
        await logRevision(
          tx,
          RevisionEntityType.PLAN,
          RevisionChangeType.REJECT,
          oldPlan.id,
          validUserId,
          oldPlan,
          plan,
        );
      } catch (auditErr) {
        console.warn('logRevision vote reject warning:', auditErr);
      }
    } else {
      plan = await tx.plan.update({
        where: { id: oldPlan.id },
        data: {
          status: PlanStatus.WITH_COMMITTEE,
        },
        include: {
          project: true,
          creator: true,
          activities: true,
          committeeVotes: true,
        },
      });
    }

    return plan;
  });
};

export const requestPlanUpdateService = async (id: string, userId: string) => {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const oldPlan = await tx.plan.findFirst({
      where: { OR: [{ id }, { title: id }] },
      include: { activities: true, committeeVotes: true },
    });
    if (!oldPlan) {
      throw new Error(`Plan not found with id: ${id}`);
    }

    let validUserId = userId;
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) {
      const fallbackUser = await tx.user.findFirst({ select: { id: true } });
      if (fallbackUser) validUserId = fallbackUser.id;
    }

    const plan = await tx.plan.update({
      where: { id: oldPlan.id },
      data: { status: PlanStatus.UPDATE_REQUESTED },
      include: {
        project: true,
        creator: true,
        activities: true,
        committeeVotes: true,
      },
    });

    try {
      if (validUserId) {
        await logRevision(
          tx,
          RevisionEntityType.PLAN,
          RevisionChangeType.UPDATE,
          oldPlan.id,
          validUserId,
          oldPlan,
          plan,
        );
      }
    } catch (auditErr) {
      console.warn('logRevision requestPlanUpdate warning:', auditErr);
    }

    return plan;
  });
};

export const approvePlanUpdateService = async (id: string, userId: string) => {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const oldPlan = await tx.plan.findFirst({
      where: { OR: [{ id }, { title: id }] },
      include: { activities: true, committeeVotes: true },
    });
    if (!oldPlan) {
      throw new Error(`Plan not found with id: ${id}`);
    }

    let validUserId = userId;
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) {
      const fallbackUser = await tx.user.findFirst({ select: { id: true } });
      if (fallbackUser) validUserId = fallbackUser.id;
    }

    const plan = await tx.plan.update({
      where: { id: oldPlan.id },
      data: { status: PlanStatus.DRAFT },
      include: {
        project: true,
        creator: true,
        activities: true,
        committeeVotes: true,
      },
    });

    try {
      if (validUserId) {
        await logRevision(
          tx,
          RevisionEntityType.PLAN,
          RevisionChangeType.UPDATE,
          oldPlan.id,
          validUserId,
          oldPlan,
          plan,
        );
      }
    } catch (auditErr) {
      console.warn('logRevision approvePlanUpdate warning:', auditErr);
    }

    return plan;
  });
};
