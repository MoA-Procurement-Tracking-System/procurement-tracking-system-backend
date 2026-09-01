import { prisma } from './src/config/database.js';
import { hashPassword } from './src/modules/auth/auth.security.js';

async function main() {
  const hash = await hashPassword('Password123!');
  const result = await prisma.user.updateMany({
    where: { status: 'PENDING_INVITATION' },
    data: {
      status: 'ACTIVE',
      passwordHash: hash,
    },
  });
  console.log(
    `Activated ${result.count} invited users with password 'Password123!'`,
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
