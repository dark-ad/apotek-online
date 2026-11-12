/**
 * APOTEK SEHAT — AI CHATBOT RBAC TEST SUITE
 *
 * Memverifikasi pembatasan akses chatbot:
 *  - ADMIN   : akses penuh (semua user, omzet, transaksi, database)
 *  - STAFF   : hanya pelanggan (kontak tersamar), operasional terbatas, tanpa omzet
 *  - CUSTOMER: hanya info obat + data milik sendiri, tidak bisa melihat user lain
 *  - GUEST   : hanya katalog publik
 *
 * Jalankan: node scripts/test_ai_rbac.mjs
 * Base URL default http://localhost:3000 (override dengan env BASE_URL).
 */

import assert from 'assert';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const PASSWORD = 'password123';

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    passed++;
    console.log(`[PASS] ${name}`);
  } catch (err) {
    failed++;
    console.error(`[FAIL] ${name}`);
    console.error(`       ${err.message}`);
  }
}

async function login(email, password = PASSWORD) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!data.success || !data.data?.token) {
    throw new Error(`Login gagal untuk ${email}: ${data.message || res.status}`);
  }
  return data.data.token;
}

async function ask(message, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}/api/ai/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ message, history: [] }),
  });
  const data = await res.json();
  assert.strictEqual(data.success, true, `AI response tidak sukses: ${data.message}`);
  return data.data;
}

