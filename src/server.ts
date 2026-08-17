import app from './app.js';
import { createServer } from 'http';
import { prisma } from './config/database.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';

const server = createServer(app);

function startServer(port: number) {
  server.once('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      const fallback = port + 1;
      logger.warn(`Port ${port} is busy, retrying on ${fallback}`);
      server.removeAllListeners('error');
      startServer(fallback);
      return;
    }
    logger.fatal({ err }, 'Server error');
    process.exit(1);
  });

  server.listen(port, () => {
    logger.info(
      { port },
      `Procurement Tracking System API running on port ${port} [${env.NODE_ENV}]`,
    );
  });
}

startServer(env.PORT);

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
