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
import { sendEmail } from '../../services/email.service.js';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

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

export const sendToCommitteeService = async (
  id: string,
  userId: string,
  voteDeadlineHours?: number,
) => {
  const { plan, committeeVoteDeadline } = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
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

      // Compute vote deadline if the director specified hours
      const committeeVoteDeadline =
        typeof voteDeadlineHours === 'number' && voteDeadlineHours > 0
          ? new Date(Date.now() + voteDeadlineHours * 60 * 60 * 1000)
          : undefined;

      const plan = await tx.plan.update({
        where: { id: oldPlan.id },
        data: {
          status: PlanStatus.WITH_COMMITTEE,
          committeeRound: oldPlan.committeeRound + 1,
          ...(committeeVoteDeadline !== undefined
            ? { committeeVoteDeadline }
            : {}),
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

      return { plan, committeeVoteDeadline };
    },
  );

  // ─── Send notification emails to all committee members (outside transaction) ───
  try {
    const committeeMembers = await prisma.user.findMany({
      where: {
        OR: [
          { role: Role.ManagementTeam },
          { authRole: 'ENDORSING_COMMITTEE' },
        ],
        isActive: true,
      },
      select: { id: true, name: true, displayName: true, email: true },
    });

    const deadlineText = committeeVoteDeadline
      ? committeeVoteDeadline.toLocaleString('en-US', {
          dateStyle: 'full',
          timeStyle: 'short',
        })
      : 'No specific deadline set';

    const planUrl = `${env.FRONTEND_URL}/workspace/plans/${plan.id}`;

    for (const member of committeeMembers) {
      if (!member.email) continue;
      const memberName =
        member.displayName || member.name || 'Committee Member';
      sendEmail({
        to: member.email,
        subject: `Action Required: Vote on Procurement Plan — "${plan.title}"`,
        text: [
          `Dear ${memberName},`,
          '',
          'The Director has submitted a procurement plan for your review and endorsement.',
          'Your vote is required before this plan can proceed.',
          '',
          `Plan:          ${plan.title}`,
          `Budget Year:   ${plan.budgetYear ?? 'N/A'}`,
          `Organization:  ${plan.organization ?? 'N/A'}`,
          `Voting Deadline: ${deadlineText}`,
          '',
          'Please review the plan and cast your vote using the link below:',
          `→ Review & Vote: ${planUrl}`,
          '',
          'MoA Procurement Tracking System',
        ].join('\n'),
        html: `
          <p>Dear <strong>${memberName}</strong>,</p>
          <p>The Director has submitted a procurement plan for your review and endorsement.<br/>
          Your vote is required before this plan can proceed.</p>
          <table style="border-collapse:collapse;margin:12px 0">
            <tr><td style="padding:4px 12px 4px 0;color:#555">Plan:</td><td><strong>${plan.title}</strong></td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#555">Budget Year:</td><td>${plan.budgetYear ?? 'N/A'}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#555">Organization:</td><td>${plan.organization ?? 'N/A'}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#555">Voting Deadline:</td><td><strong>${deadlineText}</strong></td></tr>
          </table>
          <p><a href="${planUrl}" style="background:#0A3C2F;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">Review &amp; Vote</a></p>
          <p style="color:#888;font-size:12px">MoA Procurement Tracking System</p>
        `,
      }).catch((emailErr: unknown) => {
        logger.warn(
          { email: member.email, err: emailErr },
          'Failed to send committee notification email',
        );
      });
    }
  } catch (notifyErr) {
    logger.warn(
      { err: notifyErr },
      'Committee email notification block failed',
    );
  }

  return plan;
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
  const { plan, approveCount, rejectCount } = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const oldPlan = await tx.plan.findFirst({
        where: { OR: [{ id }, { title: id }] },
        include: { committeeVotes: true, creator: true },
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

      return { plan, approveCount, rejectCount };
    },
  );

  // ─── Send outcome emails when vote is decided (outside transaction) ─────
  const isDecided = approveCount >= 3 || rejectCount >= 3;
  if (isDecided) {
    const isApproved = approveCount >= 3;
    try {
      const recipients: {
        name: string | null;
        displayName: string | null;
        email: string | null;
      }[] = [];

      // Plan creator
      if (plan.creator?.email) {
        recipients.push(plan.creator);
      }

      // Director(s)
      const directors = await prisma.user.findMany({
        where: { authRole: 'DIRECTOR', isActive: true },
        select: { name: true, displayName: true, email: true },
      });
      for (const d of directors) {
        if (d.email && !recipients.some((r) => r.email === d.email)) {
          recipients.push(d);
        }
      }

      const planUrl = `${env.FRONTEND_URL}/workspace/plans/${plan.id}`;
      const statusWord = isApproved ? 'APPROVED' : 'REJECTED';

      for (const recipient of recipients) {
        if (!recipient.email) continue;
        const recipientName =
          recipient.displayName || recipient.name || 'Team Member';
        const subject = isApproved
          ? `Plan Approved — "${plan.title}"`
          : `Plan Rejected — "${plan.title}"`;
        const bodyLines = isApproved
          ? [
              `Dear ${recipientName},`,
              '',
              'The Endorsement Committee has voted to APPROVE the following procurement plan.',
              '',
              `Plan:         ${plan.title}`,
              `Budget Year:  ${plan.budgetYear ?? 'N/A'}`,
              `Organization: ${plan.organization ?? 'N/A'}`,
              `Approved At:  ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}`,
              '',
              'The plan is now officially approved and can proceed to execution.',
              `→ View Plan: ${planUrl}`,
              '',
              'MoA Procurement Tracking System',
            ]
          : [
              `Dear ${recipientName},`,
              '',
              'The Endorsement Committee has voted to REJECT the following procurement plan.',
              '',
              `Plan:         ${plan.title}`,
              `Budget Year:  ${plan.budgetYear ?? 'N/A'}`,
              `Organization: ${plan.organization ?? 'N/A'}`,
              `Reason:       ${plan.rejectionReason ?? comment ?? 'Rejected by majority vote'}`,
              '',
              'Please review the plan and resubmit after making the necessary changes.',
              `→ View Plan: ${planUrl}`,
              '',
              'MoA Procurement Tracking System',
            ];

        const htmlColor = isApproved ? '#16a34a' : '#dc2626';
        sendEmail({
          to: recipient.email,
          subject,
          text: bodyLines.join('\n'),
          html: `
            <p>Dear <strong>${recipientName}</strong>,</p>
            <p>The Endorsement Committee has voted to
              <strong style="color:${htmlColor}">${statusWord}</strong>
              the following procurement plan.</p>
            <table style="border-collapse:collapse;margin:12px 0">
              <tr><td style="padding:4px 12px 4px 0;color:#555">Plan:</td><td><strong>${plan.title}</strong></td></tr>
              <tr><td style="padding:4px 12px 4px 0;color:#555">Budget Year:</td><td>${plan.budgetYear ?? 'N/A'}</td></tr>
              <tr><td style="padding:4px 12px 4px 0;color:#555">Organization:</td><td>${plan.organization ?? 'N/A'}</td></tr>
              ${
                isApproved
                  ? `<tr><td style="padding:4px 12px 4px 0;color:#555">Approved At:</td><td>${new Date().toLocaleString()}</td></tr>`
                  : `<tr><td style="padding:4px 12px 4px 0;color:#555">Reason:</td><td>${plan.rejectionReason ?? comment ?? 'Rejected by majority vote'}</td></tr>`
              }
            </table>
            <p><a href="${planUrl}" style="background:#0A3C2F;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">View Plan</a></p>
            <p style="color:#888;font-size:12px">MoA Procurement Tracking System</p>
          `,
        }).catch((emailErr: unknown) => {
          logger.warn(
            { email: recipient.email, err: emailErr },
            'Failed to send outcome email',
          );
        });
      }
    } catch (notifyErr) {
      logger.warn(
        { err: notifyErr },
        'Outcome email notification block failed',
      );
    }
  }

  return plan;
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
