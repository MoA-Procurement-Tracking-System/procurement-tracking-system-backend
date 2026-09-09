import { prisma } from './config/database.js';
import { hashPassword } from './modules/auth/auth.security.js';
import {
  UserRole,
  UserStatus,
  PlanStatus,
  VoteDecision,
  ActivityStatus,
  StageStatus,
} from './generated/prisma/index.js';

async function main() {
  console.log('🚀 Seeding comprehensive Committee Review demo data...');

  // 1. Password hash for all demo users
  const defaultPasswordHash = await hashPassword('Admin123!');
  const committeePasswordHash = await hashPassword('Committee123!');

  // 2. Ensure Officers & Directors
  const officer = await prisma.user.upsert({
    where: { email: 'officer@moa.gov.et' },
    update: {
      passwordHash: defaultPasswordHash,
      isActive: true,
      status: UserStatus.ACTIVE,
    },
    create: {
      email: 'officer@moa.gov.et',
      name: 'Abebe Kebede (Lead Officer)',
      displayName: 'Abebe Kebede',
      username: 'officer',
      passwordHash: defaultPasswordHash,
      authRole: UserRole.OFFICER,
      status: UserStatus.ACTIVE,
      isActive: true,
    },
  });

  const director = await prisma.user.upsert({
    where: { email: 'director@moa.gov.et' },
    update: {
      passwordHash: defaultPasswordHash,
      isActive: true,
      status: UserStatus.ACTIVE,
    },
    create: {
      email: 'director@moa.gov.et',
      name: 'Dr. Solomon Haile (Director)',
      displayName: 'Dr. Solomon Haile',
      username: 'director',
      passwordHash: defaultPasswordHash,
      authRole: UserRole.DIRECTOR,
      status: UserStatus.ACTIVE,
      isActive: true,
    },
  });

  // 3. Ensure 3 Committee Members
  const committeeMember1 = await prisma.user.upsert({
    where: { email: 'committee@moa.gov.et' },
    update: {
      passwordHash: committeePasswordHash,
      isActive: true,
      status: UserStatus.ACTIVE,
    },
    create: {
      email: 'committee@moa.gov.et',
      name: 'Dawit Mengistu (Committee Chair)',
      displayName: 'Dawit Mengistu',
      username: 'committee',
      passwordHash: committeePasswordHash,
      authRole: UserRole.ENDORSING_COMMITTEE,
      status: UserStatus.ACTIVE,
      isActive: true,
    },
  });

  const committeeMember2 = await prisma.user.upsert({
    where: { email: 'dr.alemayehu@moa.gov.et' },
    update: {
      passwordHash: defaultPasswordHash,
      isActive: true,
      status: UserStatus.ACTIVE,
    },
    create: {
      email: 'dr.alemayehu@moa.gov.et',
      name: 'Dr. Alemayehu G. (Finance Specialist)',
      displayName: 'Dr. Alemayehu G.',
      username: 'alemayehu',
      passwordHash: defaultPasswordHash,
      authRole: UserRole.ENDORSING_COMMITTEE,
      status: UserStatus.ACTIVE,
      isActive: true,
    },
  });

  const committeeMember3 = await prisma.user.upsert({
    where: { email: 'eng.tigist@moa.gov.et' },
    update: {
      passwordHash: defaultPasswordHash,
      isActive: true,
      status: UserStatus.ACTIVE,
    },
    create: {
      email: 'eng.tigist@moa.gov.et',
      name: 'Eng. Tigist M. (Senior Technical Advisor)',
      displayName: 'Eng. Tigist M.',
      username: 'tigist',
      passwordHash: defaultPasswordHash,
      authRole: UserRole.ENDORSING_COMMITTEE,
      status: UserStatus.ACTIVE,
      isActive: true,
    },
  });

  console.log('✅ Committee members verified:');
  console.log(`   - ${committeeMember1.email} (You login here)`);
  console.log(`   - ${committeeMember2.email}`);
  console.log(`   - ${committeeMember3.email}`);

  // Lookups cache
  const lookups = await prisma.lookupValue.findMany();
  const getLookup = (type: string, code: string) => {
    const item = lookups.find((l) => l.type === type && l.code === code);
    if (!item) throw new Error(`Missing lookup: ${type} ${code}`);
    return item.id;
  };

  const methodNCB = getLookup('PROCUREMENT_METHOD', 'NCB');
  const methodICB = getLookup('PROCUREMENT_METHOD', 'ICB');
  const methodRFQ = getLookup('PROCUREMENT_METHOD', 'RFQ');
  const methodDirect = getLookup('PROCUREMENT_METHOD', 'DIRECT');

  const fundingWB = getLookup('FUNDING_SOURCE', 'WB');
  const fundingAFDB = getLookup('FUNDING_SOURCE', 'AFDB');
  const fundingGOV = getLookup('FUNDING_SOURCE', 'GOV');

  const sectorAgri = getLookup('SECTOR', 'AGRI');
  const sectorLivestock = getLookup('SECTOR', 'LIVESTOCK');
  const sectorIrrigation = getLookup('SECTOR', 'IRRIGATION');

  const stagePrep = getLookup('STAGE_TYPE', 'PREP');
  const stageBidding = getLookup('STAGE_TYPE', 'BIDDING');
  const stageEval = getLookup('STAGE_TYPE', 'EVALUATION');
  const stageAward = getLookup('STAGE_TYPE', 'AWARD');
  const stageContract = getLookup('STAGE_TYPE', 'CONTRACT');

  // 4. Create 4 Projects
  const project1 = await prisma.project.upsert({
    where: { code: 'AGP-II' },
    update: {},
    create: {
      code: 'AGP-II',
      name: 'Second Agricultural Growth Program',
      country: 'Ethiopia',
      executingAgency: 'Ministry of Agriculture',
      organization: 'Federal Project Coordination Unit (FPCU)',
      fundingSourceId: fundingWB,
      sectorId: sectorAgri,
      baseCurrency: 'ETB',
      projectStartDate: new Date('2024-07-08'),
      projectEndDate: new Date('2029-07-07'),
      components: [
        'Smallholder Production Enhancement',
        'Market Linkages and Agro-Processing',
      ],
      subcomponents: [
        'Certified Seed Distribution',
        'Post-Harvest Infrastructure',
      ],
    },
  });

  const project2 = await prisma.project.upsert({
    where: { code: 'DRSLP-II' },
    update: {},
    create: {
      code: 'DRSLP-II',
      name: 'Drought Resilience and Sustainable Livelihoods Programme',
      country: 'Ethiopia',
      executingAgency: 'Ministry of Agriculture',
      organization: 'Natural Resources and Pastoral Directorate',
      fundingSourceId: fundingAFDB,
      sectorId: sectorIrrigation,
      baseCurrency: 'ETB',
      projectStartDate: new Date('2024-01-01'),
      projectEndDate: new Date('2028-12-31'),
      components: [
        'Water Mobilization and Small-Scale Irrigation',
        'Pastoral Capacity Building',
      ],
    },
  });

  const project3 = await prisma.project.upsert({
    where: { code: 'LFSDP-ET' },
    update: {},
    create: {
      code: 'LFSDP-ET',
      name: 'Livestock and Fisheries Sector Development Project',
      country: 'Ethiopia',
      executingAgency: 'Ministry of Agriculture',
      organization: 'Livestock Sector State Ministry',
      fundingSourceId: fundingWB,
      sectorId: sectorLivestock,
      baseCurrency: 'ETB',
      projectStartDate: new Date('2023-09-01'),
      projectEndDate: new Date('2028-08-31'),
      components: [
        'Animal Health & Veterinary Services',
        'Fisheries Value Chain Expansion',
      ],
    },
  });

  const project4 = await prisma.project.upsert({
    where: { code: 'CALM-01' },
    update: {},
    create: {
      code: 'CALM-01',
      name: 'Climate Action Through Landscape Management',
      country: 'Ethiopia',
      executingAgency: 'Ministry of Agriculture',
      organization: 'Sustainable Land Management Directorate',
      fundingSourceId: fundingGOV,
      sectorId: sectorAgri,
      baseCurrency: 'ETB',
      projectStartDate: new Date('2024-06-01'),
      projectEndDate: new Date('2027-05-31'),
      components: ['Watershed Restoration', 'Participatory Land Use Planning'],
    },
  });

  console.log('✅ Projects verified: AGP-II, DRSLP-II, LFSDP-ET, CALM-01');

  // Helper to create Activity with 5 standard stages
  const createActivityWithStages = async (
    planId: string,
    reference: string,
    description: string,
    methodId: string,
    estimatedBudget: number,
    baseDate: Date,
  ) => {
    const existing = await prisma.activity.findUnique({ where: { reference } });
    if (existing) return existing;

    const act = await prisma.activity.create({
      data: {
        planId,
        reference,
        description,
        procurementMethodId: methodId,
        estimatedBudget,
        currency: 'ETB',
        reviewType: 'Prior Review',
        marketApproach: 'National Open',
        status: ActivityStatus.PLANNED,
      },
    });

    const stageDefs = [
      { typeId: stagePrep, seq: 1, days: 15 },
      { typeId: stageBidding, seq: 2, days: 30 },
      { typeId: stageEval, seq: 3, days: 20 },
      { typeId: stageAward, seq: 4, days: 10 },
      { typeId: stageContract, seq: 5, days: 14 },
    ];

    let currentStart = new Date(baseDate);
    for (const def of stageDefs) {
      const currentEnd = new Date(currentStart.getTime() + def.days * 86400000);
      await prisma.stage.create({
        data: {
          activityId: act.id,
          stageTypeId: def.typeId,
          sequence: def.seq,
          status: StageStatus.NOT_STARTED,
          plannedStartDate: currentStart,
          plannedEndDate: currentEnd,
          plannedDays: def.days,
          currentTargetStartDate: currentStart,
          currentTargetEndDate: currentEnd,
        },
      });
      currentStart = new Date(currentEnd.getTime() + 1 * 86400000);
    }

    return act;
  };

  // -------------------------------------------------------------
  // PLAN 1: Awaiting My Vote (Priority, 1/3 votes cast)
  // -------------------------------------------------------------
  let plan1 = await prisma.plan.findFirst({
    where: {
      title:
        'Supply of Certified Hybrid Maize and Wheat Seed Packages (2018 EFY)',
    },
  });
  if (!plan1) {
    plan1 = await prisma.plan.create({
      data: {
        projectId: project1.id,
        title:
          'Supply of Certified Hybrid Maize and Wheat Seed Packages (2018 EFY)',
        budgetYear: '2018 EFY',
        procurementCategory: 'Goods',
        organization: project1.organization,
        description:
          'Bulk procurement of climate-resilient hybrid maize (BH-546) and certified bread wheat seed for high-priority agrarian clusters.',
        periodStart: new Date('2026-07-08'),
        periodEnd: new Date('2027-07-07'),
        status: PlanStatus.WITH_COMMITTEE,
        committeeRound: 1,
        committeeVoteDeadline: new Date(Date.now() + 4 * 86400000), // In 4 days
        createdBy: officer.id,
        approvedById: director.id,
        approvedAt: new Date(Date.now() - 2 * 86400000),
      },
    });

    await createActivityWithStages(
      plan1.id,
      'AGP-II-GD-001',
      'Procurement of 5,000 Quintals Certified Hybrid Maize Seed (Lot 1: Oromia & Amhara)',
      methodNCB,
      18500000,
      new Date('2026-09-15'),
    );

    await createActivityWithStages(
      plan1.id,
      'AGP-II-GD-002',
      'Procurement of 3,200 Quintals Certified Bread Wheat Seed (Lot 2: Southern Cluster)',
      methodNCB,
      12200000,
      new Date('2026-10-01'),
    );

    // Vote from Alemayehu only (Awaiting Committee Chair vote!)
    await prisma.committeeVote.create({
      data: {
        planId: plan1.id,
        round: 1,
        memberId: committeeMember2.id,
        decision: VoteDecision.APPROVE,
        comment:
          'Seed quality standards verified with the Ethiopian Agricultural Authority. Pricing is aligned with seasonal benchmarks.',
      },
    });
  }

  // -------------------------------------------------------------
  // PLAN 2: Delayed Review (Deadline was 3 days ago! 0/3 votes cast)
  // -------------------------------------------------------------
  let plan2 = await prisma.plan.findFirst({
    where: {
      title: 'Smallholder Solar-Powered Drip Irrigation Systems Construction',
    },
  });
  if (!plan2) {
    plan2 = await prisma.plan.create({
      data: {
        projectId: project2.id,
        title: 'Smallholder Solar-Powered Drip Irrigation Systems Construction',
        budgetYear: '2018 EFY',
        procurementCategory: 'Works',
        organization: project2.organization,
        description:
          'Civil works and electromechanical installation of solar pump stations, community holding tanks, and micro-drip networks across 12 woredas.',
        periodStart: new Date('2026-07-08'),
        periodEnd: new Date('2027-07-07'),
        status: PlanStatus.WITH_COMMITTEE,
        committeeRound: 1,
        committeeVoteDeadline: new Date(Date.now() - 3 * 86400000), // 3 days OVERDUE!
        createdBy: officer.id,
        approvedById: director.id,
        approvedAt: new Date(Date.now() - 7 * 86400000),
      },
    });

    await createActivityWithStages(
      plan2.id,
      'DRSLP-WK-001',
      'Construction of 12 Solar Pumping Stations and Water Reservoir Tanks',
      methodICB,
      42000000,
      new Date('2026-09-01'),
    );

    await createActivityWithStages(
      plan2.id,
      'DRSLP-GD-002',
      'Supply and Laying of High-Density Polyethylene (HDPE) Distribution Pipes',
      methodNCB,
      9800000,
      new Date('2026-10-15'),
    );
  }

  // -------------------------------------------------------------
  // PLAN 3: Awaiting Vote (2/3 votes cast — Your vote is decisive!)
  // -------------------------------------------------------------
  let plan3 = await prisma.plan.findFirst({
    where: {
      title: 'Veterinary Vaccines and Cold Chain Refrigeration Equipment',
    },
  });
  if (!plan3) {
    plan3 = await prisma.plan.create({
      data: {
        projectId: project3.id,
        title: 'Veterinary Vaccines and Cold Chain Refrigeration Equipment',
        budgetYear: '2018 EFY',
        procurementCategory: 'Goods',
        organization: project3.organization,
        description:
          'Emergency procurement of 250,000 doses of FMD and Anthrax livestock vaccines plus 30 solar-powered cold storage freezers for remote veterinary posts.',
        periodStart: new Date('2026-07-08'),
        periodEnd: new Date('2027-07-07'),
        status: PlanStatus.WITH_COMMITTEE,
        committeeRound: 1,
        committeeVoteDeadline: new Date(Date.now() + 1 * 86400000), // Tomorrow
        createdBy: officer.id,
        approvedById: director.id,
        approvedAt: new Date(Date.now() - 1 * 86400000),
      },
    });

    await createActivityWithStages(
      plan3.id,
      'LFSDP-GD-001',
      'Emergency Foot-and-Mouth Disease (FMD) Vaccine Doses (250,000 units)',
      methodDirect,
      8400000,
      new Date('2026-08-20'),
    );

    await createActivityWithStages(
      plan3.id,
      'LFSDP-GD-002',
      'Solar-Powered Vaccine Storage Freezers for 30 Rural Veterinary Clinics',
      methodRFQ,
      6100000,
      new Date('2026-09-10'),
    );

    // Votes from Alemayehu and Tigist (Both Approved)
    await prisma.committeeVote.create({
      data: {
        planId: plan3.id,
        round: 1,
        memberId: committeeMember2.id,
        decision: VoteDecision.APPROVE,
        comment:
          'Urgent epidemiological risk justifies direct contracting for vaccines. Cold chain pricing verified within budget.',
      },
    });

    await prisma.committeeVote.create({
      data: {
        planId: plan3.id,
        round: 1,
        memberId: committeeMember3.id,
        decision: VoteDecision.APPROVE,
        comment:
          'Technical specifications for solar freezers comply with national vaccine cold chain requirements.',
      },
    });
  }

  // -------------------------------------------------------------
  // PLAN 4: Already Reviewed by Me (Approved — in Recent Decisions)
  // -------------------------------------------------------------
  let plan4 = await prisma.plan.findFirst({
    where: {
      title:
        'Consultancy Services for Watershed GIS Mapping and Environmental Audit',
    },
  });
  if (!plan4) {
    plan4 = await prisma.plan.create({
      data: {
        projectId: project4.id,
        title:
          'Consultancy Services for Watershed GIS Mapping and Environmental Audit',
        budgetYear: '2018 EFY',
        procurementCategory: 'Consulting Services',
        organization: project4.organization,
        description:
          'Comprehensive high-resolution remote sensing baseline analysis, soil degradation audit, and participatory watershed demarcation mapping.',
        periodStart: new Date('2026-07-08'),
        periodEnd: new Date('2027-07-07'),
        status: PlanStatus.APPROVED,
        committeeRound: 1,
        committeeVoteDeadline: new Date(Date.now() - 5 * 86400000),
        createdBy: officer.id,
        approvedById: director.id,
        approvedAt: new Date(Date.now() - 2 * 86400000),
      },
    });

    await createActivityWithStages(
      plan4.id,
      'CALM-CS-001',
      'Consulting Services for Basin-Wide Satellite Remote Sensing and Land-Use Mapping',
      methodICB,
      7500000,
      new Date('2026-08-01'),
    );

    // Votes from all 3 members including Dawit (the current user)
    await prisma.committeeVote.create({
      data: {
        planId: plan4.id,
        round: 1,
        memberId: committeeMember1.id,
        decision: VoteDecision.APPROVE,
        comment:
          'Terms of Reference are well formulated and critical for forthcoming Climate Fund milestones. Fully endorsed.',
        createdAt: new Date(Date.now() - 2 * 86400000),
      },
    });

    await prisma.committeeVote.create({
      data: {
        planId: plan4.id,
        round: 1,
        memberId: committeeMember2.id,
        decision: VoteDecision.APPROVE,
        comment:
          'Financial breakdown conforms to World Bank consultant fee scales.',
        createdAt: new Date(Date.now() - 2 * 86400000),
      },
    });

    await prisma.committeeVote.create({
      data: {
        planId: plan4.id,
        round: 1,
        memberId: committeeMember3.id,
        decision: VoteDecision.APPROVE,
        comment: 'Technical scope approved without reservations.',
        createdAt: new Date(Date.now() - 2 * 86400000),
      },
    });
  }

  // -------------------------------------------------------------
  // PLAN 5: Already Reviewed by Me (Rejected — in Recent Decisions)
  // -------------------------------------------------------------
  let plan5 = await prisma.plan.findFirst({
    where: {
      title:
        'Procurement of 15 Heavy-Duty Four-Wheel-Drive Field Inspection Vehicles',
    },
  });
  if (!plan5) {
    plan5 = await prisma.plan.create({
      data: {
        projectId: project1.id,
        title:
          'Procurement of 15 Heavy-Duty Four-Wheel-Drive Field Inspection Vehicles',
        budgetYear: '2018 EFY',
        procurementCategory: 'Goods',
        organization: project1.organization,
        description:
          'Fleet renewal for project field supervision teams across remote zonal agricultural bureaus.',
        periodStart: new Date('2026-07-08'),
        periodEnd: new Date('2027-07-07'),
        status: PlanStatus.REJECTED,
        rejectionReason:
          'Total estimated budget exceeds passenger vehicle fiscal limits without prior written waiver from the Ministry of Finance.',
        committeeRound: 1,
        committeeVoteDeadline: new Date(Date.now() - 6 * 86400000),
        createdBy: officer.id,
        rejectedById: director.id,
        rejectedAt: new Date(Date.now() - 4 * 86400000),
      },
    });

    await createActivityWithStages(
      plan5.id,
      'AGP-II-GD-005',
      'Supply and Delivery of 10 Units Double-Cabin 4x4 Field Inspection Vehicles',
      methodICB,
      65000000,
      new Date('2026-07-15'),
    );

    await createActivityWithStages(
      plan5.id,
      'AGP-II-GD-006',
      'Supply and Delivery of 5 Units Station Wagons for Senior Project Supervision',
      methodICB,
      38000000,
      new Date('2026-07-20'),
    );

    // Rejection votes
    await prisma.committeeVote.create({
      data: {
        planId: plan5.id,
        round: 1,
        memberId: committeeMember1.id,
        decision: VoteDecision.REJECT,
        comment:
          'Budget exceeds annual vehicle procurement allowance. Project must submit formal clearance from MOF before resubmission.',
        createdAt: new Date(Date.now() - 4 * 86400000),
      },
    });

    await prisma.committeeVote.create({
      data: {
        planId: plan5.id,
        round: 1,
        memberId: committeeMember2.id,
        decision: VoteDecision.REJECT,
        comment:
          'Lacks foreign currency allocation confirmation from National Bank of Ethiopia.',
        createdAt: new Date(Date.now() - 4 * 86400000),
      },
    });
  }

  console.log('✅ 5 Diverse Plans with Activities & Votes created/verified:');
  console.log(
    '   1. Hybrid Maize & Wheat Seed Packages (Awaiting Vote, 1/3 progress)',
  );
  console.log(
    '   2. Solar-Powered Drip Irrigation Systems (Delayed Review, Overdue!)',
  );
  console.log(
    '   3. Veterinary Vaccines & Cold Chain (Awaiting Vote, 2/3 progress)',
  );
  console.log(
    '   4. Watershed GIS Mapping & Environmental Audit (Approved in Recent Decisions)',
  );
  console.log(
    '   5. 15 Heavy-Duty Field Inspection Vehicles (Rejected in Recent Decisions)',
  );
  console.log('\n🎉 Committee Review demo seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during demo seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
