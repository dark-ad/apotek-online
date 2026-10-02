import { Medicine, CategoryInfo, RoleInfo, AIChatSample } from '../types';

export const CATEGORIES_DATA: CategoryInfo[] = [
  {
    id: 'obat-bebas',
    name: 'Obat Bebas',
    description: 'Dapat dibeli tanpa resep dokter (Lingkaran Hijau)',
    iconName: 'Pill',
    itemCount: 48,
    color: '#10b981'
  },
  {
    id: 'obat-bebas-terbatas',
    name: 'Bebas Terbatas',
    description: 'Obat dengan peringatan khusus (Lingkaran Biru)',
    iconName: 'AlertCircle',
    itemCount: 32,
    color: '#0284c7'
  },
  {
    id: 'obat-keras',
    name: 'Obat Keras & Resep',
    description: 'Wajib resep dokter & verifikasi Apoteker (Lingkaran Merah K)',
    iconName: 'FileText',
    itemCount: 65,
    color: '#ef4444'
  },
  {
    id: 'vitamin-suplemen',
    name: 'Vitamin & Suplemen',
    description: 'Meningkatkan daya tahan dan nutrisi harian',
    iconName: 'Sparkles',
    itemCount: 54,
    color: '#f59e0b'
  },
  {
    id: 'alat-kesehatan',
    name: 'Alat Kesehatan',
    description: 'Termometer, tensimeter, perban, & tensi',
    iconName: 'Activity',
    itemCount: 29,
    color: '#8b5cf6'
  },
  {
    id: 'ibu-anak',
    name: 'Ibu & Anak',
    description: 'Nutrisi bayi, minyak telon, & perlengkapan',
    iconName: 'HeartHandshake',
    itemCount: 38,
    color: '#ec4899'
  }
];

