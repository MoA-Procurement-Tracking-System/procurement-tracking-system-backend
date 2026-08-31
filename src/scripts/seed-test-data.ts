import { prisma } from '../config/database.js';
import { Role, UserRole } from '../generated/prisma/index.js';
import { hashPassword } from '../modules/auth/auth.security.js';

async function main() {
  const passwordHash = await hashPassword('Password123!');

  const coreAccounts = [
    {
      email: 'yabfikre@gmail.com',
      name: 'Yeabsira Fikre',
      role: Role.Administrator,
      authRole: UserRole.ADMIN,
    },
    {
      email: 'fikreyabsira@gmail.com',
      name: 'Yeabsira Fikre',
      role: Role.Administrator,
      authRole: UserRole.ADMIN,
    },
    {
      email: 'admin@moa.gov.et',
      name: 'System Administrator',
      role: Role.Administrator,
      authRole: UserRole.ADMIN,
    },
    {
      email: 'officer@moa.gov.et',
      name: 'Abebe Bikila',
      role: Role.ProcurementOfficer,
      authRole: UserRole.OFFICER,
    },
    {
      email: 'director@moa.gov.et',
      name: 'Dr. Aster Kebede',
      role: Role.ProcurementDirector,
      authRole: UserRole.DIRECTOR,
    },
    {
      email: 'genet@moa.gov.et',
      name: 'Genet Tadesse',
      role: Role.ManagementTeam,
      authRole: UserRole.ENDORSING_COMMITTEE,
    },
    {
      email: 'edna@gmail.com',
      name: 'Edna Asmamaw',
      role: Role.ManagementTeam,
      authRole: UserRole.ENDORSING_COMMITTEE,
    },
    {
      email: 'alula@gmail.com',
      name: 'Alula Girma',
      role: Role.ManagementTeam,
      authRole: UserRole.ENDORSING_COMMITTEE,
    },
    {
      email: 'worku@gmail.com',
      name: 'Worku Bekele',
      role: Role.ManagementTeam,
      authRole: UserRole.ENDORSING_COMMITTEE,
    },
    {
      email: 'dawit@gmail.com',
      name: 'Dawit Haile',
      role: Role.ManagementTeam,
      authRole: UserRole.ENDORSING_COMMITTEE,
    },
  ];

  for (const acc of coreAccounts) {
    await prisma.user.upsert({
      where: { email: acc.email },
      update: {
        name: acc.name,
        displayName: acc.name,
        role: acc.role,
        authRole: acc.authRole,
        passwordHash,
        status: 'ACTIVE',
        isActive: true,
      },
      create: {
        name: acc.name,
        email: acc.email,
        displayName: acc.name,
        role: acc.role,
        authRole: acc.authRole,
        passwordHash,
        status: 'ACTIVE',
        isActive: true,
      },
    });
  }

  console.log('--- Starting Test Data Seeding ---');

  // 1. Ensure we have at least one user
  let user = await prisma.user.findFirst({
    where: { email: 'admin@moa.gov.et' },
  });

  if (!user) {
    console.log('Creating admin user...');
    user = await prisma.user.create({
      data: {
        name: 'System Administrator',
        email: 'admin@moa.gov.et',
        displayName: 'System Administrator',
        role: Role.Administrator,
        authRole: UserRole.ADMIN,
        passwordHash: await hashPassword('Password123!'),
        status: 'ACTIVE',
        isActive: true,
      },
    });
  } else {
    console.log('Resetting admin password to Password123!...');
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword('Password123!'),
      },
    });
  }
  const userId = user.id;
  console.log(`User available: ${user.email} (${userId})`);

  // 2. Ensure we have Lookup values
  console.log('Setting up Lookup values...');

  // Funding source
  const fundingSource = await prisma.lookupValue.upsert({
    where: { type_code: { type: 'FUNDING_SOURCE', code: 'FS_WB' } },
    update: {},
    create: {
      type: 'FUNDING_SOURCE',
      code: 'FS_WB',
      label: 'World Bank Loan (IDA-6780)',
    },
  });

  // Sector
  const sector = await prisma.lookupValue.upsert({
    where: { type_code: { type: 'SECTOR', code: 'SEC_AGRI' } },
    update: {},
    create: {
      type: 'SECTOR',
      code: 'SEC_AGRI',
      label: 'Horticulture & Seed Development',
    },
  });

  // Procurement method
  const method = await prisma.lookupValue.upsert({
    where: { type_code: { type: 'PROCUREMENT_METHOD', code: 'PM_RFQ' } },
    update: {},
    create: {
      type: 'PROCUREMENT_METHOD',
      code: 'PM_RFQ',
      label: 'Request for Quotations (RFQ)',
    },
  });

  // Stage types
  const stageTypeDraft = await prisma.lookupValue.upsert({
    where: { type_code: { type: 'STAGE_TYPE', code: 'ST_DRAFT' } },
    update: {},
    create: {
      type: 'STAGE_TYPE',
      code: 'ST_DRAFT',
      label: 'Drafting Specifications',
    },
  });

  const stageTypeBid = await prisma.lookupValue.upsert({
    where: { type_code: { type: 'STAGE_TYPE', code: 'ST_BID' } },
    update: {},
    create: { type: 'STAGE_TYPE', code: 'ST_BID', label: 'Bid Invitation' },
  });

  const stageTypeAward = await prisma.lookupValue.upsert({
    where: { type_code: { type: 'STAGE_TYPE', code: 'ST_AWARD' } },
    update: {},
    create: { type: 'STAGE_TYPE', code: 'ST_AWARD', label: 'Contract Award' },
  });

  const stageTypeSignature = await prisma.lookupValue.upsert({
    where: { type_code: { type: 'STAGE_TYPE', code: 'ST_SIGN' } },
    update: {},
    create: { type: 'STAGE_TYPE', code: 'ST_SIGN', label: 'Contract Signing' },
  });

  // 3. Create Project
  console.log('Creating test project...');
  const project = await prisma.project.upsert({
    where: { code: 'PRJ-2026-01' },
    update: {},
    create: {
      code: 'PRJ-2026-01',
      name: 'National Agricultural Seed Quality Control Project',
      sapIdentificationNo: 'SAP-P172839',
      fundingSourceId: fundingSource.id,
      sectorId: sector.id,
      loanGrantNumbers: ['IDA-6780E', 'IDA-6780F'],
      components: [
        'Component 1: Lab Equipment Upgrade',
        'Component 2: Capacity Building',
      ],
      status: 'ACTIVE',
    },
  });

  // Link user to project
  await prisma.userProject.upsert({
    where: { userId_projectId: { userId, projectId: project.id } },
    update: {},
    create: {
      userId,
      projectId: project.id,
    },
  });

  // 4. Create Plan
  console.log('Creating test plan...');
  const plan = await prisma.plan.create({
    data: {
      projectId: project.id,
      title: 'FY 2026 Procurement Plan for Lab Equipment',
      budgetYear: '2026',
      procurementCategory: 'GOODS',
      status: 'APPROVED',
      createdBy: userId,
      approvedById: userId,
      approvedAt: new Date(),
      periodStart: new Date('2026-07-01'),
      periodEnd: new Date('2027-06-30'),
    },
  });

  // 5. Create Activities
  console.log('Creating test activities & roadmaps...');

  // Activity A (Delayed / Late)
  const activityA = await prisma.activity.create({
    data: {
      reference: 'MOA-GOODS-2026-001',
      planId: plan.id,
      procurementMethodId: method.id,
      description: 'Supply of Laboratory Microscope Systems',
      estimatedBudget: 1500000.0,
      currency: 'ETB',
      status: 'IN_PROGRESS',
      components: {
        create: {
          component: 'Component 1: Lab Equipment Upgrade',
          allocationPct: 100.0,
        },
      },
      fundings: {
        create: {
          fundingSource: 'World Bank Loan (IDA-6780)',
          loanGrantNumber: 'IDA-6780E',
          allocationPct: 100.0,
        },
      },
    },
  });

  // Stages for Activity A (Planned vs Actual / Delay verification)
  // Stage 1: Completed on time
  await prisma.stage.create({
    data: {
      activityId: activityA.id,
      stageTypeId: stageTypeDraft.id,
      sequence: 1,
      status: 'COMPLETED',
      plannedStartDate: new Date('2026-07-05'),
      plannedEndDate: new Date('2026-07-15'),
      currentTargetStartDate: new Date('2026-07-05'),
      currentTargetEndDate: new Date('2026-07-15'),
      actualStartDate: new Date('2026-07-06'),
      actualEndDate: new Date('2026-07-12'), // 3 days early
    },
  });

  // Stage 2: Completed Late (revisions done)
  await prisma.stage.create({
    data: {
      activityId: activityA.id,
      stageTypeId: stageTypeBid.id,
      sequence: 2,
      status: 'COMPLETED',
      plannedStartDate: new Date('2026-07-20'),
      plannedEndDate: new Date('2026-08-05'),
      currentTargetStartDate: new Date('2026-07-20'),
      currentTargetEndDate: new Date('2026-08-15'), // Revised target
      actualStartDate: new Date('2026-07-22'),
      actualEndDate: new Date('2026-08-20'), // Completed late vs target
      revisions: {
        create: {
          revisionNo: 1,
          revisedStartDate: new Date('2026-07-20'),
          revisedEndDate: new Date('2026-08-15'),
          reason: 'Delay in finalizing bid spec package',
          revisedById: userId,
        },
      },
    },
  });

  // Stage 3: Open and Overdue (currently delayed)
  await prisma.stage.create({
    data: {
      activityId: activityA.id,
      stageTypeId: stageTypeAward.id,
      sequence: 3,
      status: 'IN_PROGRESS',
      plannedStartDate: new Date('2026-08-10'),
      plannedEndDate: new Date('2026-08-20'), // Baseline overdue
      currentTargetStartDate: new Date('2026-08-10'),
      currentTargetEndDate: new Date('2026-08-20'), // Overdue vs target too (today is Aug 23)
    },
  });

  // Stage 4: Not started
  await prisma.stage.create({
    data: {
      activityId: activityA.id,
      stageTypeId: stageTypeSignature.id,
      sequence: 4,
      status: 'NOT_STARTED',
      plannedStartDate: new Date('2026-09-01'),
      plannedEndDate: new Date('2026-09-10'),
      currentTargetStartDate: new Date('2026-09-01'),
      currentTargetEndDate: new Date('2026-09-10'),
    },
  });

  // 6. Create Supplier
  console.log('Creating test supplier...');
  const supplier = await prisma.supplier.upsert({
    where: { name: 'WABEKBON Consulting Group' },
    update: {},
    create: {
      name: 'WABEKBON Consulting Group',
      tinNumber: 'TIN-987654321',
      email: 'info@wabekbon.com',
      phone: '+251911223344',
      status: 'ACTIVE',
    },
  });

  // 7. Create Contract
  console.log('Creating test contract & payments (matching format)...');
  const contract = await prisma.contract.create({
    data: {
      contractNo: 'CON-MOA-2026-001',
      activityId: activityA.id,
      supplierId: supplier.id,
      totalValue: 167600.0, // Original Contract Amount
      vatRate: 15.0, // 15% VAT
      contractAmountWithVat: 192740.0, // Total with 15% VAT
      contractNetOfVat: 167600.0,
      paidAmount: 192740.0, // Total paid
      remainingValue: 0.0,
      currency: 'ETB',
      region: 'FPCU',
      sector: 'Horticulture & Seed Development',
      subcomponent: '2.1',
      status: 'ACTIVE',
      awardDate: new Date('2026-08-01'),
      signatureDate: new Date('2026-08-05'),
      startDate: new Date('2026-08-10'),
      plannedEndDate: new Date('2026-12-31'),
    },
  });

  // 8. Create Contract Amendments
  await prisma.contractAmendment.create({
    data: {
      contractId: contract.id,
      amendmentNo: 1,
      previousValue: 167600.0,
      newValue: 167600.0, // value unchanged, details updated
      reason: 'No-cost administrative amendment for scheduling adjustment',
      amendedById: userId,
    },
  });

  // 9. Create Payments (Advance, Interim 1, Interim 2, Final, Retention)
  // Advance payment
  await prisma.payment.create({
    data: {
      contractId: contract.id,
      amount: 38548.0,
      paymentDate: new Date('2026-08-11'),
      referenceNo: 'VOU-ADV-001',
      paymentType: 'ADVANCE',
      status: 'PAID',
    },
  });

  // 1st interim payment
  await prisma.payment.create({
    data: {
      contractId: contract.id,
      amount: 30838.4,
      paymentDate: new Date('2026-08-15'),
      referenceNo: 'VOU-PAY1-002',
      paymentType: 'INTERIM_1',
      status: 'PAID',
    },
  });

  // 2nd interim payment
  await prisma.payment.create({
    data: {
      contractId: contract.id,
      amount: 77096.0,
      paymentDate: new Date('2026-08-18'),
      referenceNo: 'VOU-PAY2-003',
      paymentType: 'INTERIM_2',
      status: 'PAID',
    },
  });

  // Final payment
  await prisma.payment.create({
    data: {
      contractId: contract.id,
      amount: 46257.6,
      paymentDate: new Date('2026-08-22'),
      referenceNo: 'VOU-FIN-004',
      paymentType: 'FINAL',
      status: 'PAID',
    },
  });

  // 10. Audit logs / Plan workflow transition history
  await prisma.planStatusHistory.create({
    data: {
      planId: plan.id,
      fromStatus: 'DRAFT',
      toStatus: 'APPROVED',
      changedById: userId,
      notes: 'Initial plan submission and verification approval',
    },
  });

  console.log('--- Seeding Successfully Completed! ---');
}

main()
  .catch((e) => {
    console.error('Error during test data seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
