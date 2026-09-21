import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import type { z } from 'zod';
import { authenticate, requirePasswordChange } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
  saveDocument,
  getDocumentById,
  listDocuments,
  resolveStoragePath,
} from './document.service.js';
import { ApiError } from '../../utils/errors.js';
import {
  uploadBodySchema,
  listDocumentsQuerySchema,
} from './document.schema.js';

const UPLOAD_DIR = path.resolve('uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.png',
  '.jpg',
  '.jpeg',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${sanitized}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.has(ext) && ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(null, true);
    }
    cb(
      new Error(
        'Invalid file type. Only PDF, Word, Excel, and images (PNG, JPEG) are allowed.',
      ),
    );
  },
});

const router = Router();
router.use(authenticate, requirePasswordChange);

router.post(
  '/',
  upload.single('file'),
  validate(uploadBodySchema, 'body'),
  async (req, res, next) => {
    try {
      if (!req.file) return next(ApiError.badRequest('File is required'));
      if (!req.user) return next(ApiError.unauthorized());

      const { entityType, entityId, title, type } = req.body as z.infer<
        typeof uploadBodySchema
      >;
      const doc = await saveDocument({
        entityType,
        entityId,
        title,
        type,
        filename: req.file.originalname,
        storagePath: req.file.path,
        uploadedById: req.user.id,
      });
      res.status(201).json({ message: 'Document uploaded', data: doc });
    } catch (e) {
      next(e);
    }
  },
);

router.get(
  '/',
  validate(listDocumentsQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const { entityType, entityId } = req.query as {
        entityType: string;
        entityId: string;
      };
      res.json({ data: await listDocuments(entityType, entityId) });
    } catch (e) {
      next(e);
    }
  },
);

router.get('/:id/download', async (req, res, next) => {
  try {
    const doc = await getDocumentById(req.params.id);
    const filePath = resolveStoragePath(path.basename(doc.path));
    if (!fs.existsSync(filePath))
      return next(ApiError.notFound('File not found on disk'));
    res.download(filePath, doc.filename);
  } catch (e) {
    next(e);
  }
});

export default router;
