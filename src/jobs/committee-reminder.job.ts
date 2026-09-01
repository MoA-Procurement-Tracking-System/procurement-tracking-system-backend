import cron from 'node-cron';
import { prisma } from '../config/database.js';
import { sendEmail } from '../services/email.service.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { PlanStatus, Role } from '../generated/prisma/index.js';

async function sendCommitteeReminders(): Promise<void> {
  const now = new Date();

  const overdueParans = await prisma.plan.findMany({
    where: {
      status: PlanStatus.WITH_COMMITTEE,
      committeeVoteDeadline: { lt: now },
      isActive: true,
    },
    include: {
      committeeVotes: {
        select: { memberId: true, round: true },
      },
    },
  });

  if (overdueParans.length === 0) return;

  const committeeMembers = await prisma.user.findMany({
    where: {
      OR: [{ role: Role.ManagementTeam }, { authRole: 'ENDORSING_COMMITTEE' }],
      isActive: true,
    },
    select: { id: true, name: true, displayName: true, email: true },
  });

  for (const plan of overdueParans) {
    const votedMemberIds = new Set(
      plan.committeeVotes
        .filter((v) => v.round === plan.committeeRound)
        .map((v) => v.memberId),
    );

    const nonVoters = committeeMembers.filter((m) => !votedMemberIds.has(m.id));
    if (nonVoters.length === 0) continue;

    const deadlineText = plan.committeeVoteDeadline
      ? plan.committeeVoteDeadline.toLocaleString('en-US', {
          dateStyle: 'full',
          timeStyle: 'short',
        })
      : 'Deadline passed';

    const planUrl = `${env.FRONTEND_URL}/workspace/plans/${plan.id}`;

    for (const member of nonVoters) {
      if (!member.email) continue;
      const memberName =
        member.displayName || member.name || 'Committee Member';

      await sendEmail({
        to: member.email,
        subject: `REMINDER: Vote Pending — "${plan.title}"`,
        text: [
          `Dear ${memberName},`,
          '',
          'This is a reminder that your vote on the following procurement plan is still pending.',
          'The voting deadline has already passed. Please cast your vote as soon as possible.',
          '',
          `Plan:             ${plan.title}`,
          `Budget Year:      ${plan.budgetYear ?? 'N/A'}`,
          `Organization:     ${plan.organization ?? 'N/A'}`,
          `Voting Deadline:  ${deadlineText} (PASSED)`,
          '',
          '-> Vote Now: ' + planUrl,
          '',
          'MoA Procurement Tracking System',
        ].join('\n'),
        html: `
          <p>Dear <strong>${memberName}</strong>,</p>
          <p>This is a reminder that your vote on the following procurement plan is still pending.<br/>
          The voting deadline has already passed. Please cast your vote as soon as possible.</p>
          <table style="border-collapse:collapse;margin:12px 0">
            <tr><td style="padding:4px 12px 4px 0;color:#555">Plan:</td><td><strong>${plan.title}</strong></td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#555">Budget Year:</td><td>${plan.budgetYear ?? 'N/A'}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#555">Organization:</td><td>${plan.organization ?? 'N/A'}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#555">Voting Deadline:</td><td><strong style="color:#dc2626">${deadlineText} (PASSED)</strong></td></tr>
          </table>
          <p><a href="${planUrl}" style="background:#dc2626;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">Vote Now</a></p>
          <p style="color:#888;font-size:12px">MoA Procurement Tracking System</p>
        `,
      }).catch((emailErr: unknown) => {
        logger.warn(
          { email: member.email, planId: plan.id, err: emailErr },
          'Failed to send committee reminder email',
        );
      });
    }

    logger.info(
      {
        planId: plan.id,
        planTitle: plan.title,
        remindedCount: nonVoters.length,
      },
      '[committee-reminder] Reminder emails sent for overdue plan',
    );
  }
}

/**
 * Registers the committee vote reminder job.
 * Runs every hour: checks for plans past their voting deadline
 * and emails committee members who have not voted yet.
 */
export function registerCommitteeReminderJob(): void {
  cron.schedule('0 * * * *', () => {
    logger.info('[committee-reminder] Hourly check triggered');
    sendCommitteeReminders().catch((err: unknown) => {
      logger.error({ err }, '[committee-reminder] Job failed unexpectedly');
    });
  });

  logger.info('[committee-reminder] Hourly committee reminder job registered');
}
