import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';
import supplierRouter from './modules/suppliers/suppliers.router.js';
import dashboardRouter from './modules/dashboard/dashboard.routes.js';
import alertsRouter from './modules/alerts/alerts.routes.js';
import reportsRouter from './modules/reports/reports.routes.js';
// 1. IMPORT YOUR ROUTER
import contractsRouter from './modules/contracts/contracts.routes.js';

const app = express();

// 2. CORE MIDDLEWARES (MUST COME BEFORE ROUTES)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. SWAGGER UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 4. HEALTH CHECK ROUTE
app.get('/', (_req, res) => {
  res.json({ message: 'Procurement Tracking System API is running' });
});

// 5. MOUNT CONTRACTS ROUTER AT "/api/contracts"
app.use('/api/contracts', contractsRouter);
app.use('/api/suppliers', supplierRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/reports', reportsRouter);
// 6. CATCH-ALL 404 HANDLER (MUST BE AT THE VERY BOTTOM)
app.use((req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.url}` });
});

export default app;