import { prisma } from '../config/database.js';

async function main() {
  console.log('Seeding lookup values...');

  const fundingSource = await prisma.lookupValue.create({
    data: {
      type: 'FUNDING_SOURCE',
      code: 'FS_001',
      label: 'World Bank',
    },
  });

  const sector = await prisma.lookupValue.create({
    data: {
      type: 'SECTOR',
      code: 'SEC_001',
      label: 'Agriculture',
    },
  });

  console.log('Created Funding Source ID:', fundingSource.id);
  console.log('Created Sector ID:', sector.id);
  console.log('Copy these IDs into your Swagger UI test!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
