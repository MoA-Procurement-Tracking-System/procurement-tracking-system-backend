import { prisma } from '../config/database.js';
import * as fs from 'fs';

interface StageDef {
  label: string;
  code: string;
  isRequired?: boolean;
  isConditional?: boolean;
  conditionField?: string;
}

interface MethodDef {
  code: string;
  label: string;
  aliases?: { code: string; label: string }[];
  stages: StageDef[];
}

const ROADMAP_TEMPLATES: MethodDef[] = [
  {
    code: 'MOA_GOODS_WORKS',
    label: 'MoA Treasury Local Goods, Works & Non-Consulting',
    stages: [
      {
        code: 'STG_MOA_GW_01',
        label: 'Tender advertisement / letter invitation date',
      },
      { code: 'STG_MOA_GW_02', label: 'Tender opening date' },
      { code: 'STG_MOA_GW_03', label: 'Bid evaluation report submission date' },
      { code: 'STG_MOA_GW_04', label: 'Bid evaluation report approval date' },
      {
        code: 'STG_MOA_GW_05',
        label: 'No-objection / approval date',
        isConditional: true,
      },
      { code: 'STG_MOA_GW_06', label: 'Tender result notification date' },
      { code: 'STG_MOA_GW_07', label: 'Contract signing date' },
      { code: 'STG_MOA_GW_08', label: 'L/C opening date', isConditional: true },
      { code: 'STG_MOA_GW_09', label: 'Delivery / handover date' },
    ],
  },
  {
    code: 'MOA_CONSULTANCY',
    label: 'MoA Treasury Local Consultancy',
    stages: [
      { code: 'STG_MOA_CS_01', label: 'Expression of Interest advertisement' },
      { code: 'STG_MOA_CS_02', label: 'EOI evaluation' },
      { code: 'STG_MOA_CS_03', label: 'Approval/no-objection on shortlist' },
      {
        code: 'STG_MOA_CS_04',
        label: 'Invitation of shortlisted firms/individuals or advertisement',
      },
      { code: 'STG_MOA_CS_05', label: 'Proposal/tender opening' },
      { code: 'STG_MOA_CS_06', label: 'Technical evaluation' },
      {
        code: 'STG_MOA_CS_07',
        label: 'Approval of technical evaluation minutes/report',
      },
      {
        code: 'STG_MOA_CS_08',
        label: 'No-objection (Technical)',
        isConditional: true,
      },
      { code: 'STG_MOA_CS_09', label: 'Opening of financial proposals' },
      { code: 'STG_MOA_CS_10', label: 'Combined/final evaluation' },
      { code: 'STG_MOA_CS_11', label: 'Approval of evaluation report' },
      {
        code: 'STG_MOA_CS_12',
        label: 'No-objection (Final)',
        isConditional: true,
      },
      { code: 'STG_MOA_CS_13', label: 'Negotiation' },
      {
        code: 'STG_MOA_CS_14',
        label: 'Approval/no-objection on draft contract',
      },
      {
        code: 'STG_MOA_CS_15',
        label: 'Notification of result / intention to award',
      },
      { code: 'STG_MOA_CS_16', label: 'Contract signing' },
      { code: 'STG_MOA_CS_17', label: 'Assignment/work completion' },
    ],
  },
  {
    code: 'STEP_RFB',
    label: 'STEP Request for Bids (RFB)',
    aliases: [
      { code: 'ICB', label: 'International Competitive Bidding (ICB)' },
      { code: 'NCB', label: 'National Competitive Bidding (NCB)' },
      { code: 'RFB_INT', label: 'RFB - International' },
      { code: 'RFB_NAT', label: 'RFB - National' },
    ],
    stages: [
      {
        code: 'STG_RFB_01',
        label: 'Draft Pre-qualification Documents',
        isConditional: true,
      },
      {
        code: 'STG_RFB_02',
        label: 'Specific Procurement Notice (prequalification)',
        isConditional: true,
      },
      {
        code: 'STG_RFB_03',
        label: 'Amendments to Pre-qualification Documents',
        isConditional: true,
      },
      {
        code: 'STG_RFB_04',
        label: 'Opening / Minutes of Pre-qualification',
        isConditional: true,
      },
      {
        code: 'STG_RFB_05',
        label: 'Pre-qualification Evaluation Report',
        isConditional: true,
      },
      { code: 'STG_RFB_06', label: 'Draft Bidding Documents' },
      { code: 'STG_RFB_07', label: 'Specific Procurement Notice' },
      { code: 'STG_RFB_08', label: 'Invitation to Providers' },
      {
        code: 'STG_RFB_09',
        label: 'Amendments to Bidding Documents',
        isConditional: true,
      },
      { code: 'STG_RFB_10', label: 'Bid Submission / Opening / Minutes' },
      {
        code: 'STG_RFB_11',
        label: 'Bid Evaluation Report and Recommendation for Award',
      },
      { code: 'STG_RFB_12', label: 'Notification of Intention of Award' },
      { code: 'STG_RFB_13', label: 'Signed Contract' },
      { code: 'STG_RFB_14', label: 'Contract Amendments', isConditional: true },
      { code: 'STG_RFB_15', label: 'Contract Completion' },
      {
        code: 'STG_RFB_16',
        label: 'Contract Termination',
        isConditional: true,
      },
    ],
  },
  {
    code: 'STEP_RFQ',
    label: 'STEP Request for Quotations (RFQ / Shopping)',
    aliases: [
      { code: 'RFQ', label: 'Request for Quotations' },
      { code: 'SHOPPING', label: 'Shopping' },
    ],
    stages: [
      { code: 'STG_RFQ_01', label: 'Draft Request for Quotations' },
      { code: 'STG_RFQ_02', label: 'Specific Procurement Notice' },
      { code: 'STG_RFQ_03', label: 'Invitation to Supplier / Contractor' },
      {
        code: 'STG_RFQ_04',
        label: 'Amendments to Request for Quotations',
        isConditional: true,
      },
      { code: 'STG_RFQ_05', label: 'Receive Quotations' },
      { code: 'STG_RFQ_06', label: 'Comparison of Quotations' },
      { code: 'STG_RFQ_07', label: 'Notification of Intention of Award' },
      { code: 'STG_RFQ_08', label: 'Signed Contract' },
      { code: 'STG_RFQ_09', label: 'Contract Amendments', isConditional: true },
      { code: 'STG_RFQ_10', label: 'Contract Completion' },
      {
        code: 'STG_RFQ_11',
        label: 'Contract Termination',
        isConditional: true,
      },
    ],
  },
  {
    code: 'STEP_DIRECT',
    label: 'STEP Direct Procurement / Selection (DIR)',
    aliases: [{ code: 'DIR', label: 'Direct Procurement' }],
    stages: [
      { code: 'STG_DIR_01', label: 'Justification for Direct Procurement' },
      { code: 'STG_DIR_02', label: 'Invitation to Supplier / Contractor' },
      { code: 'STG_DIR_03', label: 'Draft Contract' },
      { code: 'STG_DIR_04', label: 'Notification of Intention of Award' },
      { code: 'STG_DIR_05', label: 'Signed Contract' },
      { code: 'STG_DIR_06', label: 'Contract Amendments', isConditional: true },
      { code: 'STG_DIR_07', label: 'Contract Completion' },
      {
        code: 'STG_DIR_08',
        label: 'Contract Termination',
        isConditional: true,
      },
    ],
  },
  {
    code: 'STEP_UN',
    label: 'STEP UN Agency Direct Procurement (UN / UNOPS)',
    aliases: [{ code: 'UN', label: 'UN Agency Direct' }],
    stages: [
      { code: 'STG_UN_01', label: 'Justification for Direct Procurement' },
      {
        code: 'STG_UN_02',
        label: 'Invitation / Request to UN Agency or Supplier',
      },
      { code: 'STG_UN_03', label: 'Draft Contract' },
      { code: 'STG_UN_04', label: 'Notification of Intention of Award' },
      { code: 'STG_UN_05', label: 'Signed Contract' },
      { code: 'STG_UN_06', label: 'Contract Amendments', isConditional: true },
      { code: 'STG_UN_07', label: 'Contract Completion' },
      { code: 'STG_UN_08', label: 'Contract Termination', isConditional: true },
    ],
  },
  {
    code: 'STEP_QCBS_FBS_LCS',
    label: 'STEP QCBS / FBS / LCS Consultancy',
    aliases: [
      { code: 'QCBS', label: 'Quality and Cost Based Selection' },
      { code: 'FBS', label: 'Fixed Budget Selection' },
      { code: 'LCS', label: 'Least Cost Selection' },
    ],
    stages: [
      { code: 'STG_QCBS_01', label: 'Terms of Reference' },
      { code: 'STG_QCBS_02', label: 'Expression of Interest' },
      {
        code: 'STG_QCBS_03',
        label:
          'Evaluation of Expression of Interest and Short List of Consultants',
      },
      {
        code: 'STG_QCBS_04',
        label: 'Short List and Draft Request for Proposals',
      },
      { code: 'STG_QCBS_05', label: 'Request for Proposals as Issued' },
      {
        code: 'STG_QCBS_06',
        label: 'Amendments to Request for Proposals',
        isConditional: true,
      },
      {
        code: 'STG_QCBS_07',
        label: 'Opening of Technical Proposals / Minutes',
      },
      { code: 'STG_QCBS_08', label: 'Evaluation of Technical Proposals' },
      {
        code: 'STG_QCBS_09',
        label: 'Opening of Financial Proposals / Minutes',
      },
      {
        code: 'STG_QCBS_10',
        label: 'Combined Evaluation Report and Draft Negotiated Contract',
      },
      { code: 'STG_QCBS_11', label: 'Notification of Intention of Award' },
      { code: 'STG_QCBS_12', label: 'Signed Contract' },
      {
        code: 'STG_QCBS_13',
        label: 'Contract Amendments',
        isConditional: true,
      },
      { code: 'STG_QCBS_14', label: 'Contract Completion' },
      {
        code: 'STG_QCBS_15',
        label: 'Contract Termination',
        isConditional: true,
      },
    ],
  },
  {
    code: 'STEP_CQS',
    label: 'STEP Consultant Qualification Selection (CQS)',
    aliases: [{ code: 'CQS', label: 'Consultant Qualification Selection' }],
    stages: [
      { code: 'STG_CQS_01', label: 'Terms of Reference' },
      { code: 'STG_CQS_02', label: 'Expression of Interest' },
      {
        code: 'STG_CQS_03',
        label:
          'Evaluation of Expression of Interest and Short List of Consultants',
      },
      {
        code: 'STG_CQS_04',
        label: 'Short List and Draft Request for Proposals',
      },
      { code: 'STG_CQS_05', label: 'Draft Negotiated Contract' },
      { code: 'STG_CQS_06', label: 'Notification of Intention of Award' },
      { code: 'STG_CQS_07', label: 'Signed Contract' },
      { code: 'STG_CQS_08', label: 'Contract Amendments', isConditional: true },
      { code: 'STG_CQS_09', label: 'Contract Completion' },
      {
        code: 'STG_CQS_10',
        label: 'Contract Termination',
        isConditional: true,
      },
    ],
  },
  {
    code: 'STEP_INDV',
    label: 'STEP Individual Consultant Selection (INDV / IC)',
    aliases: [
      { code: 'INDV', label: 'Individual Consultant Selection' },
      { code: 'IC', label: 'Individual Consultant' },
    ],
    stages: [
      { code: 'STG_INDV_01', label: 'Terms of Reference' },
      { code: 'STG_INDV_02', label: 'Expression of Interest' },
      {
        code: 'STG_INDV_03',
        label:
          'Evaluation of Expression of Interest and Short List of Consultants',
      },
      {
        code: 'STG_INDV_04',
        label: 'Justification for Direct Selection (when applicable)',
        isConditional: true,
      },
      {
        code: 'STG_INDV_05',
        label: 'Invitation to Identified / Selected Consultant',
      },
      { code: 'STG_INDV_06', label: 'Draft Negotiated Contract' },
      { code: 'STG_INDV_07', label: 'Notification of Intention of Award' },
      { code: 'STG_INDV_08', label: 'Signed Contract' },
      {
        code: 'STG_INDV_09',
        label: 'Contract Amendments',
        isConditional: true,
      },
      { code: 'STG_INDV_10', label: 'Contract Completion' },
      {
        code: 'STG_INDV_11',
        label: 'Contract Termination',
        isConditional: true,
      },
    ],
  },
];

