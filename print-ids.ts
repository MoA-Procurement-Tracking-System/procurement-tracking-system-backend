import { prisma } from './src/config/database.js';

async function main() {
  const project = await prisma.project.findFirst({
    where: { code: 'PRJ-2026-01' },
  });
  const plan = await prisma.plan.findFirst({ where: { budgetYear: '2026' } });
  const activity = await prisma.activity.findFirst({
    where: { reference: 'MOA-GOODS-2026-001' },
  });
  const supplier = await prisma.supplier.findFirst({
    where: { name: 'WABEKBON Consulting Group' },
  });
  const contract = await prisma.contract.findFirst({
    where: { contractNo: 'CON-MOA-2026-001' },
  });

  console.log('=== SEEDED DATABASE IDENTIFIERS ===');
  console.log('Project ID (UUID):', project?.id || 'Not Found');
  console.log('Plan ID (UUID):   ', plan?.id || 'Not Found');
  console.log('Activity ID (UUID):', activity?.id || 'Not Found');
  console.log('Supplier ID (UUID):', supplier?.id || 'Not Found');
  console.log('Contract ID (UUID):', contract?.id || 'Not Found');
  console.log('====================================');
}

main().finally(() => prisma.$disconnect());
