// AI Assistant Service - calls server-side /api/ai/chat endpoint
// Connects to NVIDIA NIM LLM / Gemini / Database-backed Assistant

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isError?: boolean;
}

export interface AiChatResponse {
  success: boolean;
  data?: {
    reply: string;
    model: string;
    accessLevel?: 'FULL_ACCESS' | 'STAFF' | 'CUSTOMER' | 'GUEST';
  };
  message?: string;
}

export async function sendAiMessage(
  message: string,
  history: ChatMessage[]
): Promise<AiChatResponse> {
  const historyPayload = history
    .filter((msg) => !msg.isError)
    .map((msg) => ({
      role: msg.role,
      text: msg.text,
    }));

  const token = localStorage.getItem('apotek_auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers,
    body: JSON.stringify({ message, history: historyPayload }),
  });

  const data = await res.json();
  return data as AiChatResponse;
}

// Suggested quick prompts for the AI assistant (default / guest)
export const AI_QUICK_PROMPTS = [
  'Saya sedang demam dan sakit kepala, ada obat apa?',
  'Saya cari vitamin B, apakah tersedia?',
  'Apa saja obat yang membutuhkan resep dokter?',
  'Bagaimana alur pemesanan obat di website ini?',
];

export type AiUserRole = 'ADMIN' | 'STAFF' | 'CUSTOMER' | null | undefined;

/** Quick prompts yang disesuaikan dengan hak akses role. */
export function getAiQuickPrompts(role: AiUserRole): string[] {
  if (role === 'ADMIN') {
    return [
      'Tampilkan seluruh data pengguna apotek',
      'Ringkasan omzet, transaksi, dan pesanan terbaru',
      'Daftar pelanggan beserta jumlah pesanannya',
      'Obat apa yang stoknya menipis atau habis?',
    ];
  }
  if (role === 'STAFF') {
    return [
      'Tampilkan daftar pelanggan apotek',
      'Ada berapa pesanan yang menunggu verifikasi resep?',
      'Obat apa yang stoknya menipis atau habis?',
      'Saya cari Paracetamol, berapa stoknya?',
    ];
  }
  if (role === 'CUSTOMER') {
    return [
      'Saya sedang demam dan sakit kepala, ada obat apa?',
      'Saya cari vitamin B, apakah tersedia?',
      'Cek status pesanan terakhir saya',
      'Ada apa saja di keranjang belanja saya?',
    ];
  }
  return [
    'Saya sedang demam dan sakit kepala, ada obat apa?',
    'Saya cari vitamin B, apakah tersedia?',
    'Apa saja obat yang membutuhkan resep dokter?',
    'Bagaimana alur pemesanan obat di website ini?',
  ];
}

/** Label ringkas hak akses AI untuk ditampilkan di UI. */
export function getAiAccessLabel(role: AiUserRole): { label: string; color: string; description: string } {
  if (role === 'ADMIN') {
    return {
      label: 'Akses Penuh',
      color: '#f59e0b',
      description: 'ADMIN: seluruh katalog, data pengguna, pesanan, transaksi, dan operasional.',
    };
  }
  if (role === 'STAFF') {
    return {
      label: 'Akses Terbatas',
      color: '#38bdf8',
      description: 'STAFF: katalog, operasional, dan daftar pelanggan terbatas (kontak disamarkan).',
    };
  }
  if (role === 'CUSTOMER') {
    return {
      label: 'Konsultasi Obat',
      color: '#34d399',
      description: 'CUSTOMER: info obat, stok, harga, serta keranjang & pesanan milik sendiri.',
    };
  }
  return {
    label: 'Katalog Publik',
    color: '#94a3b8',
    description: 'TAMU: info katalog publik. Login untuk mengakses data pribadi Anda.',
  };
}

// Kemampuan akses data AI (ditampilkan sebagai badge di UI).
// Sumber kebenaran ada di src/server/aiDataAccess.ts + GET /api/ai/summary.
export const AI_DATA_CAPABILITIES = [
  '📦 Katalog live: nama, harga, stok, satuan, label resep',
  '🛒 Keranjang belanja Anda + total (saat login)',
  '📋 Riwayat pesanan + lacak kode #XXXXXXXX',
  '👤 Profil Anda: nama, email, alamat (saat login)',
  '👥 Daftar pelanggan terbatas (khusus Staff)',
  '📊 Data pengguna, omzet & transaksi lengkap (khusus Admin)',
];

export interface AiDataSummary {
  accessLevel?: 'FULL_ACCESS' | 'STAFF' | 'CUSTOMER' | 'GUEST';
  capabilities?: string[];
  catalog: {
    totalMedicines: number;
    totalCategories: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  cart: { itemCount: number; total: number } | null;
  recentOrders: Array<{ shortId: string; status: string; totalAmount: number }> | null;
  operational: {
    pendingVerification: number;
    processing: number;
    totalRevenuePaid: number | null;
  } | null;
  usersSummary?: { total?: number; customers?: number; staff?: number; admins?: number } | null;
}

export async function fetchAiDataSummary(): Promise<AiDataSummary | null> {
  try {
    const token = localStorage.getItem('apotek_auth_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch('/api/ai/summary', { headers });
    const data = await res.json();
    if (!data?.success) return null;
    return {
      accessLevel: data.data.accessLevel,
      capabilities: data.data.capabilities ?? [],
      catalog: data.data.catalog,
      cart: data.data.cart ?? null,
      recentOrders: data.data.recentOrders ?? null,
      operational: data.data.operational ?? null,
      usersSummary: data.data.usersSummary ?? null,
    };
  } catch {
    return null;
  }
}
