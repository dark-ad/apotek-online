import { ApiResponse } from '../server/types';

export interface StaffOrderItem {
  id: string;
  medicineId: string;
  medicineName: string;
  medicineUnit?: string;
  medicineImage?: string | null;
  medicineCategory?: string;
  medicineStock?: number;
  requiresPrescription: boolean;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface StaffCustomer {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
}

export interface StaffOrder {
  id: string;
  shortId: string;
  customerId: string;
  customer?: StaffCustomer;
  totalAmount: number;
  status: 'PENDING_VERIFICATION' | 'PENDING_PAYMENT' | 'PROCESSING' | 'READY_FOR_PICKUP' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';
  paymentStatus: 'UNPAID' | 'PAID' | 'FAILED';
  requiresPrescription: boolean;
  prescriptionUrl?: string | null;
  shippingAddress?: string | null;
  notes?: string | null;
  rejectionReason?: string | null;
  itemCount: number;
  items: StaffOrderItem[];
  createdAt: string;
  updatedAt?: string;
}

export interface StaffMedicine {
  id: string;
  name: string;
  category: string;
  categoryId: string;
  price: number;
  stock: number;
  unit: string;
  requiresPrescription: boolean;
  image?: string | null;
  isLowStock: boolean;
  isOutOfStock: boolean;
}

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('apotek_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const staffService = {
  /**
   * Fetch all incoming orders for staff portal
   */
  async getOrders(): Promise<ApiResponse<{ orders: StaffOrder[]; total: number }>> {
    const res = await fetch('/api/staff/orders', {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  /**
   * Fetch single order detail
   */
  async getOrderDetail(id: string): Promise<ApiResponse<{ order: StaffOrder }>> {
    const res = await fetch(`/api/staff/orders/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  /**
   * Verify prescription: Approve or Reject (with mandatory reason if rejecting)
   */
  async verifyPrescription(
    orderId: string,
    action: 'APPROVE' | 'REJECT',
    reason?: string
  ): Promise<ApiResponse<{ orderId: string; status: string; rejectionReason?: string }>> {
    const res = await fetch(`/api/staff/orders/${orderId}/verify-prescription`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ action, reason }),
    });
    return res.json();
  },

  /**
   * Update order status
   */
  async updateOrderStatus(
    orderId: string,
    status: string,
    reason?: string
  ): Promise<ApiResponse<{ orderId: string; status: string; rejectionReason?: string }>> {
    const res = await fetch(`/api/staff/orders/${orderId}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, reason }),
    });
    return res.json();
  },

  /**
   * Get medicines list for stock management
   */
  async getMedicines(search?: string, category?: string): Promise<ApiResponse<{ medicines: StaffMedicine[]; total: number }>> {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (category && category !== 'all') params.set('category', category);

    const res = await fetch(`/api/staff/medicines?${params.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  /**
   * Update medicine stock (increase, decrease, set)
   */
  async updateStock(
    medicineId: string,
    action: 'ADD' | 'SUBTRACT' | 'SET',
    amount: number,
    notes?: string
  ): Promise<ApiResponse<{ medicine: StaffMedicine }>> {
    const res = await fetch(`/api/staff/medicines/${medicineId}/stock`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ action, amount, notes }),
    });
    return res.json();
  },
};
