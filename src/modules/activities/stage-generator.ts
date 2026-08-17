import {
  StageStatus,
  Prisma,
  StageTemplate,
} from '../../generated/prisma/client.js';

export async function generateStagesForActivity(
  tx: Prisma.TransactionClient,
  activityId: string,
  procurementMethodId: string,
) {
  // 1. Fetch the templates for the given procurement method
  const templates = await tx.stageTemplate.findMany({
    where: { procurementMethodId },
    orderBy: { sequence: 'asc' },
  });

  if (templates.length === 0) {
    // No templates defined for this method yet.
    return [];
  }

  // 2. Create the Stage records for the activity
  const stagesToCreate = templates.map((template: StageTemplate) => ({
    activityId,
    stageTypeId: template.stageTypeId,
    sequence: template.sequence,
    status: StageStatus.PENDING,
  }));

  await tx.stage.createMany({
    data: stagesToCreate,
  });

  return stagesToCreate;
}
