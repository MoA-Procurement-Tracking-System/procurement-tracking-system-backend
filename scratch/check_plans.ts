import { prisma } from './config/database.js';

async function main() {
  const plans = await prisma.plan.findMany({
    select: {
      id: true,
      title: true,
      status: true,
      committeeRound: true,
      committeeVotes: true,
    },
  });
  console.log('--- ALL PLANS IN DB ---');
  console.log(JSON.stringify(plans, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
