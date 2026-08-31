import { StageStatus } from '../../generated/prisma/index.js';
import type { Prisma } from '../../generated/prisma/index.js';

export interface CustomStageInput {
  sequence?: number | undefined;
  stageTypeId?: string | undefined;
  name?: string | undefined;
  notApplicable?: boolean | undefined;
  isNotApplicable?: boolean | undefined;
  status?: string | undefined;
  plannedStartDate?: string | Date | undefined;
  plannedEndDate?: string | Date | undefined;
  gregorianDate?: string | Date | undefined;
  plannedDays?: number | undefined;
  remarks?: string | undefined;
}

export async function generateStagesForActivity(
  tx: Prisma.TransactionClient,
  activityId: string,
  procurementMethodId: string,
  customStages?: CustomStageInput[],
) {
  // 1. Fetch the templates for the given procurement method
  const templates = await tx.stageTemplate.findMany({
    where: { procurementMethodId },
    include: { stageType: true },
    orderBy: { sequence: 'asc' },
  });

  if (templates.length === 0) {
    // No templates defined for this method yet.
    return [];
  }

  const baseDate = new Date('2026-09-05T00:00:00Z');
  const activeOffset = 0;

  // 2. Create the Stage records for the activity
  const stagesToCreate = templates.map((template, idx: number) => {
    const isTemplateOptional = !template.isRequired || template.isConditional;

    const custom = customStages?.find(
      (cs, csIdx) =>
        cs.sequence === template.sequence ||
        cs.stageTypeId === template.stageTypeId ||
        (cs.name &&
          template.stageType?.label &&
          cs.name.toLowerCase() === template.stageType.label.toLowerCase()) ||
        csIdx === idx,
    );

    const isNA = custom
      ? Boolean(
          custom.notApplicable ||
          custom.isNotApplicable ||
          custom.status === 'NOT_APPLICABLE' ||
          custom.status === 'Not Applicable',
        )
      : false; // Default to NOT_STARTED, never auto-mark N/A without officer input

    let plannedStart: Date | null = null;
    if (!isNA) {
      if (custom?.plannedStartDate || custom?.gregorianDate) {
        const rawDate = custom.plannedStartDate || custom.gregorianDate;
        plannedStart = new Date(rawDate!);
        if (isNaN(plannedStart.getTime())) plannedStart = null;
      }
    }

    const plannedDays = custom?.plannedDays || 14;
    let plannedEnd: Date | null = null;
    if (plannedStart && !isNaN(plannedStart.getTime())) {
      plannedEnd = new Date(plannedStart);
      plannedEnd.setUTCDate(plannedStart.getUTCDate() + plannedDays);
    }

    return {
      activityId,
      stageTypeId: template.stageTypeId,
      sequence: template.sequence,
      status: isNA
        ? StageStatus.NOT_APPLICABLE
        : custom?.status === 'IN_PROGRESS' || custom?.status === 'In Progress'
          ? StageStatus.IN_PROGRESS
          : custom?.status === 'COMPLETED' || custom?.status === 'Completed'
            ? StageStatus.COMPLETED
            : StageStatus.NOT_STARTED,
      plannedStartDate: isNA ? null : plannedStart,
      plannedEndDate: isNA ? null : plannedEnd,
      currentTargetStartDate: isNA ? null : plannedStart,
      currentTargetEndDate: isNA ? null : plannedEnd,
      plannedDays: isNA ? 0 : plannedDays,
      isNotApplicable: isNA,
      remarks: custom?.remarks || null,
    };
  });

  await tx.stage.createMany({
    data: stagesToCreate,
  });

  return stagesToCreate;
}
