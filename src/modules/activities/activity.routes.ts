import { Router } from 'express';
import {
  getActivities,
  getActivityById,
  createActivity,
  updateActivity,
  updateStage,
  updateStageActual,
  replanStage,
} from './activity.controller.js';
import { authenticate } from '../../middleware/auth.js';
import './activity.schema.js';

const router = Router();

router.get('/', getActivities);
router.get('/:id', getActivityById);
router.post('/', authenticate, createActivity);
router.patch('/:id', authenticate, updateActivity);
router.patch('/:id/stages/:stageId', authenticate, updateStage);
router.patch('/:id/stages/:stageId/actual', authenticate, updateStageActual);
router.post('/:id/stages/:stageId/replan', authenticate, replanStage);

export default router;
