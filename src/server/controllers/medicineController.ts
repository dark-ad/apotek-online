import type { IncomingMessage, ServerResponse } from 'http';
import { prisma } from '../../lib/db';
import { sendJson, parseIntSafe } from '../utils';

export async function handleGetCategories(_req: IncomingMessage, res: ServerResponse): Promise<void> {
  const categories = await prisma.category.findMany({
    include: {
      _count: {
        select: { medicines: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  const formatted = categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    description: cat.description,
    medicineCount: cat._count.medicines,
  }));

  sendJson(res, 200, {
    success: true,
    data: { categories: formatted },
  });
}

export async function handleGetMedicines(
  _req: IncomingMessage,
  res: ServerResponse,
  searchParams: URLSearchParams
): Promise<void> {
  const search = searchParams.get('search')?.trim() || '';
  const categoryId = searchParams.get('category')?.trim() || '';
  const prescriptionParam = searchParams.get('prescription')?.trim();
  const sort = searchParams.get('sort')?.trim() || 'name_asc';

  // Safe integer parsing prevents NaN crash in Prisma skip/take
  const page = parseIntSafe(searchParams.get('page'), 1, 1);
  const limit = parseIntSafe(searchParams.get('limit'), 8, 1, 50);
  const skip = (page - 1) * limit;

  // Filter Prisma (only active medicines shown in customer catalog)
  const where: any = {
    isActive: true,
  };

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { description: { contains: search } },
    ];
  }

  if (categoryId && categoryId !== 'all') {
    where.categoryId = categoryId;
  }

  if (prescriptionParam === 'true') {
    where.requiresPrescription = true;
  } else if (prescriptionParam === 'false') {
    where.requiresPrescription = false;
  }

  // Order By
  let orderBy: any = { name: 'asc' };
  if (sort === 'name_desc') orderBy = { name: 'desc' };
  else if (sort === 'price_asc') orderBy = { price: 'asc' };
  else if (sort === 'price_desc') orderBy = { price: 'desc' };
  else if (sort === 'stock_desc') orderBy = { stock: 'desc' };
  else if (sort === 'stock_asc') orderBy = { stock: 'asc' };

  const [total, medicines] = await Promise.all([
    prisma.medicine.count({ where }),
    prisma.medicine.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
      orderBy,
      skip,
      take: limit,
    }),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  sendJson(res, 200, {
    success: true,
    data: {
      medicines,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    },
  });
}

export async function handleGetMedicineById(
  _req: IncomingMessage,
  res: ServerResponse,
  id: string
): Promise<void> {
  const medicineId = (id || '').trim();
  if (!medicineId) {
    sendJson(res, 400, {
      success: false,
      message: 'ID obat tidak valid.',
    });
    return;
  }

  const medicine = await prisma.medicine.findUnique({
    where: { id: medicineId },
    include: {
      category: true,
    },
  });

  if (!medicine || !medicine.isActive) {
    sendJson(res, 404, {
      success: false,
      message: 'Obat tidak ditemukan atau sudah dinonaktifkan.',
    });
    return;
  }

  sendJson(res, 200, {
    success: true,
    data: { medicine },
  });
}
