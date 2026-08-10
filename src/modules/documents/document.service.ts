import path from 'node:path';
import { prisma } from '../../config/database.js';
import { ApiError } from '../../utils/errors.js';

export async function saveDocument(params: {
  entityType: string;
  entityId: string;
  title: string;
  type: string;
  filename: string;
  storagePath: string;
  uploadedById: string;
}) {
  return prisma.document.create({
    data: {
      entityType: params.entityType,
      entityId: params.entityId,
      title: params.title,
      type: params.type,
      filename: params.filename,
      path: params.storagePath,
      uploadedById: params.uploadedById,
    },
  });
}

export async function getDocumentById(id: string) {
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) throw ApiError.notFound('Document not found');
  return doc;
}

export async function listDocuments(entityType: string, entityId: string) {
  return prisma.document.findMany({
    where: { entityType, entityId, isActive: true },
    orderBy: { createdAt: 'desc' },
  });
}

export function resolveStoragePath(filename: string): string {
  return path.resolve('uploads', filename);
}
