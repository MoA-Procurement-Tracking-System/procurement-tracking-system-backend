import { RevisionEntityType, RevisionChangeType } from '../../generated/prisma/client.js';

export const logRevision = async (
    tx: any,
    entityType: RevisionEntityType,
    changeType: RevisionChangeType,
    entityId: string,
    changedById: string,
    previousValues: any,
    newValues: any
) => {
    const data: any = {
        entityType,
        changeType,
        changedById,
        previousValues: previousValues ? JSON.parse(JSON.stringify(previousValues)) : null,
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
