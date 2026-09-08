import app from './app.js';
import { createServer } from 'http';
import { prisma } from './config/database.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { registerBackupJob } from './jobs/backup.job.js';
import { registerCommitteeReminderJob } from './jobs/committee-reminder.job.js';

const server = createServer(app);

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    logger.fatal(
      { port: env.PORT },
      `Port ${env.PORT} is already in use. Please stop the process using port ${env.PORT} or change PORT in .env.`,
    );
  } else {
    logger.fatal({ err }, 'Server error');
  }
  process.exit(1);
});

server.listen(env.PORT, async () => {
  logger.info(
    { port: env.PORT },
    `Procurement Tracking System API running on http://localhost:${env.PORT} [${env.NODE_ENV}]`,
  );
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'MANAGEMENT'`,
    );
    logger.info('Ensured MANAGEMENT exists in PostgreSQL UserRole enum');
  } catch (err) {
    logger.warn({ err }, 'Note: ALTER TYPE UserRole check completed');
  }
  // Register scheduled jobs after the server is live
  registerBackupJob();
  registerCommitteeReminderJob();
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Unhandled rejection');
  process.exit(1);
});

const shutdown = async (signal: string) => {
  logger.info({ signal }, 'Shutting down');
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
