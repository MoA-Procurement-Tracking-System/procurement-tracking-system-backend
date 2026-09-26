import { prisma } from '../../config/database.js';
import { ApiError } from '../../utils/errors.js';

export async function listLookups(type?: string) {
  const cleanType = type ? type.trim().toUpperCase() : undefined;
  return prisma.lookupValue.findMany({
    where: { ...(cleanType && { type: cleanType }), isActive: true },
    orderBy: [{ type: 'asc' }, { code: 'asc' }],
  });
}

export async function getLookupById(id: string) {
  const lookup = await prisma.lookupValue.findUnique({ where: { id } });
  if (!lookup) throw ApiError.notFound('Lookup value not found');
  return lookup;
}

export async function createLookup(data: {
  type: string;
  code: string;
  label: string;
}) {
  const cleanType = data.type.trim().toUpperCase();
  const cleanCode = data.code.trim().toUpperCase();
  const cleanLabel = data.label.trim();

  const existing = await prisma.lookupValue.findUnique({
    where: { type_code: { type: cleanType, code: cleanCode } },
  });
  if (existing) {
    if (!existing.isActive) {
      return prisma.lookupValue.update({
        where: { id: existing.id },
        data: { isActive: true, label: cleanLabel || existing.label },
      });
    }
    return existing;
  }
  return prisma.lookupValue.create({
    data: {
      type: cleanType,
      code: cleanCode,
      label: cleanLabel,
    },
  });
}

export async function updateLookup(
  id: string,
  data: { label?: string; isActive?: boolean },
) {
  const existing = await prisma.lookupValue.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Lookup value not found');
  return prisma.lookupValue.update({ where: { id }, data });
}

export async function deleteLookup(id: string) {
  const existing = await prisma.lookupValue.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Lookup value not found');
  return prisma.lookupValue.update({
    where: { id },
    data: { isActive: false },
  });
}

