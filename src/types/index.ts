export type UserRole = 'pembeli' | 'staf' | 'admin';

export type MedicineCategory = 
  | 'obat-bebas'
  | 'obat-bebas-terbatas'
  | 'obat-keras'
  | 'vitamin-suplemen'
  | 'alat-kesehatan'
  | 'ibu-anak'
  | 'herbal';

export type MedicineGolongan = 'Hijau (Bebas)' | 'Biru (Bebas Terbatas)' | 'Merah K (Keras/Resep)' | 'Suplemen' | 'Alkes';

export interface Medicine {
  id: string;
  name: string;
  genericName?: string;
  category: MedicineCategory;
  golongan: MedicineGolongan;
  requiresPrescription: boolean;
  price: number;
  originalPrice?: number;
  unit: string; // e.g. "Strip (10 Tablet)", "Botol 60ml"
  stock: number;
  rating: number;
  reviewCount: number;
  description: string;
  dosage: string;
  indication: string;
  sideEffects?: string;
  image: string;
  badge?: string;
}

export interface CategoryInfo {
  id: MedicineCategory;
  name: string;
  description: string;
  iconName: string;
  itemCount: number;
  color: string;
}

export interface RoleInfo {
  role: UserRole;
  title: string;
  badgeLabel: string;
  description: string;
  primaryFeatures: string[];
  color: string;
}

export interface CartItem {
  medicine: Medicine;
  quantity: number;
}

export interface AIChatSample {
  symptom: string;
  recommendation: string;
  relatedMedicineId?: string;
  caution: string;
}
