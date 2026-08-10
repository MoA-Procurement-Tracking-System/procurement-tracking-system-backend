import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate.js';
import { requirePasswordChange } from '../auth/middleware/requirePasswordChange.js';
import { validate } from '../../middleware/validate.js';
import {
  saveDocument,
  getDocumentById,
  listDocuments,
  resolveStoragePath,
} from './document.service.js';
import { ApiError } from '../../utils/errors.js';

const UPLOAD_DIR = path.resolve('uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      '.pdf',
      '.doc',
      '.docx',
      '.xls',
      '.xlsx',
      '.png',
      '.jpg',
      '.jpeg',
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

const router = Router();
router.use(authenticate, requirePasswordChange);

const uploadBodySchema = z.object({
  entityType: z.string().trim().min(1),
  entityId: z.string().trim().min(1),
  title: z.string().trim().min(1),
  type: z.string().trim().min(1),
});

const listQuerySchema = z.object({
  entityType: z.string().trim().min(1),
  entityId: z.string().trim().min(1),
});

/**
 * @swagger
 * /api/documents:
 *   post:
 *     summary: Upload a document
 *     tags: [Documents]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file, entityType, entityId, title, type]
 *             properties:
 *               file: { type: string, format: binary }
 *               entityType: { type: string }
 *               entityId: { type: string }
 *               title: { type: string }
 *               type: { type: string }
 *     responses:
 *       201: { description: Document uploaded }
 */
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

/**
 * @swagger
 * /api/documents:
 *   get:
 *     summary: List documents for an entity
 *     tags: [Documents]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: entityType
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: entityId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of documents }
 */
router.get('/', validate(listQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { entityType, entityId } = req.query as {
      entityType: string;
      entityId: string;
    };
    res.json({ data: await listDocuments(entityType, entityId) });
  } catch (e) {
    next(e);
  }
});

/**
 * @swagger
 * /api/documents/{id}/download:
 *   get:
 *     summary: Download a document
 *     tags: [Documents]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: File stream }
 *       404: { description: Not found }
 */
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
