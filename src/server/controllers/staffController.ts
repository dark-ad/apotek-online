import type { IncomingMessage, ServerResponse } from 'http';
import { prisma } from '../../lib/db';
import { sendJson, parseJsonBody, requireAuth, parseIntSafe } from '../utils';

// Valid status list according to PRD
export const VALID_ORDER_STATUSES = [
  'PENDING_VERIFICATION',
  'PENDING_PAYMENT',
  'PROCESSING',
  'READY_FOR_PICKUP',
  'SHIPPED',
  'COMPLETED',
  'CANCELLED',
] as const;

export type OrderStatusType = (typeof VALID_ORDER_STATUSES)[number];

/**
 * GET /api/staff/orders — List all orders for staff portal
 */
export async function handleGetStaffOrders(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const authUser = requireAuth(req, res, ['STAFF', 'ADMIN']);
  if (!authUser) return;

  const orders = await prisma.order.findMany({
    include: {
      customer: {
        select: { id: true, name: true, email: true, phone: true, address: true },
      },
      items: {
        include: {
          medicine: {
            select: { id: true, name: true, unit: true, image: true, stock: true, requiresPrescription: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const formatted = orders.map((order) => ({
    id: order.id,
    shortId: order.id.slice(-8).toUpperCase(),
    customerId: order.customerId,
    customer: order.customer,
    totalAmount: order.totalAmount,
    status: order.status,
    paymentStatus: order.paymentStatus,
    requiresPrescription: order.requiresPrescription,
    prescriptionUrl: order.prescriptionUrl,
    shippingAddress: order.shippingAddress,
    notes: order.notes,
    rejectionReason: order.rejectionReason,
    itemCount: order.items.length,
    items: order.items.map((item) => ({
      id: item.id,
      medicineId: item.medicineId,
      medicineName: item.medicine.name,
      medicineUnit: item.medicine.unit,
      medicineImage: item.medicine.image,
      medicineStock: item.medicine.stock,
      requiresPrescription: item.medicine.requiresPrescription,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.subtotal,
    })),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  }));

  sendJson(res, 200, {
    success: true,
    data: { orders: formatted, total: formatted.length },
  });
}

/**
 * GET /api/staff/orders/:id — Get order detail for staff
 */
export async function handleGetStaffOrderDetail(
  req: IncomingMessage,
  res: ServerResponse,
  orderId: string
): Promise<void> {
  const authUser = requireAuth(req, res, ['STAFF', 'ADMIN']);
  if (!authUser) return;

  const id = (orderId || '').trim();
  if (!id) {
    sendJson(res, 400, {
      success: false,
      message: 'ID pesanan tidak valid.',
    });
    return;
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: {
        select: { id: true, name: true, email: true, phone: true, address: true },
      },
      items: {
        include: {
          medicine: {
            select: {
              id: true,
              name: true,
              unit: true,
              image: true,
              stock: true,
              requiresPrescription: true,
              category: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!order) {
    sendJson(res, 404, {
      success: false,
      message: 'Pesanan tidak ditemukan.',
    });
    return;
  }

  sendJson(res, 200, {
    success: true,
    data: {
      order: {
        id: order.id,
        shortId: order.id.slice(-8).toUpperCase(),
        customerId: order.customerId,
        customer: order.customer,
        totalAmount: order.totalAmount,
        status: order.status,
        paymentStatus: order.paymentStatus,
        requiresPrescription: order.requiresPrescription,
        prescriptionUrl: order.prescriptionUrl,
        shippingAddress: order.shippingAddress,
        notes: order.notes,
        rejectionReason: order.rejectionReason,
        itemCount: order.items.length,
        items: order.items.map((item) => ({
          id: item.id,
          medicineId: item.medicineId,
          medicineName: item.medicine.name,
          medicineUnit: item.medicine.unit,
          medicineImage: item.medicine.image,
          medicineCategory: item.medicine.category?.name || '-',
          medicineStock: item.medicine.stock,
          requiresPrescription: item.medicine.requiresPrescription,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.subtotal,
        })),
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
    },
  });
}

/**
 * POST /api/staff/orders/:id/verify-prescription — Approve or Reject prescription
 *
 * Business Rules:
 * 1. Resep yang ditolak harus memiliki alasan penolakan (reason mandatory).
 * 2. Jika ditolak -> status pesanan menjadi CANCELLED & rejectionReason tersimpan.
 * 3. Jika disetujui -> jika PAID -> status PROCESSING, jika UNPAID -> status PENDING_PAYMENT.
 */
export async function handleVerifyPrescription(
  req: IncomingMessage,
  res: ServerResponse,
  orderId: string
): Promise<void> {
  const authUser = requireAuth(req, res, ['STAFF', 'ADMIN']);
  if (!authUser) return;

  const id = (orderId || '').trim();
  const body = await parseJsonBody(req);
  const action = (body.action || '').toUpperCase(); // 'APPROVE' | 'REJECT'
  const reason = (body.reason || '').trim();

  if (action !== 'APPROVE' && action !== 'REJECT') {
    sendJson(res, 400, {
      success: false,
      message: 'Aksi verifikasi tidak valid. Gunakan APPROVE atau REJECT.',
    });
    return;
  }

  const order = await prisma.order.findUnique({
    where: { id },
  });

  if (!order) {
    sendJson(res, 404, {
      success: false,
      message: 'Pesanan tidak ditemukan.',
    });
    return;
  }

  if (!order.requiresPrescription) {
    sendJson(res, 400, {
      success: false,
      message: 'Pesanan ini tidak memerlukan resep dokter.',
    });
    return;
  }

  // Business Rule: Resep yang ditolak harus memiliki alasan penolakan
  if (action === 'REJECT') {
    if (!reason) {
      sendJson(res, 400, {
        success: false,
        message: 'Resep yang ditolak harus memiliki alasan penolakan. Harap cantumkan alasan yang jelas.',
        errors: { reason: 'Alasan penolakan resep wajib diisi.' },
      });
      return;
    }

    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        rejectionReason: reason,
      },
    });

    sendJson(res, 200, {
      success: true,
      message: `Resep untuk pesanan #${updated.id.slice(-8).toUpperCase()} berhasil ditolak. Pesanan dibatalkan.`,
      data: {
        orderId: updated.id,
        status: updated.status,
        rejectionReason: updated.rejectionReason,
      },
    });
    return;
  }

  // Action: APPROVE
  const nextStatus = order.paymentStatus === 'PAID' ? 'PROCESSING' : 'PENDING_PAYMENT';

  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: nextStatus,
      rejectionReason: null,
    },
  });

  sendJson(res, 200, {
    success: true,
    message: `Resep untuk pesanan #${updated.id.slice(-8).toUpperCase()} telah disetujui (Approved). Status pesanan diperbarui menjadi ${nextStatus}.`,
    data: {
      orderId: updated.id,
      status: updated.status,
      rejectionReason: updated.rejectionReason,
    },
  });
}

/**
 * PUT /api/staff/orders/:id/status — Update order status with validation
 *
 * Business Rules:
 * 1. Status harus valid dalam 7 status order PRD.
 * 2. Order yang membutuhkan resep tidak boleh masuk PROCESSING sebelum resep diverifikasi.
 * 3. Semua perubahan status harus divalidasi.
 */
export async function handleUpdateOrderStatus(
  req: IncomingMessage,
  res: ServerResponse,
  orderId: string
): Promise<void> {
  const authUser = requireAuth(req, res, ['STAFF', 'ADMIN']);
  if (!authUser) return;

  const id = (orderId || '').trim();
  const body = await parseJsonBody(req);
  const newStatus = (body.status || '').trim();
  const reason = (body.reason || '').trim();

  // Validate status against 7 allowed statuses
  if (!VALID_ORDER_STATUSES.includes(newStatus as OrderStatusType)) {
    sendJson(res, 400, {
      success: false,
      message: `Status pesanan "${newStatus}" tidak valid. Pilihan yang tersedia: ${VALID_ORDER_STATUSES.join(', ')}.`,
      errors: { status: 'Status tidak sesuai standar alur pesanan.' },
    });
    return;
  }

  const order = await prisma.order.findUnique({
    where: { id },
  });

  if (!order) {
    sendJson(res, 404, {
      success: false,
      message: 'Pesanan tidak ditemukan.',
    });
    return;
  }

  // Business Rule: Order yang membutuhkan resep tidak boleh masuk PROCESSING sebelum resep diverifikasi
  if (
    order.requiresPrescription &&
    order.status === 'PENDING_VERIFICATION' &&
    newStatus === 'PROCESSING'
  ) {
    sendJson(res, 400, {
      success: false,
      message: 'Order yang membutuhkan resep tidak boleh masuk status PROCESSING sebelum resep diverifikasi dan disetujui oleh staf apoteker.',
      errors: { status: 'Wajib verifikasi dan setujui resep terlebih dahulu.' },
    });
    return;
  }

  // Update order
  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: newStatus,
      ...(newStatus === 'CANCELLED' && reason ? { rejectionReason: reason } : {}),
    },
  });

  sendJson(res, 200, {
    success: true,
    message: `Status pesanan #${updated.id.slice(-8).toUpperCase()} berhasil diperbarui menjadi ${newStatus}.`,
    data: {
      orderId: updated.id,
      status: updated.status,
      rejectionReason: updated.rejectionReason,
    },
  });
}

/**
 * GET /api/staff/medicines — Get medicines list for staff inventory management
 */
export async function handleGetStaffMedicines(
  req: IncomingMessage,
  res: ServerResponse,
  searchParams: URLSearchParams
): Promise<void> {
  const authUser = requireAuth(req, res, ['STAFF', 'ADMIN']);
  if (!authUser) return;

  const search = searchParams.get('search')?.trim() || '';
  const categoryId = searchParams.get('category')?.trim() || '';

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { description: { contains: search } },
    ];
  }
  if (categoryId && categoryId !== 'all') {
    where.categoryId = categoryId;
  }

  const medicines = await prisma.medicine.findMany({
    where,
    include: {
      category: { select: { id: true, name: true } },
    },
    orderBy: { name: 'asc' },
  });

  sendJson(res, 200, {
    success: true,
    data: {
      medicines: medicines.map((m) => ({
        id: m.id,
        name: m.name,
        category: m.category?.name || 'Umum',
        categoryId: m.categoryId,
        price: m.price,
        stock: m.stock,
        unit: m.unit,
        requiresPrescription: m.requiresPrescription,
        image: m.image,
        isLowStock: m.stock > 0 && m.stock < 10,
        isOutOfStock: m.stock <= 0,
      })),
      total: medicines.length,
    },
  });
}

/**
 * PUT /api/staff/medicines/:id/stock — Update medicine stock (increase, decrease, set)
 *
 * Business Rules:
 * 1. Stok tidak boleh bernilai negatif (< 0).
 * 2. Harus divalidasi dan dicatat perubahannya.
 */
export async function handleUpdateMedicineStock(
  req: IncomingMessage,
  res: ServerResponse,
  medicineId: string
): Promise<void> {
  const authUser = requireAuth(req, res, ['STAFF', 'ADMIN']);
  if (!authUser) return;

  const id = (medicineId || '').trim();
  const body = await parseJsonBody(req);
  const action = (body.action || 'SET').toUpperCase(); // 'ADD' | 'SUBTRACT' | 'SET'
  const amount = parseIntSafe(body.amount, 0);

  const medicine = await prisma.medicine.findUnique({
    where: { id },
  });

  if (!medicine) {
    sendJson(res, 404, {
      success: false,
      message: 'Obat tidak ditemukan dalam database.',
    });
    return;
  }

  let finalStock = medicine.stock;
  if (action === 'ADD') {
    finalStock = medicine.stock + amount;
  } else if (action === 'SUBTRACT') {
    finalStock = medicine.stock - amount;
  } else if (action === 'SET') {
    finalStock = amount;
  } else {
    sendJson(res, 400, {
      success: false,
      message: 'Aksi stok tidak valid. Gunakan ADD, SUBTRACT, atau SET.',
    });
    return;
  }

  // Business Rule: Stok tidak boleh bernilai negatif (< 0)
  if (finalStock < 0) {
    sendJson(res, 400, {
      success: false,
      message: `Pengurangan stok menghasilkan nilai negatif (${finalStock}). Stok tidak boleh kurang dari 0 unit.`,
      errors: { stock: 'Stok tidak boleh bernilai negatif.' },
    });
    return;
  }

  const updated = await prisma.medicine.update({
    where: { id },
    data: { stock: finalStock },
    include: {
      category: { select: { name: true } },
    },
  });

  sendJson(res, 200, {
    success: true,
    message: `Stok obat "${updated.name}" berhasil diperbarui dari ${medicine.stock} menjadi ${finalStock} ${updated.unit}.`,
    data: {
      medicine: {
        id: updated.id,
        name: updated.name,
        category: updated.category?.name || 'Umum',
        stock: updated.stock,
        unit: updated.unit,
        price: updated.price,
      },
    },
  });
}
