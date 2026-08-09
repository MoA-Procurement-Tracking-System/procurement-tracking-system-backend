import app from './app.js';
import { createServer } from 'http';

const requestedPort = process.env.PORT ? Number(process.env.PORT) : 3000;
const initialPort =
  Number.isInteger(requestedPort) && requestedPort > 0 ? requestedPort : 3000;

const server = createServer(app);

function startServer(port: number) {
  server.once('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      const fallbackPort = port === 3000 ? 3001 : port + 1;
      console.warn(`Port ${port} is busy, retrying on ${fallbackPort}`);
      server.removeAllListeners('error');
      startServer(fallbackPort);
      return;
    }

    console.error('Server error:', err);
    process.exit(1);
  });

  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

startServer(initialPort);

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  process.exit(1);
});
