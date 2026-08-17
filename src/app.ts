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
import planRoutes from './modules/plans/plan.routes.js';
import activityRoutes from './modules/activities/activity.routes.js';
import lookupRoutes from './modules/lookups/lookup.routes.js';
import documentRoutes from './modules/documents/document.routes.js';
import auditLogRoutes from './modules/audit-logs/audit-log.routes.js';
import supplierRouter from './modules/suppliers/suppliers.router.js';
import dashboardRouter from './modules/dashboard/dashboard.routes.js';
import alertsRouter from './modules/alerts/alerts.routes.js';
import reportsRouter from './modules/reports/reports.routes.js';
import contractsRouter from './modules/contracts/contracts.routes.js';

const app = express();
app.disable('x-powered-by');
if (env.NODE_ENV === 'production') app.set('trust proxy', 1);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || env.NODE_ENV !== 'production') return callback(null, true);
      const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(pinoHttp({ logger }));

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check route
app.get('/', (_req, res) => {
  res.json({ message: 'Procurement Tracking System API is running' });
});

// Mount module routes
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/lookups', lookupRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/contracts', contractsRouter);
app.use('/api/suppliers', supplierRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api', protectedRouter);

// Error handlers
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
