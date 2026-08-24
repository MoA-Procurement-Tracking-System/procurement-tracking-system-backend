import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { env } from './env.js';

import pg from 'pg';

const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createClient = () => new PrismaClient({ adapter: adapter as any });

export const prisma = globalForPrisma.prisma ?? createClient();

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
