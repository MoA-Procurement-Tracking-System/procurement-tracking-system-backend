import {
  RevisionEntityType,
  RevisionChangeType,
  Prisma,
} from '../../generated/prisma/client.js';

export const logRevision = async (
  tx: Prisma.TransactionClient,
  entityType: RevisionEntityType,
  changeType: RevisionChangeType,
  entityId: string,
  changedById: string,
  previousValues: unknown,
  newValues: unknown,
) => {
  const data: Prisma.RevisionUncheckedCreateInput = {
    entityType,
    changeType,
    changedById,
    previousValues: previousValues
      ? JSON.parse(JSON.stringify(previousValues))
      : null,
    newValues: newValues ? JSON.parse(JSON.stringify(newValues)) : null,
  };

  switch (entityType) {
    case RevisionEntityType.PROJECT:
      data.projectId = entityId;
      break;
    case RevisionEntityType.PLAN:
      data.planId = entityId;
      break;
    case RevisionEntityType.ACTIVITY:
      data.activityId = entityId;
      break;
    case RevisionEntityType.STAGE:
      data.stageId = entityId;
      break;
  }

  return tx.revision.create({ data });
};
