import { Router } from 'express';
import multer from 'multer';
import os from 'os';
import { excelController } from './excel.controller.js';
import { loadSession, requireAuthenticated } from '../auth/auth.routes.js';

const router = Router();
const upload = multer({ dest: os.tmpdir() });

// Secure all template and import routes using cookie session middlewares
router.use(loadSession, requireAuthenticated);

/**
 * @openapi
 * /api/excel/templates/projects:
 *   get:
 *     summary: Export empty projects spreadsheet template with validations
 *     tags: [Excel Templates]
 *     responses:
 *       200:
 *         description: Excel template download
 */
router.get('/templates/projects', (req, res) =>
  excelController.exportProjectsTemplate(req, res),
);

/**
 * @openapi
 * /api/excel/templates/plans:
 *   get:
 *     summary: Export empty plans spreadsheet template with validations
 *     tags: [Excel Templates]
 *     responses:
 *       200:
 *         description: Excel template download
 */
router.get('/templates/plans', (req, res) =>
  excelController.exportPlansTemplate(req, res),
);

/**
 * @openapi
 * /api/excel/templates/activities:
 *   get:
 *     summary: Export empty activities spreadsheet template with validations
 *     tags: [Excel Templates]
 *     responses:
 *       200:
 *         description: Excel template download
 */
router.get('/templates/activities', (req, res) =>
  excelController.exportActivitiesTemplate(req, res),
);

/**
 * @openapi
 * /api/excel/templates/contracts:
 *   get:
 *     summary: Export empty contracts spreadsheet template with validations
 *     tags: [Excel Templates]
 *     responses:
 *       200:
 *         description: Excel template download
 */
router.get('/templates/contracts', (req, res) =>
  excelController.exportContractsTemplate(req, res),
);

/**
 * @openapi
 * /api/excel/templates/suppliers:
 *   get:
 *     summary: Export empty suppliers spreadsheet template with validations
 *     tags: [Excel Templates]
 *     responses:
 *       200:
 *         description: Excel template download
 */
router.get('/templates/suppliers', (req, res) =>
  excelController.exportSuppliersTemplate(req, res),
);

/**
 * @openapi
 * /api/excel/import/projects:
 *   post:
 *     summary: Import projects spreadsheet and update/insert records
 *     tags: [Excel Templates]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Success response with import counts
 *       400:
 *         description: Import parsing or validation error
 */
router.post('/import/projects', upload.single('file'), (req, res) =>
  excelController.importProjects(req, res),
);

/**
 * @openapi
 * /api/excel/import/plans:
 *   post:
 *     summary: Import plans spreadsheet and update/insert records
 *     tags: [Excel Templates]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Success response with import counts
 *       400:
 *         description: Import parsing or validation error
 */
router.post('/import/plans', upload.single('file'), (req, res) =>
  excelController.importPlans(req, res),
);

/**
 * @openapi
 * /api/excel/import/activities:
 *   post:
 *     summary: Import activities spreadsheet and update/insert records
 *     tags: [Excel Templates]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Success response with import counts
 *       400:
 *         description: Import parsing or validation error
 */
router.post('/import/activities', upload.single('file'), (req, res) =>
  excelController.importActivities(req, res),
);

/**
 * @openapi
 * /api/excel/import/contracts:
 *   post:
 *     summary: Import contracts spreadsheet and update/insert records
 *     tags: [Excel Templates]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Success response with import counts
 *       400:
 *         description: Import parsing or validation error
 */
router.post('/import/contracts', upload.single('file'), (req, res) =>
  excelController.importContracts(req, res),
);

/**
 * @openapi
 * /api/excel/import/suppliers:
 *   post:
 *     summary: Import suppliers spreadsheet and update/insert records
 *     tags: [Excel Templates]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Success response with import counts
 *       400:
 *         description: Import parsing or validation error
 */
router.post('/import/suppliers', upload.single('file'), (req, res) =>
  excelController.importSuppliers(req, res),
);

export default router;
