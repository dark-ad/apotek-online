export interface CartMedicineInfo {
  id: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  stock: number;
  requiresPrescription: boolean;
  image: string | null;
}

export interface CartItemData {
  id: string;
  medicineId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  isAvailable: boolean;
  isStockSufficient: boolean;
  availableStock: number;
  medicine: CartMedicineInfo;
  createdAt: string;
  updatedAt: string;
}

export interface CartResponseData {
  items: CartItemData[];
  totalAmount: number;
  totalCount: number;
  hasStockIssue: boolean;
}

export interface CartValidationIssue {
  cartItemId: string;
  medicineId: string;
  medicineName: string;
  requestedQuantity: number;
  availableStock: number;
  issueType: 'OUT_OF_STOCK' | 'EXCEEDS_STOCK';
  message: string;
}

export interface CartValidationResult {
  isValid: boolean;
  totalAmount: number;
  totalCount: number;
  issuesCount: number;
  issues: CartValidationIssue[];
  canProceedToCheckout: boolean;
}

/**
 * Helper to build auth headers
 */
function authHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Fetch Customer's Cart from Server with database-calculated prices and subtotals
 */
export async function getCart(token: string): Promise<CartResponseData> {
  const res = await fetch('/api/cart', {
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Gagal memuat keranjang belanja.');
  }
  return data.data;
}

/**
 * Add medicine to Cart or increment quantity
 */
export async function addToCart(
  token: string,
  medicineId: string,
  quantity: number = 1
): Promise<{ message: string; cart: CartResponseData }> {
  const res = await fetch('/api/cart/items', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ medicineId, quantity }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Gagal menambahkan obat ke keranjang.');
  }
  return { message: data.message, cart: data.data };
}

/**
 * Update quantity of a cart item
 */
export async function updateCartItemQuantity(
  token: string,
  cartItemId: string,
  quantity: number
): Promise<{ message: string; cart: CartResponseData }> {
  const res = await fetch(`/api/cart/items/${encodeURIComponent(cartItemId)}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ quantity }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Gagal memperbarui kuantitas item keranjang.');
  }
  return { message: data.message, cart: data.data };
}

/**
 * Remove an item from the cart
 */
export async function removeCartItem(
  token: string,
  cartItemId: string
): Promise<{ message: string; cart: CartResponseData }> {
  const res = await fetch(`/api/cart/items/${encodeURIComponent(cartItemId)}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Gagal menghapus item dari keranjang.');
  }
  return { message: data.message, cart: data.data };
}

/**
 * Validate entire cart against real-time database stock before checkout
 */
export async function validateCart(token: string): Promise<CartValidationResult> {
  const res = await fetch('/api/cart/validate', {
    method: 'POST',
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Gagal memvalidasi keranjang belanja.');
  }
  return data.data;
}
