import type { IncomingMessage, ServerResponse } from 'http';
import { prisma } from '../../lib/db';
import { sendJson, parseJsonBody, requireAuth } from '../utils';

/**
 * Enforce CUSTOMER role for Shopping Cart access
 */
function requireCustomer(req: IncomingMessage, res: ServerResponse) {
  return requireAuth(req, res, ['CUSTOMER']);
}

/**
 * Helper to compute cart with database prices and server-side subtotals/totals
 */
export async function getCustomerCartResponse(userId: string) {
  const items = await prisma.cartItem.findMany({
    where: { userId },
    include: {
      medicine: {
        include: {
          category: {
            select: { id: true, name: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  let totalAmount = 0;
  let totalCount = 0;
  let hasStockIssue = false;

  const formattedItems = items.map((item) => {
    // Business Rule 4: Harga harus berasal dari database
    const unitPrice = item.medicine.price;
    // Business Rule 5: Subtotal dan total dihitung server-side
    const subtotal = unitPrice * item.quantity;
    const isAvailable = item.medicine.stock > 0;
    const isStockSufficient = item.medicine.stock >= item.quantity;

    if (!isStockSufficient) {
      hasStockIssue = true;
    }

    totalAmount += subtotal;
    totalCount += item.quantity;

    return {
      id: item.id,
      medicineId: item.medicineId,
      quantity: item.quantity,
      unitPrice,
      subtotal,
      isAvailable,
      isStockSufficient,
      availableStock: item.medicine.stock,
      medicine: {
        id: item.medicine.id,
        name: item.medicine.name,
        category: item.medicine.category?.name || 'Katalog Apotek',
        unit: item.medicine.unit,
        price: item.medicine.price,
        stock: item.medicine.stock,
        requiresPrescription: item.medicine.requiresPrescription,
        image: item.medicine.image,
      },
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  });

  return {
    items: formattedItems,
    totalAmount,
    totalCount,
    hasStockIssue,
  };
}

export async function handleGetCart(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const customer = requireCustomer(req, res);
  if (!customer) return;

  const cart = await getCustomerCartResponse(customer.id);
  sendJson(res, 200, {
    success: true,
    data: cart,
  });
}

export async function handleAddToCart(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const customer = requireCustomer(req, res);
  if (!customer) return;

  const body = await parseJsonBody(req);
  const medicineId = (body.medicineId || '').trim();

  // Strict validation of quantity input
  if (body.quantity !== undefined) {
    const rawQty = Number(body.quantity);
    if (!Number.isInteger(rawQty) || rawQty < 1 || rawQty > 100) {
      sendJson(res, 400, {
        success: false,
        message: 'Kuantitas penambahan harus berupa angka bulat antara 1 sampai 100 unit.',
        errors: { quantity: 'Kuantitas harus berupa angka 1 - 100.' },
      });
      return;
    }
  }

  const addQty = body.quantity !== undefined ? Number(body.quantity) : 1;

  if (!medicineId) {
    sendJson(res, 400, {
      success: false,
      message: 'medicineId wajib diisi.',
    });
    return;
  }

  // Check medicine in database
  const medicine = await prisma.medicine.findUnique({
    where: { id: medicineId },
  });

  if (!medicine) {
    sendJson(res, 404, {
      success: false,
      message: 'Obat tidak ditemukan dalam database.',
    });
    return;
  }

  // Business Rule 3: Obat yang stoknya 0 tidak dapat ditambahkan
  if (medicine.stock <= 0) {
    sendJson(res, 400, {
      success: false,
      message: `Maaf, stok obat "${medicine.name}" saat ini habis (Stok: 0).`,
      errors: { stock: 'Obat stok habis tidak dapat ditambahkan ke keranjang.' },
    });
    return;
  }

  // Check existing item in user's cart
  const existingCartItem = await prisma.cartItem.findUnique({
    where: {
      userId_medicineId: {
        userId: customer.id,
        medicineId,
      },
    },
  });

  const currentQty = existingCartItem ? existingCartItem.quantity : 0;
  const targetQty = currentQty + addQty;

  // Business Rule 2: Quantity tidak boleh melebihi stok
  if (targetQty > medicine.stock) {
    sendJson(res, 400, {
      success: false,
      message: `Kuantitas melebihi stok yang tersedia. Stok saat ini ${medicine.stock} unit (Sudah di keranjang: ${currentQty}).`,
      errors: { quantity: `Maksimal pembelian adalah ${medicine.stock} unit.` },
    });
    return;
  }

  let savedCartItemId = '';
  if (existingCartItem) {
    const updated = await prisma.cartItem.update({
      where: { id: existingCartItem.id },
      data: { quantity: targetQty },
    });
    savedCartItemId = updated.id;
  } else {
    const created = await prisma.cartItem.create({
      data: {
        userId: customer.id,
        medicineId,
        quantity: targetQty,
      },
    });
    savedCartItemId = created.id;
  }

  const updatedCart = await getCustomerCartResponse(customer.id);

  sendJson(res, 201, {
    success: true,
    message: `Berhasil menambahkan "${medicine.name}" ke keranjang belanja.`,
    data: {
      ...updatedCart,
      cartItem: updatedCart.items.find((i) => i.id === savedCartItemId),
    },
  });
}

export async function handleUpdateCartItem(
  req: IncomingMessage,
  res: ServerResponse,
  cartItemId: string
): Promise<void> {
  const customer = requireCustomer(req, res);
  if (!customer) return;

  const id = (cartItemId || '').trim();
  if (!id) {
    sendJson(res, 400, {
      success: false,
      message: 'ID item keranjang tidak valid.',
    });
    return;
  }

  const body = await parseJsonBody(req);
  const newQty = parseInt(body.quantity, 10);

  // Business Rule 1: Quantity minimal = 1, maksimal wajar = 500
  if (isNaN(newQty) || newQty < 1 || newQty > 500) {
    sendJson(res, 400, {
      success: false,
      message: 'Kuantitas pembelian harus antara 1 sampai 500 unit.',
      errors: { quantity: 'Kuantitas harus berupa angka 1 - 500.' },
    });
    return;
  }

  const cartItem = await prisma.cartItem.findUnique({
    where: { id },
    include: { medicine: true },
  });

  if (!cartItem || cartItem.userId !== customer.id) {
    sendJson(res, 404, {
      success: false,
      message: 'Item keranjang belanja tidak ditemukan.',
    });
    return;
  }

  // Business Rule 2: Quantity tidak boleh melebihi stok
  if (newQty > cartItem.medicine.stock) {
    sendJson(res, 400, {
      success: false,
      message: `Kuantitas (${newQty}) melebihi stok obat yang tersedia (${cartItem.medicine.stock} unit).`,
      errors: { quantity: `Maksimal kuantitas adalah ${cartItem.medicine.stock}.` },
    });
    return;
  }

  await prisma.cartItem.update({
    where: { id },
    data: { quantity: newQty },
  });

  const updatedCart = await getCustomerCartResponse(customer.id);

  sendJson(res, 200, {
    success: true,
    message: 'Kuantitas item keranjang berhasil diperbarui.',
    data: {
      ...updatedCart,
      cartItem: updatedCart.items.find((i) => i.id === id),
    },
  });
}

export async function handleDeleteCartItem(
  req: IncomingMessage,
  res: ServerResponse,
  cartItemId: string
): Promise<void> {
  const customer = requireCustomer(req, res);
  if (!customer) return;

  const id = (cartItemId || '').trim();

  if (id === 'all') {
    // Clear entire cart
    await prisma.cartItem.deleteMany({
      where: { userId: customer.id },
    });
  } else {
    const cartItem = await prisma.cartItem.findUnique({
      where: { id },
    });

    if (!cartItem || cartItem.userId !== customer.id) {
      sendJson(res, 404, {
        success: false,
        message: 'Item keranjang tidak ditemukan.',
      });
      return;
    }

    await prisma.cartItem.delete({
      where: { id },
    });
  }

  const updatedCart = await getCustomerCartResponse(customer.id);

  sendJson(res, 200, {
    success: true,
    message: 'Item berhasil dihapus dari keranjang belanja.',
    data: updatedCart,
  });
}

export async function handleValidateCart(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const customer = requireCustomer(req, res);
  if (!customer) return;

  const items = await prisma.cartItem.findMany({
    where: { userId: customer.id },
    include: {
      medicine: true,
    },
  });

  if (items.length === 0) {
    sendJson(res, 400, {
      success: false,
      message: 'Keranjang belanja Anda masih kosong. Silakan pilih obat terlebih dahulu.',
    });
    return;
  }

  const issues: Array<{
    cartItemId: string;
    medicineId: string;
    medicineName: string;
    requestedQuantity: number;
    availableStock: number;
    issueType: 'OUT_OF_STOCK' | 'EXCEEDS_STOCK';
    message: string;
  }> = [];

  let guaranteedTotal = 0;
  let totalCount = 0;

  for (const item of items) {
    const currentStock = item.medicine.stock;
    const currentPrice = item.medicine.price;

    guaranteedTotal += currentPrice * item.quantity;
    totalCount += item.quantity;

    // Business Rule 3 & 6: Re-check if medicine is out of stock
    if (currentStock <= 0) {
      issues.push({
        cartItemId: item.id,
        medicineId: item.medicineId,
        medicineName: item.medicine.name,
        requestedQuantity: item.quantity,
        availableStock: 0,
        issueType: 'OUT_OF_STOCK',
        message: `Stok obat "${item.medicine.name}" saat ini habis (0 unit). Silakan hapus item ini sebelum checkout.`,
      });
    } else if (item.quantity > currentStock) {
      // Business Rule 2 & 6: Re-check if requested quantity exceeds current stock
      issues.push({
        cartItemId: item.id,
        medicineId: item.medicineId,
        medicineName: item.medicine.name,
        requestedQuantity: item.quantity,
        availableStock: currentStock,
        issueType: 'EXCEEDS_STOCK',
        message: `Kuantitas obat "${item.medicine.name}" (${item.quantity}) melebihi stok yang tersisa (${currentStock} unit). Harap kurangi kuantitas sebelum checkout.`,
      });
    }
  }

  const isValid = issues.length === 0;

  sendJson(res, 200, {
    success: true,
    data: {
      isValid,
      totalAmount: guaranteedTotal,
      totalCount,
      issuesCount: issues.length,
      issues,
      canProceedToCheckout: isValid,
    },
  });
}
