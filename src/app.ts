import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { swaggerSpec } from './config/swagger.js';

import alertsRouter from './modules/alerts/alerts.routes.js';
import {
  adminRouter,
  authErrorHandler,
  authRouter,
  protectedRouter,
} from './modules/auth/auth.routes.js';
import contractsRouter from './modules/contracts/contracts.routes.js';
import dashboardRouter from './modules/dashboard/dashboard.routes.js';
import reportsRouter from './modules/reports/reports.routes.js';
import supplierRouter from './modules/suppliers/suppliers.router.js';
import userRoutes from './modules/users/users.routes.js';

const app = express();

app.disable('x-powered-by');
if (env.NODE_ENV === 'production') app.set('trust proxy', 1);

// Middleware
app.use(
  cors({
    origin: env.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
);
app.use(helmet());
app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(pinoHttp({ logger }));

// Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/', (_req, res) => {
  res.json({
    message: 'Procurement Tracking System API is running',
  });
});

// Auth & Core Routes
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/users', userRoutes);
app.use('/api', protectedRouter);

// Feature Module Routes
app.use('/api/contracts', contractsRouter);
app.use('/api/suppliers', supplierRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/reports', reportsRouter);

// Error Handling & 404
app.use(authErrorHandler);
app.use((req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.url}` });
});

export default app;
