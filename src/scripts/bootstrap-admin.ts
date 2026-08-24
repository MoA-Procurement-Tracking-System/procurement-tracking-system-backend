import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { Role, UserRole } from '../generated/prisma/client.js';
import {
  generateTemporaryPassword,
  hashPassword,
  validatePassword,
} from '../modules/auth/auth.security.js';

async function bootstrapAdministrator() {
  const existingAdministrators = await prisma.user.count({
    where: { authRole: UserRole.ADMIN },
  });
  if (existingAdministrators > 0) {
    throw new Error(
      'Bootstrap stopped: an Administrator account already exists.',
    );
  }

  const password = env.BOOTSTRAP_ADMIN_PASSWORD || generateTemporaryPassword();
  const policyErrors = validatePassword(password, [
    env.BOOTSTRAP_ADMIN_EMAIL.split('@')[0] ?? '',
  ]);
  if (policyErrors.length > 0) {
    throw new Error(
      `BOOTSTRAP_ADMIN_PASSWORD is not strong enough: ${policyErrors.join(' ')}`,
    );
  }

  const user = await prisma.user.create({
    data: {
      name: env.BOOTSTRAP_ADMIN_NAME,
      email: env.BOOTSTRAP_ADMIN_EMAIL.toLowerCase(),
      displayName: env.BOOTSTRAP_ADMIN_NAME,
      role: Role.Administrator,
      authRole: UserRole.ADMIN,
      passwordHash: await hashPassword(password),
      mustChangePassword: false,
      tempPasswordExpiresAt: new Date(
        Date.now() + env.TEMP_PASSWORD_HOURS * 3_600_000,
      ),
    },
  });

  process.stdout.write(
    [
      'Bootstrap Administrator created.',
      `Email: ${user.email}`,
      `One-time password: ${password}`,
      'Store it securely now. It cannot be retrieved later and must be changed at first sign-in.',
    ].join('\n') + '\n',
  );
}

bootstrapAdministrator()
  .catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
