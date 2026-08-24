import { prisma } from '../config/database.js';
import { seedRoadmapTemplates } from './seed-roadmap-templates.js';

async function main() {
  console.log('Seeding lookup values...');

  const fundingSource = await prisma.lookupValue.upsert({
    where: { type_code: { type: 'FUNDING_SOURCE', code: 'FS_001' } },
    update: { label: 'World Bank', isActive: true },
    create: {
      type: 'FUNDING_SOURCE',
      code: 'FS_001',
      label: 'World Bank',
    },
  });

  const sector = await prisma.lookupValue.upsert({
    where: { type_code: { type: 'SECTOR', code: 'SEC_001' } },
    update: { label: 'Agriculture', isActive: true },
    create: {
      type: 'SECTOR',
      code: 'SEC_001',
      label: 'Agriculture',
    },
  });

  console.log('Created Funding Source ID:', fundingSource.id);
  console.log('Created Sector ID:', sector.id);

  await seedRoadmapTemplates();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
