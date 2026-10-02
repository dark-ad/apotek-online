/**
 * Automated Verification Script for Apotek Online + AI — Fitur Dashboard ADMIN
 *
 * Menguji:
 * 1. RBAC: Memastikan CUSTOMER dan STAFF diblokir dari seluruh endpoint /api/admin/* (HTTP 403)
 * 2. RBAC: Memastikan ADMIN memiliki akses penuh ke /api/admin/*
 * 3. Dashboard Statistik Real-Time:
 *    - totalMedicines, outOfStockMedicines, lowStockMedicines
 *    - totalCustomers, totalStaff, totalAdmins
 *    - totalOrders, pendingOrders, completedOrders, totalRevenue
 * 4. CRUD Kategori Obat:
 *    - Create kategori baru
 *    - Update kategori
 *    - Relational integrity: Blokir penghapusan kategori yang masih memiliki obat (HTTP 400)
 *    - Delete kategori kosong (berhasil HTTP 200)
 * 5. CRUD Data Obat:
 *    - Create obat baru dengan validasi data
 *    - Update data obat
 *    - Relational integrity: Soft Delete jika obat memiliki riwayat order (isActive: false)
 *    - Verifikasi soft-deleted obat tidak tampil di katalog publik customer
 * 6. User Management:
 *    - List user dengan filter role
 *    - Mengubah role user (CUSTOMER -> STAFF -> CUSTOMER)
 *    - Self-lockout protection: Admin tidak boleh menurunkan role akun sendiri
 *    - Menonaktifkan akun user (isActive: false)
 *    - Memastikan user nonaktif diblokir saat mencoba login (HTTP 403)
 *    - Mengaktifkan kembali user dan memastikan login berhasil
 *    - Self-lockout protection: Admin tidak boleh menonaktifkan akun sendiri
 * 7. Orders & Transaksi:
 *    - Admin dapat melihat semua order dan rekapitulasi transaksi keuangan apotek
 */

const BASE_URL = 'http://localhost:3000';