export async function seedRoadmapTemplates() {
  console.log('🚀 Seeding Roadmap Stage Templates...');

  for (const templateGroup of ROADMAP_TEMPLATES) {
    // 1. Ensure Procurement Method Lookup
    const methodLookup = await prisma.lookupValue.upsert({
      where: {
        type_code: {
          type: 'PROCUREMENT_METHOD',
          code: templateGroup.code,
        },
      },
      update: { label: templateGroup.label, isActive: true },
      create: {
        type: 'PROCUREMENT_METHOD',
        code: templateGroup.code,
        label: templateGroup.label,
        isActive: true,
      },
    });

    // 1b. Ensure Legacy Aliases point to same method lookup or exist
    if (templateGroup.aliases) {
      for (const alias of templateGroup.aliases) {
        await prisma.lookupValue.upsert({
          where: {
            type_code: {
              type: 'PROCUREMENT_METHOD',
              code: alias.code,
            },
          },
          update: { label: alias.label, isActive: true },
          create: {
            type: 'PROCUREMENT_METHOD',
            code: alias.code,
            label: alias.label,
            isActive: true,
          },
        });
      }
    }

    // 2. Process stages for primary method lookup
    const allMethodsToSeed = [
      methodLookup,
      ...(templateGroup.aliases
        ? await Promise.all(
            templateGroup.aliases.map((alias) =>
              prisma.lookupValue.findUniqueOrThrow({
                where: {
                  type_code: {
                    type: 'PROCUREMENT_METHOD',
                    code: alias.code,
                  },
                },
              }),
            ),
          )
        : []),
    ];

    for (const methodItem of allMethodsToSeed) {
      for (const [i, stageDef] of templateGroup.stages.entries()) {
        const sequence = i + 1;

        // Upsert STAGE_TYPE LookupValue
        const stageTypeLookup = await prisma.lookupValue.upsert({
          where: {
            type_code: {
              type: 'STAGE_TYPE',
              code: stageDef.code,
            },
          },
          update: { label: stageDef.label, isActive: true },
          create: {
            type: 'STAGE_TYPE',
            code: stageDef.code,
            label: stageDef.label,
            isActive: true,
          },
        });

        // Upsert StageTemplate mapping
        await prisma.stageTemplate.upsert({
          where: {
            procurementMethodId_sequence: {
              procurementMethodId: methodItem.id,
              sequence: sequence,
            },
          },
          update: {
            stageTypeId: stageTypeLookup.id,
            isRequired: stageDef.isRequired ?? !stageDef.isConditional,
            isConditional: stageDef.isConditional ?? false,
            conditionField: stageDef.conditionField ?? null,
          },
          create: {
            procurementMethodId: methodItem.id,
            stageTypeId: stageTypeLookup.id,
            sequence: sequence,
            isRequired: stageDef.isRequired ?? !stageDef.isConditional,
            isConditional: stageDef.isConditional ?? false,
            conditionField: stageDef.conditionField ?? null,
          },
        });
      }
    }

    console.log(
      `  ✅ Seeded ${templateGroup.stages.length} stages for method: ${templateGroup.code} (${templateGroup.label})`,
    );
  }

  console.log('🎉 All 9 Roadmap Stage Templates successfully seeded!');
}

import { fileURLToPath } from 'url';
import * as path from 'path';

const isMain = () => {
  if (!process.argv[1]) return false;
  try {
    const mainPath = fs.realpathSync(process.argv[1]);
    const modulePath = fileURLToPath(import.meta.url);
    return mainPath === modulePath;
  } catch {
    return false;
  }
};

if (isMain()) {
  seedRoadmapTemplates()
    .catch((err) => {
      console.error('❌ Error seeding roadmap templates:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
