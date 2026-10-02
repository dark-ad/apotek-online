import { ApiResponse } from '../server/types';

export interface AdminStats {
  totalMedicines: number;
  outOfStockMedicines: number;
  lowStockMedicines: number;
  totalCustomers: number;
  totalStaff: number;
  totalAdmins: number;
  totalOrders: number;
  pendingOrders: number;
  processingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
}

export interface AdminMedicine {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  description: string | null;
  price: number;
  stock: number;
  unit: string;
  requiresPrescription: boolean;
  image: string | null;
  isActive: boolean;
  orderCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminCategory {
  id: string;
  name: string;
  description: string | null;
  medicineCount: number;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'STAFF' | 'CUSTOMER';
  phone: string | null;
  address: string | null;
  isActive: boolean;
  orderCount: number;
  createdAt: string;
}

export interface AdminOrderItem {
  id: string;
  medicineName: string;
  unit: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface AdminOrder {
  id: string;
  shortId: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  requiresPrescription: boolean;
  prescriptionUrl: string | null;
  shippingAddress: string | null;
  notes: string | null;
  rejectionReason: string | null;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  items: AdminOrderItem[];
  createdAt: string;
}

export interface AdminTransaction {
  orderId: string;
  shortId: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  status: string;
  itemCount: number;
  paidAt: string;
}

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('apotek_auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const adminService = {
  // 1. Dashboard Stats
  async getStats(): Promise<ApiResponse<{ stats: AdminStats }>> {
    const res = await fetch('/api/admin/stats', {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // 2. Medicines CRUD
  async getMedicines(params?: {
    search?: string;
    category?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ medicines: AdminMedicine[]; pagination: any }>> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.category) query.append('category', params.category);
    if (params?.status) query.append('status', params.status);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));

    const res = await fetch(`/api/admin/medicines?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async createMedicine(data: {
    name: string;
    categoryId: string;
    description?: string;
    price: number;
    stock: number;
    unit: string;
    requiresPrescription: boolean;
    image?: string | null;
  }): Promise<ApiResponse<{ medicine: AdminMedicine }>> {
    const res = await fetch('/api/admin/medicines', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateMedicine(
    id: string,
    data: Partial<{
      name: string;
      categoryId: string;
      description: string | null;
      price: number;
      stock: number;
      unit: string;
      requiresPrescription: boolean;
      image: string | null;
      isActive: boolean;
    }>
  ): Promise<ApiResponse<{ medicine: AdminMedicine }>> {
    const res = await fetch(`/api/admin/medicines/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteMedicine(id: string): Promise<ApiResponse<{ softDeleted: boolean; id: string }>> {
    const res = await fetch(`/api/admin/medicines/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // 3. Categories CRUD
  async getCategories(): Promise<ApiResponse<{ categories: AdminCategory[] }>> {
    const res = await fetch('/api/admin/categories', {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async createCategory(data: {
    name: string;
    description?: string;
  }): Promise<ApiResponse<{ category: AdminCategory }>> {
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateCategory(
    id: string,
    data: { name: string; description?: string }
  ): Promise<ApiResponse<{ category: AdminCategory }>> {
    const res = await fetch(`/api/admin/categories/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteCategory(id: string): Promise<ApiResponse<void>> {
    const res = await fetch(`/api/admin/categories/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // 4. User Management
  async getUsers(params?: { role?: string; search?: string }): Promise<ApiResponse<{ users: AdminUser[] }>> {
    const query = new URLSearchParams();
    if (params?.role) query.append('role', params.role);
    if (params?.search) query.append('search', params.search);

    const res = await fetch(`/api/admin/users?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async updateUserRole(id: string, role: string): Promise<ApiResponse<{ user: AdminUser }>> {
    const res = await fetch(`/api/admin/users/${id}/role`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ role }),
    });
    return res.json();
  },

  async toggleUserStatus(id: string, isActive: boolean): Promise<ApiResponse<{ user: AdminUser }>> {
    const res = await fetch(`/api/admin/users/${id}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ isActive }),
    });
    return res.json();
  },

  // 5. Orders & Transactions
  async getOrders(params?: {
    status?: string;
    paymentStatus?: string;
    search?: string;
  }): Promise<ApiResponse<{ orders: AdminOrder[] }>> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.paymentStatus) query.append('paymentStatus', params.paymentStatus);
    if (params?.search) query.append('search', params.search);

    const res = await fetch(`/api/admin/orders?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async getTransactions(): Promise<ApiResponse<{
    totalRevenue: number;
    transactionCount: number;
    transactions: AdminTransaction[];
  }>> {
    const res = await fetch('/api/admin/transactions', {
      headers: getAuthHeaders(),
    });
    return res.json();
  },
};
