export interface DbCategory {
  id: string;
  name: string;
  description?: string | null;
  medicineCount?: number;
}

export interface DbMedicine {
  id: string;
  name: string;
  categoryId: string;
  category?: {
    id: string;
    name: string;
    description?: string | null;
  };
  description: string | null;
  price: number;
  stock: number;
  unit: string;
  requiresPrescription: boolean;
  image: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface MedicinesResponse {
  medicines: DbMedicine[];
  pagination: PaginationMeta;
}

export interface FetchMedicinesParams {
  search?: string;
  category?: string;
  prescription?: 'all' | 'true' | 'false';
  sort?: 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc' | 'stock_asc' | 'stock_desc';
  page?: number;
  limit?: number;
}

/**
 * Service to fetch medicines from REST API
 */
export async function fetchMedicines(params: FetchMedicinesParams = {}): Promise<MedicinesResponse> {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.category && params.category !== 'all') query.set('category', params.category);
  if (params.prescription && params.prescription !== 'all') query.set('prescription', params.prescription);
  if (params.sort) query.set('sort', params.sort);
  if (params.page) query.set('page', params.page.toString());
  if (params.limit) query.set('limit', params.limit.toString());

  const res = await fetch(`/api/medicines?${query.toString()}`);
  if (!res.ok) {
    throw new Error(`Gagal memuat katalog obat (HTTP ${res.status})`);
  }
  const json = await res.json();
  if (!json.success || !json.data) {
    throw new Error(json.message || 'Gagal memuat katalog obat');
  }
  return json.data;
}

/**
 * Service to fetch single medicine detail by ID
 */
export async function fetchMedicineById(id: string): Promise<DbMedicine> {
  const res = await fetch(`/api/medicines/${encodeURIComponent(id)}`);
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('Obat tidak ditemukan dalam katalog.');
    }
    throw new Error(`Gagal memuat detail obat (HTTP ${res.status})`);
  }
  const json = await res.json();
  if (!json.success || !json.data?.medicine) {
    throw new Error(json.message || 'Gagal memuat detail obat');
  }
  return json.data.medicine;
}

/**
 * Service to fetch all medicine categories
 */
export async function fetchCategories(): Promise<DbCategory[]> {
  const res = await fetch('/api/categories');
  if (!res.ok) {
    throw new Error(`Gagal memuat kategori (HTTP ${res.status})`);
  }
  const json = await res.json();
  if (!json.success || !json.data?.categories) {
    throw new Error(json.message || 'Gagal memuat kategori');
  }
  return json.data.categories;
}
