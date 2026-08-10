import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import {pinoHttp} from 'pino-http';

import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';
import { httpLogger } from './config/logger.js';
import { env } from './config/env.js';
import { errorHandler } from './core/middleware/errorHandler.js';

import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/users/users.routes.js';
import lookupRoutes from './modules/lookups/lookup.routes.js';
import auditLogRoutes from './modules/audit-logs/audit-log.routes.js';
import documentRoutes from './modules/documents/document.routes.js';
import {
  adminRouter,
  authErrorHandler,
  authRouter,
  protectedRouter,
} from './modules/auth/auth.routes.js';
const app = express();

// HTTPS redirect in production
if (env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

const allowedOrigins = new Set(
  env.CORS_ORIGIN.split(',')
    .map((o) => o.trim())
    .filter(Boolean),
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }),
);

app.use(helmet());
app.use(express.json());
app.use(httpLogger);

app.use(
  rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      message: 'Too many requests, please try again later.',
      code: 'RATE_LIMITED',
    },
  }),
);
app.use(helmet());
app.use(express.json({ limit: '32kb' }));
app.use(pinoHttp({ logger }));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/', (_req, res) => {
  res.json({ message: 'Procurement Tracking System API is running' });
});
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api', protectedRouter);
app.use(authErrorHandler);

export default app;
