import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
  createPlanSchema,
  updatePlanSchema,
  rejectPlanSchema,
  committeeVoteSchema,
  managementDecisionSchema,
} from './plan.schema.js';
import {
  getPlans,
  getPlanById,
  createPlan,
  updatePlan,
  requestPlanUpdate,
  approvePlanUpdate,
  submitPlan,
  sendToCommittee,
  rejectPlan,
  returnToOfficer,
  submitCommitteeVote,
  submitManagementDecision,
} from './plan.controller.js';

const router = Router();

// Protect all plan routes with authentication
router.use(authenticate);

router.get('/', getPlans);

router.get('/:id', getPlanById);

router.post(
  '/',
  authorize(
    'Administrator',
    'ProjectManager',
    'ProcurementOfficer',
    'ProcurementDirector',
    'DIRECTOR',
    'OFFICER',
    'ADMIN',
  ),
  validate(createPlanSchema),
  createPlan,
);

router.patch(
  '/:id',
  authorize(
    'Administrator',
    'ProjectManager',
    'ProcurementOfficer',
    'ProcurementDirector',
    'DIRECTOR',
    'ADMIN',
  ),
  validate(updatePlanSchema),
  updatePlan,
);

router.post(
  '/:id/request-update',
  authorize('ProcurementOfficer', 'OFFICER', 'Administrator', 'ADMIN'),
  requestPlanUpdate,
);

router.post(
  '/:id/approve-update',
  authorize('ProcurementDirector', 'DIRECTOR', 'Administrator', 'ADMIN'),
  approvePlanUpdate,
);

router.post(
  '/:id/submit',
  authorize(
    'ProcurementOfficer',
    'OFFICER',
    'ProcurementDirector',
    'DIRECTOR',
    'Administrator',
    'ADMIN',
  ),
  submitPlan,
);

router.post(
  '/:id/send-to-committee',
  authorize('ProcurementDirector', 'DIRECTOR', 'Administrator', 'ADMIN'),
  sendToCommittee,
);

router.post(
  '/:id/reject',
  authorize('ProcurementDirector', 'DIRECTOR', 'Administrator', 'ADMIN'),
  validate(rejectPlanSchema),
  rejectPlan,
);

router.post(
  '/:id/return-to-officer',
  authorize('ProcurementDirector', 'DIRECTOR', 'Administrator', 'ADMIN'),
  returnToOfficer,
);

router.post(
  '/:id/vote',
  authorize(
    'ENDORSING_COMMITTEE',
    'ManagementTeam',
    'MANAGEMENT',
    'Administrator',
    'ADMIN',
  ),
  validate(committeeVoteSchema),
  submitCommitteeVote,
);

router.post(
  '/:id/management-decision',
  authorize('ManagementTeam', 'MANAGEMENT', 'Administrator', 'ADMIN'),
  validate(managementDecisionSchema),
  submitManagementDecision,
);

export default router;
