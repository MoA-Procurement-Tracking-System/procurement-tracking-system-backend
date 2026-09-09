import { getPlansService } from './modules/plans/plan.service.js';
import { prisma } from './config/database.js';

async function main() {
  const plans = await getPlansService();
  console.log('--- GET PLANS SERVICE OUTPUT ---');
  for (const p of plans) {
    console.log(`Plan: ${p.title} (Status: ${p.status})`);
    console.log(
      'Committee Members:',
      JSON.stringify(p.committeeMembers, null, 2),
    );
    console.log('Committee Votes:', JSON.stringify(p.committeeVotes, null, 2));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
