import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { swaggerSpec } from './config/swagger.js';
import {
  adminRouter,
  authErrorHandler,
  authRouter,
  protectedRouter,
} from './modules/auth/auth.routes.js';
import userRoutes from './modules/users/users.routes.js';
import projectRoutes from './modules/projects/project.routes.js';
import { ApiError } from './utils/errors.js';

const app = express();
app.disable('x-powered-by');
if (env.NODE_ENV === 'production') app.set('trust proxy', 1);

app.use(
  cors({
    origin: env.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
  }),
);
app.use(helmet());
app.use(express.json({ limit: '32kb' }));
app.use(pinoHttp({ logger }));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/', (_req, res) => {
  res.json({
    message: 'Procurement Tracking System API is running',
  });
});
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api', protectedRouter);
app.use(authErrorHandler);

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ApiError) {
    res.status(err.status).json({
      status: err.code,
      message: err.message,
      errors: err.fields,
    });
    return;
  }

  logger.error(err);
  res.status(500).json({
    status: 500,
    message: 'Internal Server Error',
  });
});

export default app;
