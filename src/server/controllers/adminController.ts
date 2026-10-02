import type { IncomingMessage, ServerResponse } from 'http';
import { prisma } from '../../lib/db';
import { sendJson, parseJsonBody, requireAuth, parseIntSafe } from '../utils';

// ============================================================================
// 1. DASHBOARD STATISTIK ADMIN
// ============================================================================

/**
 * GET /api/admin/stats
 * Menghitung dan mengembalikan seluruh metrik operasional apotek secara real-time
 */
export async function handleGetAdminStats(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const admin = requireAuth(req, res, ['ADMIN']);
  if (!admin) return;

  try {
    const [
      totalMedicines,
      outOfStockMedicines,
      lowStockMedicines,
      totalCustomers,
      totalStaff,
      totalAdmins,
      totalOrders,
      pendingOrders,
      processingOrders,
      completedOrders,
      cancelledOrders,
      completedOrdersData,
    ] = await Promise.all([
      prisma.medicine.count({ where: { isActive: true } }),
      prisma.medicine.count({ where: { isActive: true, stock: 0 } }),
      prisma.medicine.count({ where: { isActive: true, stock: { gt: 0, lte: 10 } } }),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.user.count({ where: { role: 'STAFF' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.order.count(),
      prisma.order.count({
        where: {
          status: { in: ['PENDING_VERIFICATION', 'PENDING_PAYMENT'] },
        },
      }),
      prisma.order.count({
        where: {
          status: { in: ['PROCESSING', 'READY_FOR_PICKUP', 'SHIPPED'] },
        },
      }),
      prisma.order.count({ where: { status: 'COMPLETED' } }),
      prisma.order.count({ where: { status: 'CANCELLED' } }),
      prisma.order.findMany({
        where: { paymentStatus: 'PAID' },
        select: { totalAmount: true },
      }),
    ]);

    const totalRevenue = completedOrdersData.reduce((acc, curr) => acc + curr.totalAmount, 0);

    sendJson(res, 200, {
      success: true,
      data: {
        stats: {
          totalMedicines,
          outOfStockMedicines,
          lowStockMedicines,
          totalCustomers,
          totalStaff,
          totalAdmins,
          totalOrders,
          pendingOrders,
          processingOrders,
          completedOrders,
          cancelledOrders,
          totalRevenue,
        },
      },
    });
  } catch (err: any) {
    sendJson(res, 500, {
      success: false,
      message: 'Gagal memuat statistik dashboard.',
      errors: { server: err.message },
    });
  }
}

// ============================================================================
// 2. CRUD OBAT (MEDICINE MANAGEMENT)
// ============================================================================

/**
 * GET /api/admin/medicines
 * Daftar obat untuk admin (menampilkan obat aktif maupun nonaktif)
 */
export async function handleAdminGetMedicines(
  req: IncomingMessage,
  res: ServerResponse,
  searchParams: URLSearchParams
): Promise<void> {
  const admin = requireAuth(req, res, ['ADMIN']);
  if (!admin) return;

  const search = searchParams.get('search')?.trim() || '';
  const categoryId = searchParams.get('category')?.trim() || '';
  const statusFilter = searchParams.get('status')?.trim(); // 'active' | 'inactive' | 'all'
  const page = parseIntSafe(searchParams.get('page'), 1, 1);
  const limit = parseIntSafe(searchParams.get('limit'), 10, 1, 100);
  const skip = (page - 1) * limit;

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

  if (statusFilter === 'active') {
    where.isActive = true;
  } else if (statusFilter === 'inactive') {
    where.isActive = false;
  }

  const [total, medicines] = await Promise.all([
    prisma.medicine.count({ where }),
    prisma.medicine.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        _count: { select: { orderItems: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  sendJson(res, 200, {
    success: true,
    data: {
      medicines: medicines.map((m) => ({
        id: m.id,
        name: m.name,
        categoryId: m.categoryId,
        categoryName: m.category.name,
        description: m.description,
        price: m.price,
        stock: m.stock,
        unit: m.unit,
        requiresPrescription: m.requiresPrescription,
        image: m.image,
        isActive: m.isActive,
        orderCount: m._count.orderItems,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    },
  });
}

/**
 * POST /api/admin/medicines
 * Tambah obat baru dengan validasi ketat
 */
export async function handleAdminCreateMedicine(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const admin = requireAuth(req, res, ['ADMIN']);
  if (!admin) return;

  const body = await parseJsonBody(req);
  const name = (body.name || '').trim();
  const categoryId = (body.categoryId || '').trim();
  const description = (body.description || '').trim();
  const unit = (body.unit || 'Strip').trim();
  const price = typeof body.price === 'number' ? body.price : parseFloat(body.price);
  const stock = typeof body.stock === 'number' ? body.stock : parseInt(body.stock, 10);
  const requiresPrescription = Boolean(body.requiresPrescription);
  const image = (body.image || '').trim() || null;

  const errors: Record<string, string> = {};
  if (!name) errors.name = 'Nama obat wajib diisi.';
  if (!categoryId) errors.categoryId = 'Kategori obat wajib dipilih.';
  if (isNaN(price) || price < 0) errors.price = 'Harga obat harus berupa angka valid (minimal Rp 0).';
  if (isNaN(stock) || stock < 0) errors.stock = 'Stok awal obat tidak boleh berupa angka negatif.';
  if (!unit) errors.unit = 'Satuan kemasan obat wajib diisi.';

  if (Object.keys(errors).length > 0) {
    sendJson(res, 400, {
      success: false,
      message: 'Validasi form penambahan obat gagal.',
      errors,
    });
    return;
  }

  // Verifikasi kategori valid di database
  const cat = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!cat) {
    sendJson(res, 400, {
      success: false,
      message: 'Kategori obat yang dipilih tidak ditemukan dalam database.',
      errors: { categoryId: 'Kategori tidak valid.' },
    });
    return;
  }

  const newMedicine = await prisma.medicine.create({
    data: {
      name,
      categoryId,
      description: description || null,
      price,
      stock,
      unit,
      requiresPrescription,
      image,
      isActive: true,
    },
    include: {
      category: { select: { id: true, name: true } },
    },
  });

  sendJson(res, 201, {
    success: true,
    message: `Obat "${newMedicine.name}" berhasil ditambahkan ke katalog apotek.`,
    data: { medicine: newMedicine },
  });
}

/**
 * PUT /api/admin/medicines/:id
 * Perbarui data obat
 */
export async function handleAdminUpdateMedicine(
  req: IncomingMessage,
  res: ServerResponse,
  id: string
): Promise<void> {
  const admin = requireAuth(req, res, ['ADMIN']);
  if (!admin) return;

  const medicineId = (id || '').trim();
  const existing = await prisma.medicine.findUnique({ where: { id: medicineId } });
  if (!existing) {
    sendJson(res, 404, {
      success: false,
      message: 'Data obat tidak ditemukan.',
    });
    return;
  }

  const body = await parseJsonBody(req);
  const name = body.name !== undefined ? String(body.name).trim() : existing.name;
  const categoryId = body.categoryId !== undefined ? String(body.categoryId).trim() : existing.categoryId;
  const description = body.description !== undefined ? String(body.description).trim() : existing.description;
  const unit = body.unit !== undefined ? String(body.unit).trim() : existing.unit;
  const price = body.price !== undefined ? parseFloat(body.price) : existing.price;
  const stock = body.stock !== undefined ? parseInt(body.stock, 10) : existing.stock;
  const requiresPrescription = body.requiresPrescription !== undefined ? Boolean(body.requiresPrescription) : existing.requiresPrescription;
  const image = body.image !== undefined ? (String(body.image).trim() || null) : existing.image;
  const isActive = body.isActive !== undefined ? Boolean(body.isActive) : existing.isActive;

  const errors: Record<string, string> = {};
  if (!name) errors.name = 'Nama obat tidak boleh kosong.';
  if (isNaN(price) || price < 0) errors.price = 'Harga obat minimal Rp 0.';
  if (isNaN(stock) || stock < 0) errors.stock = 'Stok obat tidak boleh negatif.';

  if (Object.keys(errors).length > 0) {
    sendJson(res, 400, {
      success: false,
      message: 'Validasi perbaruan data obat gagal.',
      errors,
    });
    return;
  }

  const updated = await prisma.medicine.update({
    where: { id: medicineId },
    data: {
      name,
      categoryId,
      description: description || null,
      price,
      stock,
      unit,
      requiresPrescription,
      image,
      isActive,
    },
    include: {
      category: { select: { id: true, name: true } },
    },
  });

  sendJson(res, 200, {
    success: true,
    message: `Data obat "${updated.name}" berhasil diperbarui.`,
    data: { medicine: updated },
  });
}

/**
 * DELETE /api/admin/medicines/:id
 * Menghapus obat dengan relasi keselamatan transaksi.
 * Jika pernah dipesan (terdapat di OrderItem), terapkan Soft Delete (isActive: false).
 * Jika belum pernah dipesan, lakukan hard delete aman.
 */
export async function handleAdminDeleteMedicine(
  req: IncomingMessage,
  res: ServerResponse,
  id: string
): Promise<void> {
  const admin = requireAuth(req, res, ['ADMIN']);
  if (!admin) return;

  const medicineId = (id || '').trim();
  const existing = await prisma.medicine.findUnique({
    where: { id: medicineId },
    include: {
      _count: { select: { orderItems: true, cartItems: true } },
    },
  });

  if (!existing) {
    sendJson(res, 404, {
      success: false,
      message: 'Data obat tidak ditemukan.',
    });
    return;
  }

  // Cek apakah obat memiliki riwayat transaksi di OrderItem
  if (existing._count.orderItems > 0) {
    // ATURAN INTEGRITAS: Jangan hapus permanen jika ada relasi transaksi. Gunakan Soft Delete.
    await prisma.medicine.update({
      where: { id: medicineId },
      data: { isActive: false },
    });

    sendJson(res, 200, {
      success: true,
      message: `Obat "${existing.name}" memiliki ${existing._count.orderItems} riwayat transaksi pesanan. Sistem menerapkan SOFT DELETE (Status Diarsipkan) agar snapshot riwayat pesanan pelanggan tidak rusak.`,
      data: { softDeleted: true, id: medicineId },
    });
    return;
  }

  // Jika tidak memiliki relasi pesanan, bersihkan cartItems terkait lalu hard delete
  await prisma.cartItem.deleteMany({ where: { medicineId } });
  await prisma.medicine.delete({ where: { id: medicineId } });

  sendJson(res, 200, {
    success: true,
    message: `Obat "${existing.name}" berhasil dihapus permanen dari sistem.`,
    data: { softDeleted: false, id: medicineId },
  });
}

// ============================================================================
// 3. CRUD KATEGORI (CATEGORY MANAGEMENT)
// ============================================================================

/**
 * GET /api/admin/categories
 * Daftar seluruh kategori beserta jumlah obat di dalamnya
 */
export async function handleAdminGetCategories(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const admin = requireAuth(req, res, ['ADMIN']);
  if (!admin) return;

  const categories = await prisma.category.findMany({
    include: {
      _count: {
        select: { medicines: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  sendJson(res, 200, {
    success: true,
    data: {
      categories: categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        medicineCount: cat._count.medicines,
        createdAt: cat.createdAt,
      })),
    },
  });
}

/**
 * POST /api/admin/categories
 * Tambah kategori baru
 */
export async function handleAdminCreateCategory(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const admin = requireAuth(req, res, ['ADMIN']);
  if (!admin) return;

  const body = await parseJsonBody(req);
  const name = (body.name || '').trim();
  const description = (body.description || '').trim();

  if (!name) {
    sendJson(res, 400, {
      success: false,
      message: 'Nama kategori wajib diisi.',
      errors: { name: 'Nama kategori tidak boleh kosong.' },
    });
    return;
  }

  const existing = await prisma.category.findUnique({ where: { name } });
  if (existing) {
    sendJson(res, 409, {
      success: false,
      message: `Kategori dengan nama "${name}" sudah ada. Silakan gunakan nama lain.`,
      errors: { name: 'Nama kategori sudah terdaftar.' },
    });
    return;
  }

  const newCategory = await prisma.category.create({
    data: {
      name,
      description: description || null,
    },
  });

  sendJson(res, 201, {
    success: true,
    message: `Kategori "${newCategory.name}" berhasil dibuat.`,
    data: { category: newCategory },
  });
}

/**
 * PUT /api/admin/categories/:id
 * Ubah nama atau deskripsi kategori
 */
export async function handleAdminUpdateCategory(
  req: IncomingMessage,
  res: ServerResponse,
  id: string
): Promise<void> {
  const admin = requireAuth(req, res, ['ADMIN']);
  if (!admin) return;

  const categoryId = (id || '').trim();
  const existing = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!existing) {
    sendJson(res, 404, {
      success: false,
      message: 'Kategori tidak ditemukan.',
    });
    return;
  }

  const body = await parseJsonBody(req);
  const name = (body.name || '').trim();
  const description = body.description !== undefined ? String(body.description).trim() : existing.description;

  if (!name) {
    sendJson(res, 400, {
      success: false,
      message: 'Nama kategori tidak boleh kosong.',
      errors: { name: 'Nama kategori wajib diisi.' },
    });
    return;
  }

  // Cek duplikasi nama jika nama diganti
  if (name.toLowerCase() !== existing.name.toLowerCase()) {
    const duplicate = await prisma.category.findUnique({ where: { name } });
    if (duplicate) {
      sendJson(res, 409, {
        success: false,
        message: `Kategori "${name}" sudah digunakan.`,
        errors: { name: 'Nama kategori sudah ada.' },
      });
      return;
    }
  }

  const updated = await prisma.category.update({
    where: { id: categoryId },
    data: {
      name,
      description: description || null,
    },
  });

  sendJson(res, 200, {
    success: true,
    message: `Kategori "${updated.name}" berhasil diperbarui.`,
    data: { category: updated },
  });
}

/**
 * DELETE /api/admin/categories/:id
 * Hapus kategori dengan proteksi integritas relasi obat
 */
export async function handleAdminDeleteCategory(
  req: IncomingMessage,
  res: ServerResponse,
  id: string
): Promise<void> {
  const admin = requireAuth(req, res, ['ADMIN']);
  if (!admin) return;

  const categoryId = (id || '').trim();
  const existing = await prisma.category.findUnique({
    where: { id: categoryId },
    include: {
      _count: { select: { medicines: true } },
    },
  });

  if (!existing) {
    sendJson(res, 404, {
      success: false,
      message: 'Kategori tidak ditemukan.',
    });
    return;
  }

  // ATURAN INTEGRITAS: Jangan izinkan penghapusan jika masih ada obat terkait
  if (existing._count.medicines > 0) {
    sendJson(res, 400, {
      success: false,
      message: `TIDAK DAPAT DIHAPUS: Kategori "${existing.name}" masih memiliki ${existing._count.medicines} jenis obat terhubung. Silakan pindahkan atau hapus obat terkait terlebih dahulu.`,
      errors: { medicines: `Masih ada ${existing._count.medicines} obat terkait.` },
    });
    return;
  }

  await prisma.category.delete({ where: { id: categoryId } });

  sendJson(res, 200, {
    success: true,
    message: `Kategori "${existing.name}" berhasil dihapus.`,
  });
}

// ============================================================================
// 4. MANAJEMEN PENGGUNA (USER MANAGEMENT)
// ============================================================================

/**
 * GET /api/admin/users
 * Mengambil daftar pengguna dengan filter role dan search
 */
export async function handleGetAdminUsers(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const admin = requireAuth(req, res, ['ADMIN']);
  if (!admin) return;

  const parsedUrl = new URL(req.url || '', 'http://localhost');
  const roleFilter = parsedUrl.searchParams.get('role')?.trim() || 'ALL';
  const search = parsedUrl.searchParams.get('search')?.trim() || '';

  const where: any = {};
  if (roleFilter !== 'ALL') {
    where.role = roleFilter;
  }
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
      { phone: { contains: search } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      address: true,
      isActive: true,
      createdAt: true,
      _count: {
        select: { orders: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  sendJson(res, 200, {
    success: true,
    data: {
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        phone: u.phone,
        address: u.address,
        isActive: u.isActive,
        orderCount: u._count.orders,
        createdAt: u.createdAt,
      })),
    },
  });
}

/**
 * PUT /api/admin/users/:id/role
 * Mengubah role pengguna (ADMIN, STAFF, CUSTOMER)
 * Memiliki proteksi self-lockout
 */
export async function handleAdminUpdateUserRole(
  req: IncomingMessage,
  res: ServerResponse,
  id: string
): Promise<void> {
  const admin = requireAuth(req, res, ['ADMIN']);
  if (!admin) return;

  const targetUserId = (id || '').trim();
  const body = await parseJsonBody(req);
  const newRole = (body.role || '').toUpperCase().trim();

  if (!['ADMIN', 'STAFF', 'CUSTOMER'].includes(newRole)) {
    sendJson(res, 400, {
      success: false,
      message: 'Role baru tidak valid. Pilihan role: ADMIN, STAFF, CUSTOMER.',
      errors: { role: 'Role tidak valid.' },
    });
    return;
  }

  // SELF-LOCKOUT PROTECTION: Admin tidak boleh mengubah role dirinya sendiri
  if (admin.id === targetUserId && newRole !== 'ADMIN') {
    sendJson(res, 400, {
      success: false,
      message: 'TINDAKAN DILARANG: Anda tidak dapat menurunkan role akun Administrator yang sedang aktif digunakan.',
    });
    return;
  }

  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!targetUser) {
    sendJson(res, 404, {
      success: false,
      message: 'Pengguna tidak ditemukan.',
    });
    return;
  }

  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: { role: newRole },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      updatedAt: true,
    },
  });

  sendJson(res, 200, {
    success: true,
    message: `Role pengguna "${updated.name}" berhasil diubah menjadi ${updated.role}.`,
    data: { user: updated },
  });
}

/**
 * PUT /api/admin/users/:id/status
 * Mengaktifkan atau menonaktifkan pengguna (isActive: true/false)
 * Memiliki proteksi self-lockout
 */
export async function handleAdminToggleUserStatus(
  req: IncomingMessage,
  res: ServerResponse,
  id: string
): Promise<void> {
  const admin = requireAuth(req, res, ['ADMIN']);
  if (!admin) return;

  const targetUserId = (id || '').trim();
  const body = await parseJsonBody(req);
  const isActive = Boolean(body.isActive);

  // SELF-LOCKOUT PROTECTION: Admin tidak boleh menonaktifkan akunnya sendiri
  if (admin.id === targetUserId && !isActive) {
    sendJson(res, 400, {
      success: false,
      message: 'TINDAKAN DILARANG: Anda tidak dapat menonaktifkan akun Administrator Anda sendiri.',
    });
    return;
  }

  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!targetUser) {
    sendJson(res, 404, {
      success: false,
      message: 'Pengguna tidak ditemukan.',
    });
    return;
  }

  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: { isActive },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      updatedAt: true,
    },
  });

  const statusLabel = updated.isActive ? 'diaktifkan' : 'dinonaktifkan';

  sendJson(res, 200, {
    success: true,
    message: `Akun "${updated.name}" berhasil ${statusLabel}.`,
    data: { user: updated },
  });
}

// ============================================================================
// 5. MANAJEMEN ORDER & TRANSAKSI APOTEK
// ============================================================================

/**
 * GET /api/admin/orders
 * Mengambil daftar seluruh pesanan apotek beserta detail customer dan item
 */
export async function handleAdminGetOrders(
  req: IncomingMessage,
  res: ServerResponse,
  searchParams: URLSearchParams
): Promise<void> {
  const admin = requireAuth(req, res, ['ADMIN']);
  if (!admin) return;

  const status = searchParams.get('status')?.trim() || 'ALL';
  const paymentStatus = searchParams.get('paymentStatus')?.trim() || 'ALL';
  const search = searchParams.get('search')?.trim() || '';

  const where: any = {};
  if (status !== 'ALL') {
    where.status = status;
  }
  if (paymentStatus !== 'ALL') {
    where.paymentStatus = paymentStatus;
  }
  if (search) {
    where.OR = [
      { id: { contains: search } },
      { customer: { name: { contains: search } } },
      { customer: { email: { contains: search } } },
    ];
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      customer: {
        select: { id: true, name: true, email: true, phone: true },
      },
      items: {
        include: {
          medicine: { select: { id: true, name: true, unit: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  sendJson(res, 200, {
    success: true,
    data: {
      orders: orders.map((ord) => ({
        id: ord.id,
        shortId: ord.id.slice(-8).toUpperCase(),
        totalAmount: ord.totalAmount,
        status: ord.status,
        paymentStatus: ord.paymentStatus,
        requiresPrescription: ord.requiresPrescription,
        prescriptionUrl: ord.prescriptionUrl,
        shippingAddress: ord.shippingAddress,
        notes: ord.notes,
        rejectionReason: ord.rejectionReason,
        customer: ord.customer,
        items: ord.items.map((it) => ({
          id: it.id,
          medicineName: it.medicine.name,
          unit: it.medicine.unit,
          quantity: it.quantity,
          price: it.price,
          subtotal: it.subtotal,
        })),
        createdAt: ord.createdAt,
      })),
    },
  });
}

/**
 * GET /api/admin/transactions
 * Ringkasan transaksi keuangan apotek
 */
export async function handleAdminGetTransactions(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const admin = requireAuth(req, res, ['ADMIN']);
  if (!admin) return;

  const orders = await prisma.order.findMany({
    where: { paymentStatus: 'PAID' },
    include: {
      customer: { select: { name: true, email: true } },
      items: { select: { quantity: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const totalRevenue = orders.reduce((acc, curr) => acc + curr.totalAmount, 0);

  sendJson(res, 200, {
    success: true,
    data: {
      totalRevenue,
      transactionCount: orders.length,
      transactions: orders.map((o) => ({
        orderId: o.id,
        shortId: o.id.slice(-8).toUpperCase(),
        customerName: o.customer.name,
        customerEmail: o.customer.email,
        totalAmount: o.totalAmount,
        status: o.status,
        itemCount: o.items.reduce((s, it) => s + it.quantity, 0),
        paidAt: o.updatedAt,
      })),
    },
  });
}
