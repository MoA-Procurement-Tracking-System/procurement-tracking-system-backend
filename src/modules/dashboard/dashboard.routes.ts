import { Router } from 'express';
import { dashboardController } from './dashboard.controller.js';
import './dashboard.schema.js';

const router = Router();

router.get('/summary', (req, res) => dashboardController.getSummary(req, res));
router.get('/by-sector', (req, res) =>
  dashboardController.getBySector(req, res),
);

export default router;
