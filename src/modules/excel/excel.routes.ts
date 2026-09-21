import path from 'path';
import { Router } from 'express';
import multer from 'multer';
import os from 'os';
import { excelController } from './excel.controller.js';
import { authenticate } from '../../middleware/auth.js';
import './excel.schema.js';

const router = Router();
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

// Secure all template and import routes using unified authentication
router.use(authenticate);

router.get('/templates/projects', (req, res) =>
  excelController.exportProjectsTemplate(req, res),
);

router.get('/templates/plans', (req, res) =>
  excelController.exportPlansTemplate(req, res),
);

router.get('/templates/activities', (req, res) =>
  excelController.exportActivitiesTemplate(req, res),
);

router.get('/templates/contracts', (req, res) =>
  excelController.exportContractsTemplate(req, res),
);

router.get('/templates/suppliers', (req, res) =>
  excelController.exportSuppliersTemplate(req, res),
);

router.post('/import/projects', upload.single('file'), (req, res) =>
  excelController.importProjects(req, res),
);

router.post('/import/plans', upload.single('file'), (req, res) =>
  excelController.importPlans(req, res),
);

router.post('/import/activities', upload.single('file'), (req, res) =>
  excelController.importActivities(req, res),
);

router.post('/import/contracts', upload.any(), (req, res) =>
  excelController.importContracts(req, res),
);

router.post('/import/suppliers', upload.single('file'), (req, res) =>
  excelController.importSuppliers(req, res),
);

export default router;
