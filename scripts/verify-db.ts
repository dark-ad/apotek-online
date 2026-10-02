import { PrismaClient } from '@prisma/client';
import { validateUser, validateMedicine, validateOrder } from '../src/lib/validations';

const prisma = new PrismaClient();

async function runVerification() {
  console.log('🧪 Memulai Verifikasi Komprehensif Database & Data Model...\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
    }
  }

  try {
    // ----------------------------------------------------
    // TEST 1: Verifikasi Entitas User & 3 Roles
    // ----------------------------------------------------
    console.log('1️⃣ Menguji Entitas User & 3 Roles:');
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
    });
    assert(users.length === 3, `Ditemukan 3 user (hasil: ${users.length})`);

    const admin = users.find((u) => u.role === 'ADMIN');
    const staff = users.find((u) => u.role === 'STAFF');
    const customer = users.find((u) => u.role === 'CUSTOMER');

    assert(!!admin && admin.email === 'admin@apoteksehat-ai.com', 'Admin user terdaftar dengan role ADMIN');
    assert(!!staff && staff.email === 'staff.apoteker@apoteksehat-ai.com', 'Staff user terdaftar dengan role STAFF');
    assert(!!customer && customer.email === 'budi.santoso@gmail.com', 'Customer user terdaftar dengan role CUSTOMER');

    // ----------------------------------------------------
    // TEST 2: Verifikasi Master Kategori & Relasi ke Obat
    // ----------------------------------------------------
    console.log('\n2️⃣ Menguji Relasi Category -> Medicine (1 to Many):');
    const categories = await prisma.category.findMany({
      include: {
        medicines: true,
      },
    });
    assert(categories.length >= 5, `Ditemukan master kategori obat (hasil: ${categories.length})`);

    const obatBebasCat = categories.find((c) => c.name === 'Obat Bebas');
    assert(
      !!obatBebasCat && obatBebasCat.medicines.length >= 2,
      `Kategori 'Obat Bebas' memiliki ${obatBebasCat?.medicines.length || 0} obat terhubung`
    );

    // ----------------------------------------------------
    // TEST 3: Verifikasi Entitas Medicine & Relasi ke Category
    // ----------------------------------------------------
    console.log('\n3️⃣ Menguji Entitas Medicine & Filter Resep:');
    const medicines = await prisma.medicine.findMany({
      include: {
        category: true,
      },
    });
    assert(medicines.length >= 7, `Ditemukan 7 obat di katalog (hasil: ${medicines.length})`);

    const prescriptionMeds = medicines.filter((m) => m.requiresPrescription);
    assert(
      prescriptionMeds.length >= 2,
      `Filter obat wajib resep dokter berfungsi (${prescriptionMeds.map((m) => m.name).join(', ')})`
    );

    // ----------------------------------------------------
    // TEST 4: Verifikasi Relasi Order -> User, OrderItem -> Medicine
    // ----------------------------------------------------
    console.log('\n4️⃣ Menguji Relasi Order & OrderItem (Deep Nested Join):');
    const orders = await prisma.order.findMany({
      include: {
        customer: true,
        items: {
          include: {
            medicine: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    assert(orders.length >= 2, `Ditemukan ${orders.length} pesanan terdaftar`);

    const order1 = orders[0];
    assert(
      !!order1 && order1.customer.name === 'Budi Santoso',
      `Order #${order1?.id.slice(-6)} terhubung ke Customer: ${order1?.customer.name}`
    );
    assert(
      order1.items.length === 2,
      `Order #${order1?.id.slice(-6)} memiliki ${order1.items.length} rincian item obat`
    );

    const calculatedTotal = order1.items.reduce((sum, it) => sum + it.subtotal, 0);
    assert(
      calculatedTotal === order1.totalAmount,
      `Total amount kalkulasi cocok (Rp${calculatedTotal.toLocaleString('id-ID')})`
    );

    // ----------------------------------------------------
    // TEST 5: Verifikasi Layer Validasi Data (validations.ts)
    // ----------------------------------------------------
    console.log('\n5️⃣ Menguji Layer Validasi Data (Input Validation):');
    
    // User validation test
    const validUserRes = validateUser({
      name: 'Dr. Hendra',
      email: 'dr.hendra@hospital.com',
      role: 'STAFF',
    });
    assert(validUserRes.success, 'Validasi User yang valid berhasil lolos');

    const invalidUserRes = validateUser({
      name: '',
      email: 'bukan-email',
      role: 'SUPERADMIN' as any,
    });
    assert(!invalidUserRes.success && !!invalidUserRes.errors?.email, 'Validasi User menolak format email & nama tidak valid');

    // Medicine validation test
    const validMedRes = validateMedicine({
      name: 'Betadine Antiseptic 60ml',
      categoryId: obatBebasCat?.id || 'cat-123',
      price: 25000,
      stock: 50,
      unit: 'Botol 60ml',
    });
    assert(validMedRes.success, 'Validasi Medicine yang valid berhasil lolos');

    const invalidMedRes = validateMedicine({
      name: 'X',
      categoryId: '',
      price: -5000,
      stock: -1,
      unit: '',
    });
    assert(!invalidMedRes.success && !!invalidMedRes.errors?.price, 'Validasi Medicine menolak harga negatif & stok minus');

    // Order validation test
    const orderValRes = validateOrder({
      customerId: customer?.id || 'cust-123',
      items: [
        { medicineId: medicines[0].id, quantity: 3, price: 6500 },
        { medicineId: medicines[1].id, quantity: 1, price: 14500 },
      ],
    });
    assert(
      orderValRes.success && orderValRes.data?.totalAmount === 3 * 6500 + 14500,
      `Validasi Order menghitung subtotal & total otomatis (Total: Rp${orderValRes.data?.totalAmount.toLocaleString('id-ID')})`
    );

    // ----------------------------------------------------
    // Ringkasan Hasil
    // ----------------------------------------------------
    console.log('\n========================================');
    console.log(`📊 Hasil Pengujian: ${passedTests} / ${totalTests} Pengujian Berhasil Lolos.`);
    console.log('========================================\n');

    if (passedTests === totalTests) {
      console.log('🎉 SELURUH SKEMA DATABASE & DATA MODEL BERJALAN SEMPURNA DENGAN 0 ERROR!');
    }
  } catch (err) {
    console.error('❌ Terjadi error saat pengujian database:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runVerification();
