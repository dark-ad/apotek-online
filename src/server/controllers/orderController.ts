import type { IncomingMessage, ServerResponse } from 'http';
import { prisma } from '../../lib/db';
import { sendJson, parseJsonBody, requireAuth } from '../utils';

/**
 * POST /api/orders/checkout — Create order from customer's cart
 *
 * Business Rules enforced:
 * 1. If order contains prescription medicine -> prescriptionUrl required
 * 2. If prescriptionUrl missing for prescription order -> reject 400
 * 3. Re-validate stock at order creation time
 * 4. Price snapshot saved in OrderItem
 * 5. Total calculated server-side
 * 6. Return order ID on success
 * 7. Status = PENDING_VERIFICATION (prescription) or PENDING_PAYMENT (no prescription)
 */
export async function handleCheckout(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const customer = requireAuth(req, res, ['CUSTOMER']);
  if (!customer) return;

  const body = await parseJsonBody(req);
  const notes = (body.notes ? String(body.notes).slice(0, 500) : '').trim();
  const prescriptionUrl = (body.prescriptionUrl ? String(body.prescriptionUrl).slice(0, 255) : '').trim();
  const rawAddress = (body.shippingAddress || customer.address || '').trim();
  const shippingAddress = rawAddress ? String(rawAddress).slice(0, 500) : null;

  // 1. Fetch cart items with current database prices & stock
  const cartItems = await prisma.cartItem.findMany({
    where: { userId: customer.id },
    include: { medicine: true },
  });

  if (cartItems.length === 0) {
    sendJson(res, 400, {
      success: false,
      message: 'Keranjang belanja Anda masih kosong. Silakan tambahkan obat terlebih dahulu.',
    });
    return;
  }

  // 2. Validate stock (Business Rule 3)
  const stockIssues: Array<{ name: string; requested: number; available: number }> = [];
  let needsPrescription = false;
  let totalAmount = 0;

  for (const item of cartItems) {
    if (item.medicine.stock <= 0) {
      stockIssues.push({
        name: item.medicine.name,
        requested: item.quantity,
        available: 0,
      });
    } else if (item.quantity > item.medicine.stock) {
      stockIssues.push({
        name: item.medicine.name,
        requested: item.quantity,
        available: item.medicine.stock,
      });
    }

    if (item.medicine.requiresPrescription) {
      needsPrescription = true;
    }

    // Business Rule 5: server-side total from database prices
    totalAmount += item.medicine.price * item.quantity;
  }

  if (stockIssues.length > 0) {
    sendJson(res, 400, {
      success: false,
      message: `Terdapat ${stockIssues.length} masalah stok. Harap perbarui keranjang sebelum checkout.`,
      errors: {
        stock: stockIssues
          .map((i) => `"${i.name}": diminta ${i.requested}, tersedia ${i.available}`)
          .join('; '),
      },
    });
    return;
  }

  // 3. Business Rule 1 & 2: Prescription validation
  if (needsPrescription && !prescriptionUrl) {
    sendJson(res, 400, {
      success: false,
      message: 'Pesanan ini mengandung obat yang memerlukan resep dokter. Silakan upload resep terlebih dahulu.',
      errors: {
        prescription: 'Upload resep dokter wajib untuk obat yang memerlukan resep.',
      },
    });
    return;
  }

  // 4. Create Order + OrderItems in a transaction (atomicity)
  //    Business Rule 4: price snapshot in OrderItem
  //    Business Rule 7: initial status
  const orderStatus = needsPrescription ? 'PENDING_VERIFICATION' : 'PENDING_PAYMENT';

  const order = await prisma.$transaction(async (tx) => {
    // Create the order
    const newOrder = await tx.order.create({
      data: {
        customerId: customer.id,
        totalAmount,
        status: orderStatus,
        paymentStatus: 'UNPAID',
        requiresPrescription: (needsPrescription as any),
        prescriptionUrl: prescriptionUrl || null,
        shippingAddress,
        notes: notes || null,
        items: {
          create: cartItems.map((item) => ({
            medicineId: item.medicineId,
            quantity: item.quantity,
            price: item.medicine.price,       // Business Rule 4: snapshot
            subtotal: item.medicine.price * item.quantity,
          })),
        },
      },
      include: {
        items: {
          include: {
            medicine: {
              select: { id: true, name: true, unit: true, image: true, requiresPrescription: true },
            },
          },
        },
      },
    });

    // Reduce medicine stock
    for (const item of cartItems) {
      await tx.medicine.update({
        where: { id: item.medicineId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    // Clear the cart
    await tx.cartItem.deleteMany({
      where: { userId: customer.id },
    });

    return newOrder;
  });

  // Business Rule 6: return order ID
  sendJson(res, 201, {
    success: true,
    message: needsPrescription
      ? `Pesanan #${order.id.slice(-8).toUpperCase()} berhasil dibuat. Menunggu verifikasi resep oleh apoteker.`
      : `Pesanan #${order.id.slice(-8).toUpperCase()} berhasil dibuat. Silakan lanjutkan pembayaran.`,
    data: {
      order: {
        id: order.id,
        shortId: order.id.slice(-8).toUpperCase(),
        status: order.status,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount,
        requiresPrescription: order.requiresPrescription,
        prescriptionUrl: order.prescriptionUrl,
        shippingAddress: order.shippingAddress,
        notes: order.notes,
        itemCount: order.items.length,
        items: order.items.map((item) => ({
          id: item.id,
          medicineName: item.medicine.name,
          medicineUnit: item.medicine.unit,
          medicineImage: item.medicine.image,
          requiresPrescription: item.medicine.requiresPrescription,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.subtotal,
        })),
        createdAt: order.createdAt,
      },
    },
  });
}

/**
 * GET /api/orders — List all orders for the authenticated customer
 */
export async function handleGetOrders(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const customer = requireAuth(req, res, ['CUSTOMER']);
  if (!customer) return;

  const orders = await prisma.order.findMany({
    where: { customerId: customer.id },
    include: {
      items: {
        include: {
          medicine: {
            select: { id: true, name: true, unit: true, image: true, requiresPrescription: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const formatted = orders.map((order) => ({
    id: order.id,
    shortId: order.id.slice(-8).toUpperCase(),
    status: order.status,
    paymentStatus: order.paymentStatus,
    totalAmount: order.totalAmount,
    requiresPrescription: order.requiresPrescription,
    prescriptionUrl: order.prescriptionUrl,
    shippingAddress: order.shippingAddress,
    notes: order.notes,
    rejectionReason: order.rejectionReason,
    itemCount: order.items.length,
    items: order.items.map((item) => ({
      id: item.id,
      medicineName: item.medicine.name,
      medicineUnit: item.medicine.unit,
      medicineImage: item.medicine.image,
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
 * GET /api/orders/:id — Get a specific order detail (ownership check)
 */
export async function handleGetOrderDetail(
  req: IncomingMessage,
  res: ServerResponse,
  orderId: string
): Promise<void> {
  const customer = requireAuth(req, res, ['CUSTOMER']);
  if (!customer) return;

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

  // Ownership check: Customer only allowed to view their own orders
  if (order.customerId !== customer.id) {
    sendJson(res, 403, {
      success: false,
      message: 'Anda tidak memiliki akses ke pesanan ini.',
    });
    return;
  }

  sendJson(res, 200, {
    success: true,
    data: {
      order: {
        id: order.id,
        shortId: order.id.slice(-8).toUpperCase(),
        status: order.status,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount,
        requiresPrescription: order.requiresPrescription,
        prescriptionUrl: order.prescriptionUrl,
        shippingAddress: order.shippingAddress,
        notes: order.notes,
        rejectionReason: order.rejectionReason,
        customer: order.customer,
        itemCount: order.items.length,
        items: order.items.map((item) => ({
          id: item.id,
          medicineName: item.medicine.name,
          medicineUnit: item.medicine.unit,
          medicineImage: item.medicine.image,
          medicineCategory: item.medicine.category?.name || '-',
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
 * POST /api/orders/:id/mock-pay — Simulate manual payment (UNPAID -> PAID)
 */
export async function handleMockPayment(
  req: IncomingMessage,
  res: ServerResponse,
  orderId: string
): Promise<void> {
  const customer = requireAuth(req, res, ['CUSTOMER']);
  if (!customer) return;

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
  });

  if (!order) {
    sendJson(res, 404, {
      success: false,
      message: 'Pesanan tidak ditemukan.',
    });
    return;
  }

  if (order.customerId !== customer.id) {
    sendJson(res, 403, {
      success: false,
      message: 'Anda tidak memiliki akses ke pesanan ini.',
    });
    return;
  }

  if (order.paymentStatus === 'PAID') {
    sendJson(res, 400, {
      success: false,
      message: 'Pesanan ini sudah dibayar sebelumnya.',
    });
    return;
  }

  // Update payment status to PAID and if PENDING_PAYMENT, update to CONFIRMED
  const updated = await prisma.order.update({
    where: { id },
    data: {
      paymentStatus: 'PAID',
      status: order.status === 'PENDING_PAYMENT' ? 'CONFIRMED' : order.status,
    },
  });

  sendJson(res, 200, {
    success: true,
    message: `Pembayaran simulasi untuk pesanan #${updated.id.slice(-8).toUpperCase()} berhasil dikonfirmasi (PAID)!`,
    data: {
      orderId: updated.id,
      paymentStatus: updated.paymentStatus,
      status: updated.status,
    },
  });
}

/**
 * Helper to inspect binary magic bytes (file signature)
 * Defends against disguised file extensions, polyglots, and script injection
 */
function detectMagicMimeType(buffer: Buffer): 'image/png' | 'image/jpeg' | 'image/webp' | 'application/pdf' | null {
  if (buffer.length < 12) return null;

  // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4E &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0D &&
    buffer[5] === 0x0A &&
    buffer[6] === 0x1A &&
    buffer[7] === 0x0A
  ) {
    return 'image/png';
  }

  // JPEG magic bytes: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }

  // WebP magic bytes: RIFF .... WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp';
  }

  // PDF magic bytes: %PDF- (25 50 44 46 2D)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2D
  ) {
    return 'application/pdf';
  }

  return null;
}

/**
 * POST /api/upload/prescription — Upload prescription image
 * Accepts base64 encoded image/PDF data and saves to public/uploads/prescriptions/
 * Protected with Magic Byte signature check and 5MB size limit
 */
export async function handleUploadPrescription(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const customer = requireAuth(req, res, ['CUSTOMER']);
  if (!customer) return;

  // Izinkan payload hingga 8MB untuk mendukung file resep 5MB dalam encoding Base64
  const body = await parseJsonBody(req, 8 * 1024 * 1024);
  const { fileName, fileData, fileType } = body;

  if (!fileName || !fileData) {
    sendJson(res, 400, {
      success: false,
      message: 'File resep wajib dikirim (fileName dan fileData dalam format base64).',
    });
    return;
  }

  // Validate declared file type
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf'];
  const declaredMime = fileType || 'image/png';
  if (!allowedTypes.includes(declaredMime)) {
    sendJson(res, 400, {
      success: false,
      message: `Tipe file "${declaredMime}" tidak didukung. Harap gunakan format gambar (PNG, JPG, WebP) atau dokumen PDF.`,
    });
    return;
  }

  // Strip data URL prefix if present
  const base64Data = fileData.replace(/^data:[^;]+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  // Strict Max 5MB file limit
  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  if (buffer.length > MAX_FILE_SIZE) {
    sendJson(res, 400, {
      success: false,
      message: 'Ukuran file resep melebihi batas maksimum yang diizinkan (5MB).',
    });
    return;
  }

  // SECURITY CHECK: Validasi file signature asli (Magic Bytes) dari biner file
  const detectedMime = detectMagicMimeType(buffer);
  if (!detectedMime) {
    sendJson(res, 400, {
      success: false,
      message: 'KEAMANAN: Berkas yang diunggah tidak memiliki signature biner gambar atau dokumen PDF yang valid. File berpotensi rusak atau berbahaya.',
      errors: {
        file: 'Magic bytes signature tidak sesuai dengan format gambar/PDF resmi.',
      },
    });
    return;
  }

  // Validasi kecocokan antara MIME yang diklaim dan magic bytes biner
  const isMimeMatched =
    (detectedMime === 'image/jpeg' && (declaredMime === 'image/jpeg' || declaredMime === 'image/jpg')) ||
    detectedMime === declaredMime;

  if (!isMimeMatched) {
    sendJson(res, 400, {
      success: false,
      message: `Format file tidak konsisten: file terdeteksi sebagai "${detectedMime}" namun dikirim sebagai "${declaredMime}".`,
      errors: { file: 'Inkonsistensi ekstensi biner terdeteksi.' },
    });
    return;
  }

  // Decode base64 and save to secure directory
  const { writeFile, mkdir } = await import('fs/promises');
  const { join } = await import('path');

  const uploadDir = join(process.cwd(), 'public', 'uploads', 'prescriptions');
  await mkdir(uploadDir, { recursive: true });

  const extMap: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
  };
  const safeExt = extMap[detectedMime] || 'png';
  const uniqueName = `rx_${customer.id.slice(-6)}_${Date.now()}.${safeExt}`;
  const filePath = join(uploadDir, uniqueName);

  await writeFile(filePath, buffer);

  const url = `/uploads/prescriptions/${uniqueName}`;

  sendJson(res, 200, {
    success: true,
    message: 'Resep dokter berhasil diverifikasi dan diunggah secara aman.',
    data: {
      prescriptionUrl: url,
      fileName: uniqueName,
    },
  });
}
