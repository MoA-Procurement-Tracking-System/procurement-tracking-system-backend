import app from './app.js';
import { createServer } from 'http';
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
    logger.error({ err }, 'Server error');
    process.exit(1);
  });

  server.listen(port, () => {
    logger.info(`Server running on port ${port} [${env.NODE_ENV}]`);
  });
}

startServer(env.PORT);

process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection');
  process.exit(1);
});
