import { prisma } from './config/database.js';

async function main() {
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

    if (rejectCount >= 1) {
      await prisma.plan.update({
        where: { id: p.id },
        data: { status: 'REJECTED' },
      });
      console.log(`Updated plan ${p.title} to REJECTED`);
    } else if (approveCount >= 3) {
      await prisma.plan.update({
        where: { id: p.id },
        data: { status: 'APPROVED' },
      });
      console.log(`Updated plan ${p.title} to APPROVED`);
    } else if (approveCount < 3 && rejectCount === 0) {
      await prisma.plan.update({
        where: { id: p.id },
        data: { status: 'WITH_COMMITTEE' },
      });
      console.log(
        `Updated plan ${p.title} to WITH_COMMITTEE (${approveCount}/3 votes)`,
      );
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
