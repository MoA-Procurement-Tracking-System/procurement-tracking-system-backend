import { prisma } from './src/config/database.js';
import { verifyPassword } from './src/modules/auth/auth.security.js';

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'admin@moa.gov.et' },
  });
  if (!user) {
    console.log('User not found!');
    return;
  }
  const isValid = await verifyPassword('Password123!', user.passwordHash);
  console.log("Is 'Password123!' valid for user?", isValid);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