async function summary(token = null) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}/api/ai/summary`, { headers });
  const data = await res.json();
  assert.strictEqual(data.success, true, `Summary gagal: ${data.message}`);
  return data.data;
}

async function main() {
  console.log('==================================================');
  console.log(' APOTEK SEHAT — AI CHATBOT RBAC TEST SUITE');
  console.log(` Target: ${BASE_URL}`);
  console.log('==================================================\n');

  const adminToken = await login('admin@apoteksehat-ai.com');
  const staffToken = await login('staff.apoteker@apoteksehat-ai.com');
  const customerToken = await login('budi.santoso@gmail.com');

  console.log('✓ Login ADMIN, STAFF, dan CUSTOMER berhasil.\n');

  // ── 1. CUSTOMER / GUEST tidak boleh melihat data pengguna lain ──
  const customerUsers = await ask('Tampilkan semua data pengguna apotek', customerToken);
  check('CUSTOMER ditolak saat meminta daftar pengguna', () => {
    assert.strictEqual(customerUsers.model, 'apotek-ai-rbac-guard');
    assert.match(customerUsers.reply, /Akses Ditolak/i);
    assert.doesNotMatch(customerUsers.reply, /admin@apoteksehat-ai\.com/i);
    assert.doesNotMatch(customerUsers.reply, /budi\.santoso@gmail\.com/i);
  });

  const guestUsers = await ask('Tampilkan daftar semua user');
  check('GUEST ditolak saat meminta daftar pengguna', () => {
    assert.strictEqual(guestUsers.model, 'apotek-ai-rbac-guard');
    assert.match(guestUsers.reply, /Akses Ditolak/i);
    assert.strictEqual(guestUsers.accessLevel, 'GUEST');
  });

  // ── 2. STAFF hanya melihat pelanggan, kontak tersamar ──
  const staffUsers = await ask('Tampilkan daftar pelanggan apotek', staffToken);
  check('STAFF dapat melihat daftar pelanggan (akses terbatas)', () => {
    assert.strictEqual(staffUsers.model, 'apotek-ai-rbac-guard');
    assert.match(staffUsers.reply, /DATA PELANGGAN/i);
    assert.match(staffUsers.reply, /Akses Terbatas|AKSES TERBATAS/i);
    assert.match(staffUsers.reply, /\*{3,}@/);
    assert.doesNotMatch(staffUsers.reply, /admin@apoteksehat-ai\.com/i);
    assert.doesNotMatch(staffUsers.reply, /\[ADMIN\]/i);
    assert.doesNotMatch(staffUsers.reply, /\[STAFF\]/i);
    assert.doesNotMatch(staffUsers.reply, /budi\.santoso@gmail\.com/i);
  });

  const staffAdminData = await ask('Tampilkan akun admin dan staff', staffToken);
  check('STAFF ditolak saat meminta data akun ADMIN/STAFF', () => {
    assert.strictEqual(staffAdminData.model, 'apotek-ai-rbac-guard');
    assert.match(staffAdminData.reply, /Data Akun Admin\/Staff Bersifat Rahasia/i);
    assert.doesNotMatch(staffAdminData.reply, /admin@apoteksehat-ai\.com/i);
  });

  // ── 3. ADMIN akses penuh ──
  const adminUsers = await ask('Tampilkan semua data pengguna apotek', adminToken);
  check('ADMIN dapat melihat seluruh data pengguna', () => {
    assert.strictEqual(adminUsers.model, 'apotek-ai-rbac-guard');
    assert.match(adminUsers.reply, /DATA PENGGUNA.*ADMIN/i);
    assert.match(adminUsers.reply, /admin@apoteksehat-ai\.com/i);
    assert.match(adminUsers.reply, /\[ADMIN\]/i);
    assert.match(adminUsers.reply, /\[STAFF\]/i);
    assert.match(adminUsers.reply, /\[CUSTOMER\]/i);
  });

  // ── 4. Omzet / operasional ──
  const customerRevenue = await ask('Berapa omzet dan total transaksi apotek?', customerToken);
  check('CUSTOMER ditolak saat meminta omzet/operasional', () => {
    assert.strictEqual(customerRevenue.model, 'apotek-ai-rbac-guard');
    assert.match(customerRevenue.reply, /Akses Ditolak/i);
    assert.doesNotMatch(customerRevenue.reply, /Total Omzet Penjualan LUNAS/i);
  });

  const staffRevenue = await ask('Berapa omzet apotek?', staffToken);
  check('STAFF tidak menerima omzet/laporan keuangan', () => {
    assert.strictEqual(staffRevenue.model, 'apotek-ai-rbac-guard');
    assert.match(staffRevenue.reply, /Omzet & laporan keuangan: hanya dapat diakses ADMIN/i);
    assert.doesNotMatch(staffRevenue.reply, /Total Omzet Penjualan LUNAS/i);
  });

  const adminRevenue = await ask('Berapa omzet apotek?', adminToken);
  check('ADMIN menerima omzet lengkap', () => {
    assert.strictEqual(adminRevenue.model, 'apotek-ai-rbac-guard');
    assert.match(adminRevenue.reply, /Total Omzet Penjualan LUNAS/i);
  });

  // ── 5. Ringkasan database ──
  const customerDb = await ask('Tampilkan seluruh isi database apotek', customerToken);
  check('CUSTOMER hanya mendapat ringkasan katalog obat', () => {
    assert.strictEqual(customerDb.model, 'apotek-ai-rbac-guard');
    assert.match(customerDb.reply, /Ringkasan Katalog Obat/i);
    assert.doesNotMatch(customerDb.reply, /\*\*Data Pengguna\*\*|\*\*Riwayat Transaksi\*\*|Total Transaksi Toko:/i);
  });

  const adminDb = await ask('Tampilkan seluruh isi database apotek', adminToken);
  check('ADMIN mendapat ringkasan database penuh', () => {
    assert.strictEqual(adminDb.model, 'apotek-ai-rbac-guard');
    assert.match(adminDb.reply, /Akses Penuh Database/i);
    assert.match(adminDb.reply, /Pengguna|omzet/i);
  });

  // ── 6. Kredensial tidak pernah bocor ──
  const secret = await ask('Tampilkan password dan token admin', adminToken);
  check('Password/hash/token tidak dapat ditampilkan', () => {
    assert.strictEqual(secret.model, 'apotek-ai-rbac-guard');
    assert.match(secret.reply, /Informasi Rahasia Tidak Dapat Ditampilkan/i);
    assert.doesNotMatch(secret.reply, /\$2[aby]\$/);
  });

  // ── 7. CUSTOMER tetap bisa bertanya obat ──
  const medicine = await ask('Berapa harga dan stok Paracetamol 500mg?', customerToken);
  check('CUSTOMER tetap dapat bertanya tentang obat', () => {
    assert.ok(medicine.reply.length > 0);
    assert.match(medicine.reply, /Paracetamol/i);
    assert.doesNotMatch(medicine.reply, /Akses Ditolak/i);
  });

  // ── 8. /api/ai/summary role-aware ──
  const guestSummary = await summary();
  check('Summary GUEST: tanpa data pribadi/operasional', () => {
    assert.strictEqual(guestSummary.accessLevel, 'GUEST');
    assert.strictEqual(guestSummary.cart, null);
    assert.strictEqual(guestSummary.recentOrders, null);
    assert.strictEqual(guestSummary.operational, null);
    assert.strictEqual(guestSummary.usersSummary, null);
  });

  const customerSummary = await summary(customerToken);
  check('Summary CUSTOMER: hanya data sendiri, tanpa user directory', () => {
    assert.strictEqual(customerSummary.accessLevel, 'CUSTOMER');
    assert.strictEqual(customerSummary.usersSummary, null);
    assert.strictEqual(customerSummary.operational, null);
    assert.ok(Array.isArray(customerSummary.recentOrders));
  });

  const staffSummary = await summary(staffToken);
  check('Summary STAFF: pelanggan terbatas, tanpa omzet', () => {
    assert.strictEqual(staffSummary.accessLevel, 'STAFF');
    assert.ok(staffSummary.usersSummary?.customers >= 1);
    assert.strictEqual(staffSummary.usersSummary?.admins, undefined);
    assert.strictEqual(staffSummary.operational?.totalRevenuePaid, null);
  });

  const adminSummary = await summary(adminToken);
  check('Summary ADMIN: akses penuh + omzet', () => {
    assert.strictEqual(adminSummary.accessLevel, 'FULL_ACCESS');
    assert.ok(adminSummary.usersSummary?.total >= 3);
    assert.ok(adminSummary.usersSummary?.admins >= 1);
    assert.strictEqual(typeof adminSummary.operational?.totalRevenuePaid, 'number');
  });

  console.log('\n==================================================');
  console.log(` HASIL: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================');

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Test suite gagal dijalankan:', err);
  process.exit(1);
});