export const MEDICINES_DATA: Medicine[] = [
  {
    id: 'med-001',
    name: 'Paracetamol 500mg',
    genericName: 'Paracetamol / Acetaminophen',
    category: 'obat-bebas',
    golongan: 'Hijau (Bebas)',
    requiresPrescription: false,
    price: 6500,
    originalPrice: 8000,
    unit: 'Strip (10 Kaplet)',
    stock: 120,
    rating: 4.9,
    reviewCount: 230,
    description: 'Meredakan rasa sakit ringan hingga sedang seperti sakit kepala, sakit gigi, serta menurunkan demam.',
    dosage: 'Dewasa: 1-2 kaplet 3-4 kali sehari setelah makan.',
    indication: 'Analgesik & Antipiretik',
    sideEffects: 'Jarang terjadi pada dosis lazim. Hati-hati gangguan fungsi hati.',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80',
    badge: 'Terlaris'
  },
  {
    id: 'med-002',
    name: 'Amoxicillin 500mg',
    genericName: 'Amoxicillin Trihydrate',
    category: 'obat-keras',
    golongan: 'Merah K (Keras/Resep)',
    requiresPrescription: true,
    price: 14500,
    unit: 'Strip (10 Kapsul)',
    stock: 45,
    rating: 4.8,
    reviewCount: 95,
    description: 'Antibiotik spektrum luas untuk infeksi bakteri saluran pernapasan, telinga, kulit, dan saluran kemih.',
    dosage: 'Sesuai petunjuk dokter. Wajib dihabiskan untuk mencegah resistensi antibiotik.',
    indication: 'Infeksi bakteri rentan',
    sideEffects: 'Mual, diare ringan, reaksi alergi kulit.',
    image: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=500&auto=format&fit=crop&q=80',
    badge: 'Wajib Resep'
  },
  {
    id: 'med-003',
    name: 'Antasida DOEN Kunyah',
    genericName: 'Aluminium Hydroxide & Magnesium Hydroxide',
    category: 'obat-bebas',
    golongan: 'Hijau (Bebas)',
    requiresPrescription: false,
    price: 4500,
    unit: 'Strip (10 Tablet Kunyah)',
    stock: 210,
    rating: 4.9,
    reviewCount: 312,
    description: 'Mengurangi gejala hiperasiditas lambung seperti maag, nyeri ulu hati, kembung, dan rasa perih di lambung.',
    dosage: 'Kunyah 1-2 tablet 1 jam sebelum makan atau 2 jam setelah makan.',
    indication: 'Asam lambung, gastritis, tukak lambung',
    sideEffects: 'Konstipasi ringan atau diare ringan.',
    image: 'https://images.unsplash.com/photo-1550572017-edd951aa8f72?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'med-004',
    name: 'Vitamin C 1000mg + Zinc',
    genericName: 'Ascorbic Acid + Zinc Complex',
    category: 'vitamin-suplemen',
    golongan: 'Suplemen',
    requiresPrescription: false,
    price: 42000,
    originalPrice: 50000,
    unit: 'Tube (10 Tablet Effervescent)',
    stock: 85,
    rating: 5.0,
    reviewCount: 184,
    description: 'Suplemen effervescent kaya antioksidan untuk memelihara daya tahan tubuh dan mempercepat pemulihan.',
    dosage: '1 tablet dilarutkan dalam segelas air (200ml) per hari.',
    indication: 'Defisiensi Vitamin C dan Zinc',
    image: 'https://images.unsplash.com/photo-1577401239170-897942555fb3?w=500&auto=format&fit=crop&q=80',
    badge: 'Promo 15%'
  },
  {
    id: 'med-005',
    name: 'Cetirizine HCl 10mg',
    genericName: 'Cetirizine Dihydrochloride',
    category: 'obat-bebas-terbatas',
    golongan: 'Biru (Bebas Terbatas)',
    requiresPrescription: false,
    price: 9000,
    unit: 'Strip (10 Tablet)',
    stock: 95,
    rating: 4.7,
    reviewCount: 140,
    description: 'Antihistamin generasi kedua untuk mengatasi rinitis alergi, bersin-bersin, biduran, dan gatal-gatal.',
    dosage: 'Dewasa & anak >12 thn: 1 tablet (10mg) sekali sehari pada malam hari.',
    indication: 'Gejala alergi & urtikaria',
    sideEffects: 'Mengantuk ringan pada sebagian orang.',
    image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'med-006',
    name: 'Omeprazole 20mg',
    genericName: 'Omeprazole',
    category: 'obat-keras',
    golongan: 'Merah K (Keras/Resep)',
    requiresPrescription: true,
    price: 18000,
    unit: 'Strip (10 Kapsul Lepas Tunda)',
    stock: 60,
    rating: 4.8,
    reviewCount: 110,
    description: 'Penghambat pompa proton (PPI) untuk mengobati GERD, refluks asam parah, dan tukak duodenum.',
    dosage: '1 kapsul per hari sebelum makan pagi (sesuai instruksi dokter).',
    indication: 'GERD, peptic ulcer',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80',
    badge: 'Wajib Resep'
  },
  {
    id: 'med-007',
    name: 'Minyak Kayu Putih Cajuput 120ml',
    genericName: 'Oleum Cajuputi 100%',
    category: 'herbal',
    golongan: 'Hijau (Bebas)',
    requiresPrescription: false,
    price: 36000,
    unit: 'Botol 120ml',
    stock: 140,
    rating: 4.9,
    reviewCount: 420,
    description: 'Minyak alami berkhasiat menghangatkan tubuh, meredakan masuk angin, perut kembung, dan gigitan serangga.',
    dosage: 'Oleskan secukupnya pada dada, perut, punggung, atau bagian yang sakit.',
    indication: 'Masuk angin, pegal, kembung',
    image: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'med-008',
    name: 'Digital Infrared Thermometer',
    genericName: 'Non-Contact Infrared Body Thermometer',
    category: 'alat-kesehatan',
    golongan: 'Alkes',
    requiresPrescription: false,
    price: 125000,
    originalPrice: 160000,
    unit: '1 Unit Box',
    stock: 30,
    rating: 4.9,
    reviewCount: 88,
    description: 'Termometer tembak digital presisi tinggi dengan respon 1 detik, layar LCD backlight, dan alarm demam.',
    dosage: 'Arahkan sensor ke dahi dengan jarak 3-5 cm, lalu tekan trigger.',
    indication: 'Pengukuran suhu tubuh akurat',
    image: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=500&auto=format&fit=crop&q=80',
    badge: 'Alkes Teruji'
  }
];

