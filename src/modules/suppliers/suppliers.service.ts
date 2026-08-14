import { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../config/database.js';
import type {
  CreateSupplierDto,
  GetSuppliersQueryDto,
} from './suppliers.schema.js';

export class SuppliersService {
  async createSupplier(data: CreateSupplierDto) {
    return await prisma.supplier.create({
      data: {
        name: data.name,
        contact: data.phone ?? data.email ?? null,
        isActive: (data.status ?? 'ACTIVE') === 'ACTIVE',
      },
    });
  }

  async getSuppliers(query: GetSuppliersQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const statusFilter = query['filter[status]'];
    const searchTerm = query.search;

    const where: Prisma.SupplierWhereInput = {};
    if (statusFilter) where.isActive = statusFilter === 'ACTIVE';
    if (searchTerm) where.name = { contains: searchTerm, mode: 'insensitive' };

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.supplier.count({ where }),
    ]);

    return {
      data: suppliers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
