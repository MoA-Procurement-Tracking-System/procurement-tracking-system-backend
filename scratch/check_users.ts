import { prisma } from './config/database.js';

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      authRole: true,
      status: true,
      isActive: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log('All Users in DB:');
  console.log(JSON.stringify(users, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
