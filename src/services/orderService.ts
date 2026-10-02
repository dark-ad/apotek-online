import { ApiResponse } from '../server/types';

export interface OrderItemData {
  id: string;
  medicineName: string;
  medicineUnit?: string;
  medicineImage?: string | null;
  medicineCategory?: string;
  requiresPrescription: boolean;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface CustomerOrderSummary {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
}

export interface OrderData {
  id: string;
  shortId: string;
  status: 'PENDING_VERIFICATION' | 'PENDING_PAYMENT' | 'CONFIRMED' | 'PROCESSING' | 'READY_FOR_PICKUP' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';
  paymentStatus: 'UNPAID' | 'PAID' | 'FAILED';
  totalAmount: number;
  requiresPrescription: boolean;
  prescriptionUrl?: string | null;
  shippingAddress?: string | null;
  notes?: string | null;
  rejectionReason?: string | null;
  customer?: CustomerOrderSummary;
  itemCount: number;
  items: OrderItemData[];
  createdAt: string;
  updatedAt?: string;
}

export interface CheckoutPayload {
  shippingAddress?: string;
  notes?: string;
  prescriptionUrl?: string;
}

export interface UploadPrescriptionResponse {
  prescriptionUrl: string;
  fileName: string;
}

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('apotek_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const orderService = {
  /**
   * Process checkout from current customer's cart
   */
  async checkout(payload: CheckoutPayload): Promise<ApiResponse<{ order: OrderData }>> {
    const res = await fetch('/api/orders/checkout', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  /**
   * Get all orders for the current customer
   */
  async getMyOrders(): Promise<ApiResponse<{ orders: OrderData[]; total: number }>> {
    const res = await fetch('/api/orders', {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  /**
   * Get detail of a specific order by ID
   */
  async getOrderDetail(id: string): Promise<ApiResponse<{ order: OrderData }>> {
    const res = await fetch(`/api/orders/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  /**
   * Upload doctor's prescription file (PNG, JPG, WebP, PDF)
   */
  async uploadPrescription(file: File): Promise<ApiResponse<UploadPrescriptionResponse>> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const fileData = reader.result as string;
          const res = await fetch('/api/upload/prescription', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              fileName: file.name,
              fileType: file.type,
              fileData,
            }),
          });
          const json = await res.json();
          resolve(json);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Gagal membaca file resep.'));
      reader.readAsDataURL(file);
    });
  },

  /**
   * Simulate manual payment (mock payment)
   */
  async mockPayment(orderId: string): Promise<ApiResponse<{ orderId: string; paymentStatus: string; status: string }>> {
    const res = await fetch(`/api/orders/${orderId}/mock-pay`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return res.json();
  },
};
