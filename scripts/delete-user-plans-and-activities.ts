/**
 * Script to safely delete all plans and activities created by a specific user.
 *
 * Usage:
 *   Dry-run (preview only):
 *     npx tsx scripts/delete-user-plans-and-activities.ts --email fikreyabsira@gmail.com
 *
 *   Execute deletion:
 *     npx tsx scripts/delete-user-plans-and-activities.ts --email fikreyabsira@gmail.com --force
 *
 *   Execute against remote production database (e.g., on server or with remote DATABASE_URL):
 *     DATABASE_URL="<production-postgres-url>" npx tsx scripts/delete-user-plans-and-activities.ts --email fikreyabsira@gmail.com --force
 */

import { prisma } from '../src/config/database.js';

async function main() {
  const args = process.argv.slice(2);
  const emailIndex = args.indexOf('--email');
  const targetEmail =
    emailIndex !== -1 && args[emailIndex + 1]
      ? args[emailIndex + 1]
      : 'fikreyabsira@gmail.com';

  const isForce = args.includes('--force');
  const isDryRun = !isForce;

  console.log(`=======================================================`);
  console.log(`Target User: ${targetEmail}`);
  console.log(
    `Mode: ${isDryRun ? 'DRY RUN (Preview Only - No changes made)' : 'LIVE EXECUTION (DELETING DATA)'}`,
  );
  console.log(`=======================================================\n`);

  const user = await prisma.user.findFirst({
    where: { email: { equals: targetEmail, mode: 'insensitive' } },
    select: { id: true, email: true, name: true },
  });

  if (!user) {
    console.error(
      `User with email "${targetEmail}" was not found in this database.`,
    );
    return;
  }

  console.log(`Found user: ${user.name} (${user.email}) [ID: ${user.id}]\n`);

  // 1. Find all plans created by this user
  const userPlans = await prisma.plan.findMany({
    where: { createdBy: user.id },
    select: { id: true, title: true, status: true, budgetYear: true },
  });
  const planIds = userPlans.map((p) => p.id);

  // 2. Find all activities created by this user OR belonging to plans created by this user
  const userActivities = await prisma.activity.findMany({
    where: {
      OR: [
        { createdById: user.id },
        {
          planId: {
            in:
              planIds.length > 0
                ? planIds
                : ['00000000-0000-0000-0000-000000000000'],
          },
        },
      ],
    },
    select: { id: true, reference: true, description: true, planId: true },
  });
  const activityIds = userActivities.map((a) => a.id);

  console.log(`Summary of records to delete:`);
  console.log(`- Plans: ${userPlans.length}`);
  userPlans.forEach((p, idx) =>
    console.log(`  ${idx + 1}. [${p.status}] ${p.title} (ID: ${p.id})`),
  );

  console.log(`\n- Activities: ${userActivities.length}`);
  userActivities.forEach((a, idx) =>
    console.log(
      `  ${idx + 1}. ${a.reference} - ${a.description || 'No desc'} (ID: ${a.id})`,
    ),
  );

  if (userPlans.length === 0 && userActivities.length === 0) {
    console.log(
      `\nNo plans or activities found for ${targetEmail}. Nothing to delete.`,
    );
    return;
  }

  if (isDryRun) {
    console.log(`\n-------------------------------------------------------`);
    console.log(`[DRY RUN COMPLETE] No records were modified or deleted.`);
    console.log(`To perform the actual deletion, run with the --force flag:`);
    console.log(
      `  npx tsx scripts/delete-user-plans-and-activities.ts --email ${targetEmail} --force`,
    );
    console.log(`-------------------------------------------------------`);
    return;
  }

  console.log(`\nExecuting transactional deletion...`);

  await prisma.$transaction(async (tx) => {
    if (activityIds.length > 0) {
      // Unlink or clean up contracts referencing these activities
      const unlinkedContracts = await tx.contract.updateMany({
        where: { activityId: { in: activityIds } },
        data: { activityId: null },
      });
      console.log(
        `- Unlinked ${unlinkedContracts.count} contracts from target activities`,
      );

      // Delete documents associated with activities or their stages
      const stages = await tx.stage.findMany({
        where: { activityId: { in: activityIds } },
        select: { id: true },
      });
      const stageIds = stages.map((s) => s.id);

      const deletedDocs = await tx.document.deleteMany({
        where: {
          OR: [
            { activityId: { in: activityIds } },
            {
              stageId: {
                in:
                  stageIds.length > 0
                    ? stageIds
                    : ['00000000-0000-0000-0000-000000000000'],
              },
            },
          ],
        },
      });
      console.log(`- Deleted ${deletedDocs.count} documents`);

      // Delete activities (Cascades lots, fundings, components, stages, revisions)
      const deletedActs = await tx.activity.deleteMany({
        where: { id: { in: activityIds } },
      });
      console.log(`- Deleted ${deletedActs.count} activities`);
    }

    if (planIds.length > 0) {
      // Unlink any child plans that reference target plans as parentPlanId
      await tx.plan.updateMany({
        where: { parentPlanId: { in: planIds } },
        data: { parentPlanId: null },
      });

      // Delete plans (Cascades reviews, votes, status history, revisions)
      const deletedPlans = await tx.plan.deleteMany({
        where: { id: { in: planIds } },
      });
      console.log(`- Deleted ${deletedPlans.count} plans`);
    }
  });

  console.log(
    `\n[SUCCESS] Successfully purged all plans and activities for ${targetEmail}.`,
  );
}

main()
  .catch((err) => {
    console.error('Deletion error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