export const ROLE_DATA: RoleInfo[] = [
  {
    role: 'pembeli',
    title: 'Pembeli / Pasien',
    badgeLabel: 'Buyer Portal',
    description: 'Kemudahan akses obat terpercaya, rekomendasi gejala berbasis AI, dan upload resep dokter langsung dari rumah.',
    primaryFeatures: [
      'Pencarian cerdas & filter golongan obat',
      'AI Health Assistant analisa gejala awal',
      'Upload foto resep untuk verifikasi Apoteker',
      'Keranjang belanja & checkout aman',
      'Pelacakan status pesanan real-time'
    ],
    color: '#10b981'
  },
  {
    role: 'staf',
    title: 'Staf Apotek & Apoteker',
    badgeLabel: 'Pharmacy Staff',
    description: 'Pusat operasional apotek untuk validasi resep dokter, penyesuaian stok obat, dan pengelolaan packing pesanan.',
    primaryFeatures: [
      'Verifikasi keabsahan & dosis resep dokter',
      'Manajemen stok obat & batch kadaluarsa',
      'Update status pemrosesan & pengiriman',
      'Pemberian catatan dan etiket pemakaian obat',
      'Laporan keluar-masuk obat harian'
    ],
    color: '#0284c7'
  },
  {
    role: 'admin',
    title: 'Administrator Apotek',
    badgeLabel: 'Master Admin',
    description: 'Kendali penuh atas performa bisnis apotek, manajemen hak akses multi-role, analitik omset, dan audit log AI.',
    primaryFeatures: [
      'Dashboard analitik penjualan & inventaris',
      'Manajemen akun staf apotek & pembeli',
      'Konfigurasi master katalog & kategori',
      'Audit log transaksi & riwayat sistem AI',
      'Ekspor laporan keuangan & kepatuhan BPOM'
    ],
    color: '#8b5cf6'
  }
];

export const AI_CHAT_SAMPLES: AIChatSample[] = [
  {
    symptom: 'Demam sejak semalam, pusing ringan di kening, suhu 38.2°C.',
    recommendation: 'Berdasarkan gejala demam dan sakit kepala ringan, Anda dapat menggunakan antipiretik seperti Paracetamol 500mg (3x sehari setelah makan). Pastikan minum air putih minimal 2 liter dan istirahat cukup.',
    relatedMedicineId: 'med-001',
    caution: 'Catatan AI: Jika demam tidak turun dalam 3 hari atau timbul gejala sesak/bintik merah, segera konsultasikan langsung ke dokter.'
  },
  {
    symptom: 'Perut terasa perih melilit, kembung dan mual sehabis telat makan.',
    recommendation: 'Gejala mengarah pada peningkatan asam lambung atau dispepsia ringan. Antasida DOEN tablet kunyah dapat membantu menetralkan kelebihan asam dengan cepat.',
    relatedMedicineId: 'med-003',
    caution: 'Catatan AI: Kunyah tablet hingga halus 1 jam sebelum atau 2 jam setelah makan. Hindari kopi, makanan asam dan pedas.'
  },
  {
    symptom: 'Hidung meler bersin terus-menerus di pagi hari dan mata gatal.',
    recommendation: 'Gejala tersebut umum terjadi pada rinitis alergi. Antihistamin seperti Cetirizine 10mg dapat membantu meredakan reaksi histamin.',
    relatedMedicineId: 'med-005',
    caution: 'Catatan AI: Minum 1 kali sehari, disarankan malam hari sebelum tidur karena dapat menyebabkan efek kantuk ringan.'
  }
];
