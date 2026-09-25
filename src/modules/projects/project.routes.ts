import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
  createProjectSchema,
  updateProjectSchema,
  assignOfficerSchema,
} from './project.schema.js';
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  assignOfficer,
  removeOfficer,
} from './project.controller.js';

const router = Router();

// Protect all project routes with authentication
router.use(authenticate);

router.get('/', getProjects);

router.get('/:id', getProjectById);

router.post(
  '/',
  authorize(
    'Administrator',
    'ADMIN',
    'DIRECTOR',
    'ProcurementDirector',
    'ProjectManager',
  ),
  validate(createProjectSchema),
  createProject,
);

router.patch(
  '/:id',
  authorize(
    'Administrator',
    'ADMIN',
    'DIRECTOR',
    'ProcurementDirector',
    'ProjectManager',
  ),
  validate(updateProjectSchema),
  updateProject,
);

router.post(
  '/:id/officers',
  authorize(
    'Administrator',
    'ADMIN',
    'DIRECTOR',
    'ProcurementDirector',
    'ProjectManager',
  ),
  validate(assignOfficerSchema),
  assignOfficer,
);

router.delete(
  '/:id/officers/:officerId',
  authorize(
    'Administrator',
    'ADMIN',
    'DIRECTOR',
    'ProcurementDirector',
    'ProjectManager',
  ),
  removeOfficer,
);

export default router;
