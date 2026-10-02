// Validation schemas and helpers for Apotek Online + AI

export const VALID_ROLES = ['ADMIN', 'STAFF', 'CUSTOMER'] as const;
export type ValidRole = (typeof VALID_ROLES)[number];

export const VALID_ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'COMPLETED',
  'CANCELLED',
] as const;
export type ValidOrderStatus = (typeof VALID_ORDER_STATUSES)[number];

export const VALID_PAYMENT_STATUSES = ['UNPAID', 'PAID', 'FAILED'] as const;
export type ValidPaymentStatus = (typeof VALID_PAYMENT_STATUSES)[number];

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: Record<string, string>;
}

// User Validation
export interface CreateUserInput {
  name: string;
  email: string;
  password?: string;
  phone?: string | null;
  address?: string | null;
  role?: ValidRole;
}

export function validateUser(input: CreateUserInput): ValidationResult<CreateUserInput> {
  const errors: Record<string, string> = {};

  if (!input.name || input.name.trim().length < 2) {
    errors.name = 'Nama wajib diisi minimal 2 karakter.';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!input.email || !emailRegex.test(input.email)) {
    errors.email = 'Format email tidak valid.';
  }

  if (input.password && input.password.length < 6) {
    errors.password = 'Password minimal 6 karakter.';
  }

  if (input.role && !VALID_ROLES.includes(input.role)) {
    errors.role = `Role tidak valid. Harus salah satu dari: ${VALID_ROLES.join(', ')}`;
  }

  if (input.phone && !/^[0-9+\-\s]{8,18}$/.test(input.phone)) {
    errors.phone = 'Format nomor telepon tidak valid.';
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      ...input,
      role: input.role || 'CUSTOMER',
    },
  };
}

// Medicine Validation
export interface CreateMedicineInput {
  name: string;
  categoryId: string;
  description?: string | null;
  price: number;
  stock: number;
  unit: string;
  requiresPrescription?: boolean;
  image?: string | null;
}

export function validateMedicine(input: CreateMedicineInput): ValidationResult<CreateMedicineInput> {
  const errors: Record<string, string> = {};

  if (!input.name || input.name.trim().length < 2) {
    errors.name = 'Nama obat wajib diisi minimal 2 karakter.';
  }

  if (!input.categoryId || input.categoryId.trim() === '') {
    errors.categoryId = 'Kategori obat wajib dipilih.';
  }

  if (typeof input.price !== 'number' || input.price < 0) {
    errors.price = 'Harga obat harus berupa angka positif.';
  }

  if (typeof input.stock !== 'number' || input.stock < 0 || !Number.isInteger(input.stock)) {
    errors.stock = 'Stok obat harus berupa bilangan bulat non-negatif.';
  }

  if (!input.unit || input.unit.trim().length === 0) {
    errors.unit = 'Satuan obat (unit) wajib diisi (contoh: Strip, Botol, Tube).';
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      ...input,
      requiresPrescription: !!input.requiresPrescription,
    },
  };
}

// Category Validation
export interface CreateCategoryInput {
  name: string;
  description?: string | null;
}

export function validateCategory(input: CreateCategoryInput): ValidationResult<CreateCategoryInput> {
  const errors: Record<string, string> = {};

  if (!input.name || input.name.trim().length < 2) {
    errors.name = 'Nama kategori wajib diisi minimal 2 karakter.';
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return { success: true, data: input };
}

// Order & OrderItem Validation
export interface CreateOrderItemInput {
  medicineId: string;
  quantity: number;
  price: number;
}

export interface CreateOrderInput {
  customerId: string;
  items: CreateOrderItemInput[];
  prescriptionUrl?: string | null;
  notes?: string | null;
}

export function validateOrder(input: CreateOrderInput): ValidationResult<CreateOrderInput & { totalAmount: number; validatedItems: (CreateOrderItemInput & { subtotal: number })[] }> {
  const errors: Record<string, string> = {};

  if (!input.customerId) {
    errors.customerId = 'Customer ID wajib disertakan.';
  }

  if (!input.items || !Array.isArray(input.items) || input.items.length === 0) {
    errors.items = 'Pesanan harus memiliki minimal 1 item obat.';
  }

  let totalAmount = 0;
  const validatedItems: (CreateOrderItemInput & { subtotal: number })[] = [];

  if (input.items && Array.isArray(input.items)) {
    input.items.forEach((item, index) => {
      if (!item.medicineId) {
        errors[`items[${index}].medicineId`] = 'Medicine ID item wajib diisi.';
      }
      if (typeof item.quantity !== 'number' || item.quantity <= 0 || !Number.isInteger(item.quantity)) {
        errors[`items[${index}].quantity`] = 'Kuantitas harus berupa bilangan bulat > 0.';
      }
      if (typeof item.price !== 'number' || item.price < 0) {
        errors[`items[${index}].price`] = 'Harga item tidak valid.';
      }

      const subtotal = (item.price || 0) * (item.quantity || 0);
      totalAmount += subtotal;
      validatedItems.push({
        ...item,
        subtotal,
      });
    });
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      ...input,
      totalAmount,
      validatedItems,
    },
  };
}
