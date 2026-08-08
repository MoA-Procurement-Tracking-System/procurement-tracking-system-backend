import app from './app.js';
import { createServer } from 'http';
import { prisma } from './config/database.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';

const server = createServer(app);

server.on('error', (err) => {
  logger.fatal({ err }, 'Server error');
  process.exit(1);
});

server.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'Procurement Tracking System API is running');
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