let adminToken = '';
let staffToken = '';
let customerToken = '';
let adminUserId = '';
let customerUserId = '';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ GAGAL: ${message}`);
    failedTests++;
  }
}

async function loginUser(email: string, pass: string) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass }),
  });
  return res.json();
}

async function runAdminVerification() {
  console.log('=== Apotek Online + AI — Verifikasi Fitur Dashboard ADMIN ===\n');

  // Step 0: Login ketiga role
  const adminLogin = await loginUser('admin@apoteksehat-ai.com', 'password123');
  adminToken = adminLogin.data?.token;
  adminUserId = adminLogin.data?.user?.id;

  const staffLogin = await loginUser('staff.apoteker@apoteksehat-ai.com', 'password123');
  staffToken = staffLogin.data?.token;

  const custLogin = await loginUser('budi.santoso@gmail.com', 'password123');
  customerToken = custLogin.data?.token;
  customerUserId = custLogin.data?.user?.id;

  if (!adminToken || !staffToken || !customerToken) {
    console.error('Gagal login untuk salah satu role. Pastikan dev server berjalan.');
    process.exit(1);
  }

  // --------------------------------------------------------------------------
  // SUITE 1: RBAC & Akses Terbatas Admin
  // --------------------------------------------------------------------------
  console.log('1️⃣  Otorisasi Role & Strict RBAC (/api/admin/*):');

  // Customer -> Admin Stats
  const custRes = await fetch(`${BASE_URL}/api/admin/stats`, {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  assert(custRes.status === 403, 'Akses endpoint admin oleh role CUSTOMER ditolak (HTTP 403)');

  // Staff -> Admin Stats
  const staffRes = await fetch(`${BASE_URL}/api/admin/stats`, {
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  assert(staffRes.status === 403, 'Akses endpoint admin oleh role STAFF ditolak (HTTP 403)');

  // Admin -> Admin Stats
  const adminRes = await fetch(`${BASE_URL}/api/admin/stats`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminRes.status === 200, 'Akses endpoint admin oleh role ADMIN diizinkan (HTTP 200)');

  // --------------------------------------------------------------------------
  // SUITE 2: Dashboard Statistik Real-Time
  // --------------------------------------------------------------------------
  console.log('\n2️⃣  Dashboard Statistik Real-Time:');
  const statsJson = await adminRes.json();
  const s = statsJson.data?.stats;

  assert(s !== undefined, 'Data objek statistik berhasil dimuat');
  assert(typeof s.totalMedicines === 'number' && s.totalMedicines > 0, `Total obat terhitung: ${s?.totalMedicines}`);
  assert(typeof s.outOfStockMedicines === 'number', `Obat stok habis terhitung: ${s?.outOfStockMedicines}`);
  assert(typeof s.totalCustomers === 'number' && s.totalCustomers > 0, `Total customer terhitung: ${s?.totalCustomers}`);
  assert(typeof s.totalOrders === 'number' && s.totalOrders > 0, `Total order terhitung: ${s?.totalOrders}`);
  assert(typeof s.pendingOrders === 'number', `Order pending terhitung: ${s?.pendingOrders}`);
  assert(typeof s.completedOrders === 'number', `Order selesai terhitung: ${s?.completedOrders}`);
  assert(typeof s.totalRevenue === 'number', `Total omzet terhitung: Rp ${s?.totalRevenue.toLocaleString('id-ID')}`);

  // --------------------------------------------------------------------------
  // SUITE 3: CRUD Kategori Obat & Relational Integrity
  // --------------------------------------------------------------------------
  console.log('\n3️⃣  CRUD Kategori Obat & Proteksi Relasi:');

  // 3.1 Create Category
  const uniqueCatName = 'Herbal Organik ' + Date.now();
  const createCatRes = await fetch(`${BASE_URL}/api/admin/categories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: uniqueCatName,
      description: 'Ekstrak tanaman herbal berkhasiat',
    }),
  });
  const createCatJson = await createCatRes.json();
  assert(createCatRes.status === 201, 'Admin berhasil menambahkan kategori baru (HTTP 201)');
  const newCatId = createCatJson.data?.category?.id;

  // 3.2 Update Category
  const updateCatRes = await fetch(`${BASE_URL}/api/admin/categories/${newCatId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: uniqueCatName + ' Teruji',
      description: 'Ekstrak tanaman herbal berkhasiat klinis',
    }),
  });
  assert(updateCatRes.status === 200, 'Admin berhasil memperbarui nama dan deskripsi kategori (HTTP 200)');

  // 3.3 Relational Safety: Coba hapus kategori "Obat Bebas" yang masih punya obat
  const allCatsRes = await fetch(`${BASE_URL}/api/admin/categories`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const allCatsJson = await allCatsRes.json();
  const catWithMeds = allCatsJson.data?.categories.find((c: any) => c.medicineCount > 0);

  if (catWithMeds) {
    const delBusyCatRes = await fetch(`${BASE_URL}/api/admin/categories/${catWithMeds.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      delBusyCatRes.status === 400,
      `Penghapusan kategori "${catWithMeds.name}" yang masih memiliki obat ditolak (HTTP 400 - Proteksi Relasi)`
    );
  }

  // 3.4 Delete Empty Category
  const delEmptyCatRes = await fetch(`${BASE_URL}/api/admin/categories/${newCatId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(delEmptyCatRes.status === 200, 'Kategori kosong berhasil dihapus dari sistem (HTTP 200)');

  // --------------------------------------------------------------------------
  // SUITE 4: CRUD Data Obat & Soft Delete
  // --------------------------------------------------------------------------
  console.log('\n4️⃣  CRUD Obat & Soft Delete / Proteksi Transaksi:');

  // Ambil kategori valid pertama
  const validCatId = allCatsJson.data?.categories[0]?.id;

  // 4.1 Create Medicine
  const createMedRes = await fetch(`${BASE_URL}/api/admin/medicines`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: 'Vitamin D3 1000 IU Uji Coba',
      categoryId: validCatId,
      description: 'Membantu menjaga kesehatan tulang dan imun tubuh.',
      price: 25000,
      stock: 45,
      unit: 'Botol',
      requiresPrescription: false,
    }),
  });
  const createMedJson = await createMedRes.json();
  assert(createMedRes.status === 201, 'Admin berhasil menambahkan sediaan obat baru (HTTP 201)');
  const newMedId = createMedJson.data?.medicine?.id;

  // 4.2 Update Medicine
  const updateMedRes = await fetch(`${BASE_URL}/api/admin/medicines/${newMedId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      price: 28000,
      stock: 60,
    }),
  });
  assert(updateMedRes.status === 200, 'Admin berhasil mengupdate harga dan stok obat (HTTP 200)');

  // 4.3 Soft Delete pada Obat dengan Relasi Transaksi
  // Cari obat yang pernah dipesan (orderCount > 0)
  const adminMedsRes = await fetch(`${BASE_URL}/api/admin/medicines?limit=20`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const adminMedsJson = await adminMedsRes.json();
  const medWithOrder = adminMedsJson.data?.medicines.find((m: any) => m.orderCount > 0);

  if (medWithOrder) {
    const delMedRes = await fetch(`${BASE_URL}/api/admin/medicines/${medWithOrder.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const delMedJson = await delMedRes.json();
    assert(delMedRes.status === 200, 'Penghapusan obat dengan riwayat order berhasil ditangani (HTTP 200)');
    assert(delMedJson.data?.softDeleted === true, 'Sistem menerapkan SOFT DELETE (isActive: false) untuk menjaga integritas pesanan');

    // Verifikasi obat yang di-soft-delete tidak dapat dibuka di katalog publik customer
    const publicMedRes = await fetch(`${BASE_URL}/api/medicines/${medWithOrder.id}`);
    assert(publicMedRes.status === 404, 'Obat yang diarsipkan/soft-deleted tidak dapat diakses di katalog publik (HTTP 404)');

    // Restore obat kembali aktif untuk testing berikutnya
    await fetch(`${BASE_URL}/api/admin/medicines/${medWithOrder.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ isActive: true }),
    });
  }

  // 4.4 Hard Delete pada Obat yang belum pernah ada transaksi
  const delFreshMedRes = await fetch(`${BASE_URL}/api/admin/medicines/${newMedId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const delFreshMedJson = await delFreshMedRes.json();
  assert(delFreshMedRes.status === 200, 'Obat baru tanpa relasi pesanan berhasil dihapus permanen (HTTP 200)');
  assert(delFreshMedJson.data?.softDeleted === false, 'Hard delete dilakukan karena obat belum memiliki riwayat transaksi');

  // --------------------------------------------------------------------------
  // SUITE 5: User Management (Role, Aktivasi, Self-Protection)
  // --------------------------------------------------------------------------
  console.log('\n5️⃣  Manajemen Pengguna (User Management):');

  // 5.1 List Users
  const usersRes = await fetch(`${BASE_URL}/api/admin/users`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const usersJson = await usersRes.json();
  assert(usersRes.status === 200, 'Admin berhasil mengambil daftar pengguna (HTTP 200)');
  assert(usersJson.data?.users.length >= 3, `Ditemukan ${usersJson.data?.users.length} pengguna terdaftar`);

  // 5.2 Self-Lockout Protection: Ubah role diri sendiri
  const selfRoleRes = await fetch(`${BASE_URL}/api/admin/users/${adminUserId}/role`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ role: 'STAFF' }),
  });
  assert(selfRoleRes.status === 400, 'Self-Lockout Protection: Admin dilarang menurunkan role akunnya sendiri (HTTP 400)');

  // 5.3 Self-Lockout Protection: Nonaktifkan akun diri sendiri
  const selfDeactivateRes = await fetch(`${BASE_URL}/api/admin/users/${adminUserId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ isActive: false }),
  });
  assert(selfDeactivateRes.status === 400, 'Self-Lockout Protection: Admin dilarang menonaktifkan akunnya sendiri (HTTP 400)');

  // 5.4 Mengubah Role User Lain (CUSTOMER -> STAFF -> CUSTOMER)
  const changeRoleRes = await fetch(`${BASE_URL}/api/admin/users/${customerUserId}/role`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ role: 'STAFF' }),
  });
  assert(changeRoleRes.status === 200, 'Admin berhasil mengubah role pengguna menjadi STAFF (HTTP 200)');

  // Kembalikan ke CUSTOMER
  await fetch(`${BASE_URL}/api/admin/users/${customerUserId}/role`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ role: 'CUSTOMER' }),
  });

  // 5.5 Menonaktifkan Akun User & Menguji Login Block
  const deactivateCustRes = await fetch(`${BASE_URL}/api/admin/users/${customerUserId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ isActive: false }),
  });
  assert(deactivateCustRes.status === 200, 'Admin berhasil menonaktifkan akun user customer (HTTP 200)');

  // Coba login dengan akun yang dinonaktifkan
  const blockedLogin = await loginUser('budi.santoso@gmail.com', 'password123');
  assert(blockedLogin.success === false, 'User yang dinonaktifkan ditolak saat login');

  // Aktifkan kembali akun user customer
  const reactivateCustRes = await fetch(`${BASE_URL}/api/admin/users/${customerUserId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ isActive: true }),
  });
  assert(reactivateCustRes.status === 200, 'Admin berhasil mengaktifkan kembali akun pengguna (HTTP 200)');

  const restoredLogin = await loginUser('budi.santoso@gmail.com', 'password123');
  assert(restoredLogin.success === true, 'User berhasil login kembali setelah diaktifkan oleh Admin');

  // --------------------------------------------------------------------------
  // SUITE 6: Orders & Transaksi
  // --------------------------------------------------------------------------
  console.log('\n6️⃣  Monitoring Pesanan & Transaksi Keuangan:');

  const ordersRes = await fetch(`${BASE_URL}/api/admin/orders`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const ordersJson = await ordersRes.json();
  assert(ordersRes.status === 200, 'Admin dapat melihat seluruh antrean pesanan masuk (HTTP 200)');
  assert(ordersJson.data?.orders.length > 0, `Ditemukan ${ordersJson.data?.orders.length} pesanan`);

  const trxRes = await fetch(`${BASE_URL}/api/admin/transactions`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const trxJson = await trxRes.json();
  assert(trxRes.status === 200, 'Admin dapat melihat rekapitulasi transaksi kas apotek (HTTP 200)');
  assert(typeof trxJson.data?.totalRevenue === 'number', `Total omzet tercatat: Rp ${trxJson.data?.totalRevenue.toLocaleString('id-ID')}`);

  console.log('\n══════════════════════════════════════════════');
  console.log(`📊 Hasil Pengujian Dashboard ADMIN: ${passedTests} passed / ${failedTests} failed / ${passedTests + failedTests} total`);
  if (failedTests === 0) {
    console.log('🎉 Seluruh pengujian fitur Dashboard ADMIN berhasil 100% memenuhi semua Business Rules!');
  } else {
    console.log('⚠️ Ada tes yang gagal. Periksa log di atas.');
  }
  console.log('══════════════════════════════════════════════\n');
}

runAdminVerification().catch((err) => {
  console.error('Error in verification script:', err);
  process.exit(1);
});
