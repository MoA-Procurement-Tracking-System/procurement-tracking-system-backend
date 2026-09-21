import path from 'path';
import multer from 'multer';
import os from 'os';
import { Router } from 'express';
import { contractsController } from './contracts.controller.js';
import { excelController } from '../excel/excel.controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import './contracts.schema.js';

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') {
      return cb(null, true);
    }
    cb(new Error('Only Excel (.xlsx, .xls) and CSV (.csv) files are allowed'));
  },
});

const router = Router();

// Protect all contract routes with authentication
router.use(authenticate);

router.get('/', (req, res) => contractsController.getContracts(req, res));
router.post(
  '/',
  authorize(
    'Administrator',
    'ProcurementOfficer',
    'ProcurementDirector',
    'OFFICER',
    'DIRECTOR',
    'ADMIN',
  ),
  (req, res) => contractsController.createContract(req, res),
);

router.get('/template', (req, res) =>
  excelController.exportContractsTemplate(req, res),
);

router.get('/:id', (req, res) => contractsController.getContractById(req, res));
router.patch(
  '/:id',
  authorize(
    'Administrator',
    'ProcurementOfficer',
    'ProcurementDirector',
    'OFFICER',
    'DIRECTOR',
    'ADMIN',
  ),
  (req, res) => contractsController.updateContract(req, res),
);

router.get('/:id/amendments', (req, res) =>
  contractsController.getContractAmendments(req, res),
);
router.post(
  '/:id/amendments',
  authorize(
    'Administrator',
    'ProcurementOfficer',
    'ProcurementDirector',
    'OFFICER',
    'DIRECTOR',
    'ADMIN',
  ),
  (req, res) => contractsController.recordAmendment(req, res),
);

router.get('/:id/payments', (req, res) =>
  contractsController.getContractPayments(req, res),
);
router.post(
  '/:id/payments',
  authorize(
    'Administrator',
    'ProcurementOfficer',
    'ProcurementDirector',
    'OFFICER',
    'DIRECTOR',
    'ADMIN',
  ),
  (req, res) => contractsController.recordPayment(req, res),
);

router.post(
  '/import',
  authorize(
    'Administrator',
    'ProcurementOfficer',
    'ProcurementDirector',
    'OFFICER',
    'DIRECTOR',
    'ADMIN',
  ),
  upload.any(),
  (req, res) => excelController.importContracts(req, res),
);

export default router;
