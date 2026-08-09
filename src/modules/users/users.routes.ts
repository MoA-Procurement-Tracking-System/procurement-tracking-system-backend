import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { requirePasswordChange } from '../auth/middleware/requirePasswordChange.js';
import { validate } from '../../middleware/validate.js';
import {
  listUsersHandler,
  getUserHandler,
  createUserHandler,
  updateUserHandler,
} from './user.controller.js';
import {
  createUserSchema,
  updateUserSchema,
  listUsersQuerySchema,
  userIdParamSchema,
} from './user.validation.js';

const router = Router();

// Every route below requires a valid access token AND a changed password
router.use(authenticate, requirePasswordChange);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: List users
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: role
 *         schema: { type: string }
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 *     responses:
 *       200: { description: List of users }
 *       403: { description: Admin only }
 */
router.get(
  '/',
  authorize('Administrator'),
  validate(listUsersQuerySchema, 'query'),
  listUsersHandler,
);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get a user by id
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: User found }
 *       404: { description: User not found }
 */
router.get(
  '/:id',
  authorize('Administrator'),
  validate(userIdParamSchema, 'params'),
  getUserHandler,
);

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create a user
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, role]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *               role:
 *                 type: string
 *                 enum: [ProcurementOfficer, ProcurementDirector, Administrator, ManagementTeam, ProjectManager]
 *     responses:
 *       201: { description: User created }
 *       409: { description: Email already in use }
 */
router.post(
  '/',
  authorize('Administrator'),
  validate(createUserSchema, 'body'),
  createUserHandler,
);

/**
 * @swagger
 * /api/users/{id}:
 *   patch:
 *     summary: Update a user's profile, role, or active status
 *     tags: [Users]
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
 *               email: { type: string }
 *               role:
 *                 type: string
 *                 enum: [ProcurementOfficer, ProcurementDirector, Administrator, ManagementTeam, ProjectManager]
 *               isActive: { type: boolean }
 *     responses:
 *       200: { description: User updated }
 *       404: { description: User not found }
 *       409: { description: Email already in use }
 */
router.patch(
  '/:id',
  authorize('Administrator'),
  validate(userIdParamSchema, 'params'),
  validate(updateUserSchema, 'body'),
  updateUserHandler,
);

export default router;
