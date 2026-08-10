import { prisma } from '../../config/database.js';
import { ApiError } from '../../utils/errors.js';

export async function listLookups(type?: string) {
  return prisma.lookupValue.findMany({
    where: { ...(type && { type }), isActive: true },
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
  const existing = await prisma.lookupValue.findUnique({
    where: { type_code: { type: data.type, code: data.code } },
  });
  if (existing)
    throw ApiError.conflict('Lookup code already exists for this type');
  return prisma.lookupValue.create({ data });
}

export async function updateLookup(
  id: string,
  data: { label?: string; isActive?: boolean },
) {
  const existing = await prisma.lookupValue.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Lookup value not found');
  return prisma.lookupValue.update({ where: { id }, data });
}
