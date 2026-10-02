import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/server/auth';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Memulai proses seeding database Apotek Online + AI dengan Bcrypt Hashing...');

  // 1. Bersihkan data lama dengan urutan referensial yang aman
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.medicine.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Data tabel lama berhasil dibersihkan.');

  // Hash secure password default: "password123"
  const secureHashedPassword = await hashPassword('password123');

  // 2. Buat User untuk 3 Role: ADMIN, STAFF, CUSTOMER dengan Secure Hashed Password
  const adminUser = await prisma.user.create({
    data: {
      name: 'Administrator Apotek',
      email: 'admin@apoteksehat-ai.com',
      password: secureHashedPassword,
      phone: '081211112222',
      address: 'Kantor Pusat Apotek Sehat AI, Lt. 3, Jakarta',
      role: 'ADMIN',
    },
  });

  const staffUser = await prisma.user.create({
    data: {
      name: 'Apt. Sarah Rahmawati, S.Farm.',
      email: 'staff.apoteker@apoteksehat-ai.com',
      password: secureHashedPassword,
      phone: '081233334444',
      address: 'Instalasi Farmasi Apotek Sehat AI, Jakarta Selatan',
      role: 'STAFF',
    },
  });

  const customerUser = await prisma.user.create({
    data: {
      name: 'Budi Santoso',
      email: 'budi.santoso@gmail.com',
      password: secureHashedPassword,
      phone: '081255556666',
      address: 'Jl. Melati No. 12, Tebet, Jakarta Selatan',
      role: 'CUSTOMER',
    },
  });

  console.log('👤 Berhasil membuat 3 User dengan Hashed Password:');
  console.log(`   - Admin   : ${adminUser.email} (Role: ${adminUser.role})`);
  console.log(`   - Staff   : ${staffUser.email} (Role: ${staffUser.role})`);
  console.log(`   - Customer: ${customerUser.email} (Role: ${customerUser.role})`);

  // 3. Buat Kategori Obat
  const catBebas = await prisma.category.create({
    data: {
      name: 'Obat Bebas',
      description: 'Obat yang dapat dibeli bebas tanpa resep dokter (Tanda Lingkaran Hijau).',
    },
  });

  const catBebasTerbatas = await prisma.category.create({
    data: {
      name: 'Obat Bebas Terbatas',
      description: 'Obat keras dengan batasan jumlah dan peringatan khusus (Tanda Lingkaran Biru).',
    },
  });

  const catKeras = await prisma.category.create({
    data: {
      name: 'Obat Keras & Resep',
      description: 'Obat yang wajib ditebus dengan resep dokter dan verifikasi Apoteker (Tanda Lingkaran Merah K).',
    },
  });

  const catVitamin = await prisma.category.create({
    data: {
      name: 'Vitamin & Suplemen',
      description: 'Suplemen daya tahan tubuh, vitamin harian, dan nutrisi kesehatan.',
    },
  });

  const catAlkes = await prisma.category.create({
    data: {
      name: 'Alat Kesehatan',
      description: 'Peralatan medis diagnostik, termometer, perban, dan perlengkapan P3K.',
    },
  });

  console.log('🏷️ Berhasil membuat 5 Master Kategori Obat.');

  // 4. Buat Master Obat (Medicines)
  const medParacetamol = await prisma.medicine.create({
    data: {
      name: 'Paracetamol 500mg',
      categoryId: catBebas.id,
      description: 'Analgesik dan antipiretik untuk meredakan sakit kepala, sakit gigi, dan menurunkan demam.',
      price: 6500,
      stock: 150,
      unit: 'Strip (10 Kaplet)',
      requiresPrescription: false,
      image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80',
    },
  });

  const medAmoxicillin = await prisma.medicine.create({
    data: {
      name: 'Amoxicillin 500mg',
      categoryId: catKeras.id,
      description: 'Antibiotik spektrum luas untuk infeksi bakteri saluran pernapasan, telinga, kulit, dan kemih.',
      price: 14500,
      stock: 50,
      unit: 'Strip (10 Kapsul)',
      requiresPrescription: true,
      image: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=500&auto=format&fit=crop&q=80',
    },
  });

  const medAntasida = await prisma.medicine.create({
    data: {
      name: 'Antasida DOEN Kunyah',
      categoryId: catBebas.id,
      description: 'Menetralkan asam lambung, meredakan maag, nyeri ulu hati, dan kembung.',
      price: 4500,
      stock: 200,
      unit: 'Strip (10 Tablet)',
      requiresPrescription: false,
      image: 'https://images.unsplash.com/photo-1550572017-edd951aa8f72?w=500&auto=format&fit=crop&q=80',
    },
  });

  const medVitC = await prisma.medicine.create({
    data: {
      name: 'Vitamin C 1000mg + Zinc Effervescent',
      categoryId: catVitamin.id,
      description: 'Suplemen effervescent kaya antioksidan untuk memelihara daya tahan tubuh.',
      price: 42000,
      stock: 80,
      unit: 'Tube (10 Tablet)',
      requiresPrescription: false,
      image: 'https://images.unsplash.com/photo-1577401239170-897942555fb3?w=500&auto=format&fit=crop&q=80',
    },
  });

  const medCetirizine = await prisma.medicine.create({
    data: {
      name: 'Cetirizine HCl 10mg',
      categoryId: catBebasTerbatas.id,
      description: 'Antihistamin untuk mengatasi rinitis alergi, bersin-bersin, gatal, dan biduran.',
      price: 9000,
      stock: 110,
      unit: 'Strip (10 Tablet)',
      requiresPrescription: false,
      image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=500&auto=format&fit=crop&q=80',
    },
  });

  const medOmeprazole = await prisma.medicine.create({
    data: {
      name: 'Omeprazole 20mg',
      categoryId: catKeras.id,
      description: 'Penghambat pompa asam lambung (PPI) untuk GERD dan tukak lambung.',
      price: 18000,
      stock: 65,
      unit: 'Strip (10 Kapsul)',
      requiresPrescription: true,
      image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80',
    },
  });

  const medThermo = await prisma.medicine.create({
    data: {
      name: 'Digital Infrared Thermometer',
      categoryId: catAlkes.id,
      description: 'Termometer dahi nirsentuh akurat dengan layar LCD dan respon 1 detik.',
      price: 125000,
      stock: 35,
      unit: '1 Unit Box',
      requiresPrescription: false,
      image: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=500&auto=format&fit=crop&q=80',
    },
  });

  // Produk dengan Stok = 0 (Khusus pengujian status "Stok Habis" & batasan kuantitas)
  const medAmoxSirup = await prisma.medicine.create({
    data: {
      name: 'Amoxicillin Sirup Kering 125mg/5ml',
      categoryId: catKeras.id,
      description: 'Suspensi antibiotik amoxicillin untuk anak-anak dengan infeksi bakteri saluran nafas.',
      price: 18500,
      stock: 0, // STOK HABIS
      unit: 'Botol 60ml',
      requiresPrescription: true, // Memerlukan Resep
      image: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=500&auto=format&fit=crop&q=80',
    },
  });

  const medIbuprofen = await prisma.medicine.create({
    data: {
      name: 'Ibuprofen 400mg',
      categoryId: catBebasTerbatas.id,
      description: 'Antiinflamasi nonsteroid (OAINS) untuk pereda nyeri peradangan dan sakit sendi.',
      price: 8500,
      stock: 0, // STOK HABIS
      unit: 'Strip (10 Tablet)',
      requiresPrescription: false,
      image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80',
    },
  });

  const medBetadine = await prisma.medicine.create({
    data: {
      name: 'Povidone Iodine Antiseptik 60ml',
      categoryId: catBebasTerbatas.id,
      description: 'Cairan antiseptik pembersih dan pencegah infeksi pada luka lecet dan luka bakar ringan.',
      price: 26000,
      stock: 45,
      unit: 'Botol 60ml',
      requiresPrescription: false,
      image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80',
    },
  });

  const medMasker = await prisma.medicine.create({
    data: {
      name: 'Masker Medis 3-Ply Bedah BFE 99%',
      categoryId: catAlkes.id,
      description: 'Masker bedah 3 lapis proteksi droplet dan filtrasi bakteri bersertifikasi Kemenkes RI.',
      price: 35000,
      stock: 90,
      unit: 'Box (50 Pcs)',
      requiresPrescription: false,
      image: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=500&auto=format&fit=crop&q=80',
    },
  });

  const medKayuPutih = await prisma.medicine.create({
    data: {
      name: 'Minyak Kayu Putih Murni 120ml',
      categoryId: catBebas.id,
      description: 'Meredakan masuk angin, perut kembung, menghangatkan tubuh, dan meredakan gatal gigitan serangga.',
      price: 38000,
      stock: 60,
      unit: 'Botol 120ml',
      requiresPrescription: false,
      image: 'https://images.unsplash.com/photo-1550572017-edd951aa8f72?w=500&auto=format&fit=crop&q=80',
    },
  });

  console.log('💊 Berhasil membuat 12 Master Produk Obat & Alkes (termasuk 2 produk dengan Stok = 0).');

  // 5. Buat Sampel Order & OrderItem
  const order1 = await prisma.order.create({
    data: {
      customerId: customerUser.id,
      totalAmount: 6500 * 2 + 42000 * 1,
      status: 'CONFIRMED',
      paymentStatus: 'PAID',
      notes: 'Tolong diantar sebelum jam 17:00 WIB, terima kasih.',
      items: {
        create: [
          {
            medicineId: medParacetamol.id,
            quantity: 2,
            price: 6500,
            subtotal: 13000,
          },
          {
            medicineId: medVitC.id,
            quantity: 1,
            price: 42000,
            subtotal: 42000,
          },
        ],
      },
    },
  });

  const order2 = await prisma.order.create({
    data: {
      customerId: customerUser.id,
      totalAmount: 14500 * 1 + 18000 * 1,
      status: 'PROCESSING',
      paymentStatus: 'PAID',
      prescriptionUrl: 'https://storage.apoteksehat-ai.com/prescriptions/resep-dr-anwar-2026.jpg',
      notes: 'Resep dari Dr. Anwar Sp.PD, pasien ada riwayat maag.',
      items: {
        create: [
          {
            medicineId: medAmoxicillin.id,
            quantity: 1,
            price: 14500,
            subtotal: 14500,
          },
          {
            medicineId: medOmeprazole.id,
            quantity: 1,
            price: 18000,
            subtotal: 18000,
          },
        ],
      },
    },
  });

  console.log(`📦 Berhasil membuat 2 Sampel Order:`);
  console.log(`   - Order #1: ID ${order1.id}`);
  console.log(`   - Order #2: ID ${order2.id}`);

  console.log('✅ Seeding database selesai 100% dengan Bcrypt Hashed Passwords!');
}

main()
  .catch((e) => {
    console.error('❌ Gagal menjalankan seed data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
