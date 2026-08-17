import { Router } from 'express';
// import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
// import { requirePasswordChange } from '../auth/middleware/requirePasswordChange.js';
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  assignOfficer,
  removeOfficer,
} from './project.controller.js';

const router = Router();

// Protect all project routes
// router.use(authenticate, requirePasswordChange);

/**
 * @swagger
 * /api/projects:
 *   get:
 *     summary: List active projects
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of projects }
 *       500: { description: Server error }
 */
router.get('/', getProjects);

/**
 * @swagger
 * /api/projects/{id}:
 *   get:
 *     summary: Get a project by ID
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Project found }
 *       404: { description: Project not found }
 */
router.get('/:id', getProjectById);

/**
 * @swagger
 * /api/projects:
 *   post:
 *     summary: Create a new project
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, name, fundingSourceId, sectorId]
 *             properties:
 *               code: { type: string }
 *               name: { type: string }
 *               fundingSourceId: { type: string }
 *               sectorId: { type: string }
 *               sapIdentificationNo: { type: string }
 *               country: { type: string }
 *               executingAgency: { type: string }
 *               organization: { type: string }
 *               fundingType: { type: string }
 *               loanGrantNumbers: { type: array, items: { type: string } }
 *               components: { type: array, items: { type: string } }
 *               subcomponents: { type: array, items: { type: string } }
 *               baseCurrency: { type: string }
 *               projectStartDate: { type: string, format: date-time }
 *               projectEndDate: { type: string, format: date-time }
 *     responses:
 *       201: { description: Project created }
 */
router.post(
  '/',
  // authorize('Administrator', 'ProjectManager'),
  createProject,
);

/**
 * @swagger
 * /api/projects/{id}:
 *   patch:
 *     summary: Update an existing project
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               status: { type: string, enum: [ACTIVE, CLOSED, SUSPENDED] }
 *               sapIdentificationNo: { type: string }
 *               country: { type: string }
 *               executingAgency: { type: string }
 *               organization: { type: string }
 *               fundingType: { type: string }
 *               loanGrantNumbers: { type: array, items: { type: string } }
 *               components: { type: array, items: { type: string } }
 *               subcomponents: { type: array, items: { type: string } }
 *               baseCurrency: { type: string }
 *               projectStartDate: { type: string, format: date-time }
 *               projectEndDate: { type: string, format: date-time }
 *     responses:
 *       200: { description: Project updated }
 */
router.patch(
  '/:id',
  // authorize('Administrator', 'ProjectManager'),
  updateProject,
);

/**
 * @swagger
 * /api/projects/{id}/officers:
 *   post:
 *     summary: Assign a procurement officer to a project
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [officerId]
 *             properties:
 *               officerId: { type: string }
 *     responses:
 *       201: { description: Officer assigned }
 *       409: { description: Officer already assigned }
 */
router.post(
  '/:id/officers',
  // authorize('Administrator', 'ProjectManager'),
  assignOfficer,
);

/**
 * @swagger
 * /api/projects/{id}/officers/{officerId}:
 *   delete:
 *     summary: Remove a procurement officer from a project
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: officerId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Officer removed }
 */
router.delete(
  '/:id/officers/:officerId',
  authorize('Administrator', 'ProjectManager'),
  removeOfficer,
);

export default router;
