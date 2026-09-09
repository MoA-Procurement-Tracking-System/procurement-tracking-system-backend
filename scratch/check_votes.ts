import { prisma } from './config/database.js';

async function main() {
  const votes = await prisma.committeeVote.findMany({
    include: {
      plan: { select: { id: true, title: true, status: true } },
    },
  });
  console.log('--- ALL COMMITTEE VOTES IN DB ---');
  console.log(JSON.stringify(votes, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
