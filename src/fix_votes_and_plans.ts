import { PlanStatus } from './generated/prisma/index.js';
import { prisma } from './config/database.js';

async function main() {
  // 1. Reassign the recent REJECT vote to Workneh Tsionawit (id: dcb48490-bf61-4982-89b0-3556da376ea3)
  const tsionawit = await prisma.user.findFirst({
    where: { email: 'tsionawit.ugr-4989-16@aau.edu.et' },
  });

  if (tsionawit) {
    const rejectVote = await prisma.committeeVote.findFirst({
      where: {
        decision: 'REJECT',
      },
    });
    if (rejectVote) {
      await prisma.committeeVote.update({
        where: { id: rejectVote.id },
        data: {
          memberId: tsionawit.id,
          comment:
            'Required budget allocation and timeline adjustment for seed distribution packages before endorsement.',
        },
      });
      console.log('Updated reject vote memberId to Tsionawit:', tsionawit.id);
    }
  }

  // 2. Set plans to WITH_COMMITTEE unless approveCount >= 3 or rejectCount >= 3
  const plans = await prisma.plan.findMany({
    include: { committeeVotes: true },
  });

  for (const p of plans) {
    const approveCount = p.committeeVotes.filter(
      (v) => v.decision === 'APPROVE',
    ).length;
    const rejectCount = p.committeeVotes.filter(
      (v) => v.decision === 'REJECT',
    ).length;

    let targetStatus: PlanStatus = PlanStatus.WITH_COMMITTEE;
    if (approveCount >= 3) targetStatus = PlanStatus.APPROVED;
    else if (rejectCount >= 3) targetStatus = PlanStatus.REJECTED;

    await prisma.plan.update({
      where: { id: p.id },
      data: { status: targetStatus },
    });
    console.log(
      `Plan ${p.title} set to ${targetStatus} (${approveCount} approves, ${rejectCount} rejects)`,
    );
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
