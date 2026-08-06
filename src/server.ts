import app from './app.js';
import { createServer } from 'http';

const port = process.env.PORT ? Number(process.env.PORT) : 3000;

const server = createServer(app);

server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  process.exit(1);
});
