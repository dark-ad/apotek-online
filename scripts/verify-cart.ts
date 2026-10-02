/**
 * verify-cart.ts
 * Automated Verification Script for Apotek Online - Customer Shopping Cart
 * Run: npx tsx scripts/verify-cart.ts
 */

import { PrismaClient } from '@prisma/client';
import { generateToken } from '../src/server/auth';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000';

type TestResult = { name: string; passed: boolean; detail?: string };
const results: TestResult[] = [];

function log(test: string, passed: boolean, detail?: string) {
  const icon = passed ? '✅' : '❌';
  console.log(`  ${icon} ${test}${detail ? ` — ${detail}` : ''}`);
  results.push({ name: test, passed, detail });
}

async function runTests() {
  console.log('\n=== Apotek Online + AI — Verifikasi Fitur Shopping Cart (Customer) ===\n');

  // Fetch users for tokens
  const customer = await prisma.user.findFirst({ where: { role: 'CUSTOMER' } });
  const staff = await prisma.user.findFirst({ where: { role: 'STAFF' } });
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

  if (!customer || !staff || !admin) {
    throw new Error('Database users tidak lengkap. Harap jalankan seed terlebih dahulu.');
  }

  const customerToken = generateToken({ id: customer.id, email: customer.email, role: 'CUSTOMER' });
  const staffToken = generateToken({ id: staff.id, email: staff.email, role: 'STAFF' });
  const adminToken = generateToken({ id: admin.id, email: admin.email, role: 'ADMIN' });

  // Clear previous cart for clean test
  await prisma.cartItem.deleteMany({ where: { userId: customer.id } });

  // -------------------------------------------------------------
  // 1. Verifikasi Akses Role (Hanya CUSTOMER yang Diizinkan)
  // -------------------------------------------------------------
  console.log('1️⃣  Otorisasi Role Akses Keranjang:');
  
  // Tanpa token -> 401
  const noTokenRes = await fetch(`${BASE_URL}/api/cart`);
  log('Akses tanpa token ditolak (HTTP 401 Unauthorized)', noTokenRes.status === 401);

  // STAFF token -> 403
  const staffRes = await fetch(`${BASE_URL}/api/cart`, {
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  log('Akses akun STAFF ke keranjang ditolak (HTTP 403 Forbidden)', staffRes.status === 403);

  // ADMIN token -> 403
  const adminRes = await fetch(`${BASE_URL}/api/cart`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  log('Akses akun ADMIN ke keranjang ditolak (HTTP 403 Forbidden)', adminRes.status === 403);

  // CUSTOMER token -> 200
  const custRes = await fetch(`${BASE_URL}/api/cart`, {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  const custData = await custRes.json();
  log('Akses akun CUSTOMER diizinkan (HTTP 200 OK)', custRes.status === 200 && custData.success === true);
  log('Keranjang awal customer kosong (0 items)', custData.data.items.length === 0 && custData.data.totalAmount === 0);

  // -------------------------------------------------------------
  // 2. Verifikasi Business Rule 3: Obat Stok 0 Tidak Dapat Ditambahkan
  // -------------------------------------------------------------
  console.log('\n2️⃣  Business Rule 3: Obat Stok 0 Tidak Dapat Ditambahkan:');
  const zeroStockMed = await prisma.medicine.findFirst({ where: { stock: 0 } });
  if (zeroStockMed) {
    const addZeroRes = await fetch(`${BASE_URL}/api/cart/items`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}` 
      },
      body: JSON.stringify({ medicineId: zeroStockMed.id, quantity: 1 }),
    });
    const addZeroData = await addZeroRes.json();
    log(
      `Penambahan obat stok habis "${zeroStockMed.name}" ditolak (HTTP 400)`,
      addZeroRes.status === 400 && addZeroData.success === false,
      addZeroData.message
    );
  }

  // -------------------------------------------------------------
  // 3. Menambahkan Obat dengan Stok Tersedia ke Keranjang
  // -------------------------------------------------------------
  console.log('\n3️⃣  Menambahkan Obat yang Tersedia ke Keranjang:');
  const availableMed1 = await prisma.medicine.findFirst({ where: { stock: { gte: 10 } } });
  if (!availableMed1) throw new Error('Tidak ditemukan obat dengan stok >= 10.');

  const addRes1 = await fetch(`${BASE_URL}/api/cart/items`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}` 
    },
    body: JSON.stringify({ medicineId: availableMed1.id, quantity: 2 }),
  });
  const addData1 = await addRes1.json();
  log('Obat berhasil ditambahkan ke keranjang (HTTP 200)', addRes1.status === 200 && addData1.success === true);
  log('Kuantitas item di keranjang sesuai (2 unit)', addData1.data.totalCount === 2);

  const cartItemId = addData1.data.items[0]?.id;

  // -------------------------------------------------------------
  // 4. Verifikasi Business Rule 4 & 5: Harga dari Database & Total Server-Side
  // -------------------------------------------------------------
  console.log('\n4️⃣  Business Rule 4 & 5: Integritas Harga Database & Total Server-Side:');
  const expectedSubtotal = availableMed1.price * 2;
  const returnedSubtotal = addData1.data.items[0]?.subtotal;
  const returnedTotal = addData1.data.totalAmount;

  log(
    `Harga satuan diambil dari database (Rp ${availableMed1.price.toLocaleString('id-ID')})`,
    addData1.data.items[0]?.unitPrice === availableMed1.price
  );
  log(
    `Subtotal dihitung server-side: price * qty (Rp ${expectedSubtotal.toLocaleString('id-ID')})`,
    returnedSubtotal === expectedSubtotal
  );
  log(
    `Total pembayaran dihitung server-side (Rp ${returnedTotal.toLocaleString('id-ID')})`,
    returnedTotal === expectedSubtotal
  );

  // -------------------------------------------------------------
  // 5. Verifikasi Business Rule 1 & 2: Kuantitas Minimal = 1 & Tidak Melebihi Stok
  // -------------------------------------------------------------
  console.log('\n5️⃣  Business Rule 1 & 2: Validasi Batas Kuantitas (Min 1, Max Stok):');

  // Coba update ke kuantitas 0 -> DITOLAK
  const updateZeroRes = await fetch(`${BASE_URL}/api/cart/items/${cartItemId}`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}` 
    },
    body: JSON.stringify({ quantity: 0 }),
  });
  const updateZeroData = await updateZeroRes.json();
  log('Update kuantitas 0 ditolak (Kuantitas minimal = 1)', updateZeroRes.status === 400 && updateZeroData.success === false);

  // Coba update melebihi stok -> DITOLAK
  const excessiveQty = availableMed1.stock + 10;
  const updateExcessRes = await fetch(`${BASE_URL}/api/cart/items/${cartItemId}`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}` 
    },
    body: JSON.stringify({ quantity: excessiveQty }),
  });
  const updateExcessData = await updateExcessRes.json();
  log(`Update kuantitas melebihi stok (${excessiveQty} > ${availableMed1.stock}) ditolak`, updateExcessRes.status === 400 && updateExcessData.success === false);

  // Update ke kuantitas valid (3) -> BERHASIL
  const updateValidRes = await fetch(`${BASE_URL}/api/cart/items/${cartItemId}`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}` 
    },
    body: JSON.stringify({ quantity: 3 }),
  });
  const updateValidData = await updateValidRes.json();
  log('Update kuantitas valid (3 unit) berhasil', updateValidRes.status === 200 && updateValidData.data.totalCount === 3);
  log(`Total server-side otomatis terbarui (Rp ${(availableMed1.price * 3).toLocaleString('id-ID')})`, updateValidData.data.totalAmount === availableMed1.price * 3);

  // -------------------------------------------------------------
  // 6. Verifikasi Business Rule 6: Validasi Ulang Stok Sebelum Checkout
  // -------------------------------------------------------------
  console.log('\n6️⃣  Business Rule 6: Validasi Ulang Stok Pra-Checkout:');

  // Tahap A: Stok masih aman -> isValid = true
  const validateRes1 = await fetch(`${BASE_URL}/api/cart/validate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  const validateData1 = await validateRes1.json();
  log('Validasi pra-checkout berhasil saat stok cukup (isValid = true)', validateData1.data?.isValid === true && validateData1.data?.canProceedToCheckout === true);

  // Tahap B: Simulasi stok obat berkurang di database secara mendadak (misal diborong pembeli lain)
  const originalStock = availableMed1.stock;
  await prisma.medicine.update({
    where: { id: availableMed1.id },
    data: { stock: 1 }, // Stok sekarang hanya 1, sedangkan di keranjang ada 3!
  });

  const validateRes2 = await fetch(`${BASE_URL}/api/cart/validate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  const validateData2 = await validateRes2.json();
  log(
    'Sistem mendeteksi stok berubah sebelum checkout (isValid = false, canProceed = false)',
    validateData2.data?.isValid === false && validateData2.data?.canProceedToCheckout === false
  );
  log(
    'Sistem memberikan detail masalah stok (EXCEEDS_STOCK issue)',
    validateData2.data?.issues?.[0]?.issueType === 'EXCEEDS_STOCK'
  );

  // Kembalikan stok semula
  await prisma.medicine.update({
    where: { id: availableMed1.id },
    data: { stock: originalStock },
  });

  // -------------------------------------------------------------
  // 7. Menghapus Item dari Keranjang
  // -------------------------------------------------------------
  console.log('\n7️⃣  Menghapus Item dari Keranjang:');
  const deleteRes = await fetch(`${BASE_URL}/api/cart/items/${cartItemId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  const deleteData = await deleteRes.json();
  log('Item berhasil dihapus dari keranjang (HTTP 200)', deleteRes.status === 200 && deleteData.success === true);
  log('Keranjang kembali kosong (0 items, total Rp 0)', deleteData.data.items.length === 0 && deleteData.data.totalAmount === 0);

  // -------------------------------------------------------------
  // Ringkasan Pengujian
  // -------------------------------------------------------------
  console.log('\n══════════════════════════════════════════════');
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`📊 Hasil Pengujian Shopping Cart: ${passed} passed / ${failed} failed / ${results.length} total`);

  if (failed === 0) {
    console.log('🎉 Seluruh pengujian fitur Shopping Cart berhasil 100% memenuhi semua Business Rules!\n');
  } else {
    console.log('⚠️ Terdapat pengujian yang gagal. Periksa log di atas.\n');
  }

  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(async (e) => {
  console.error('Fatal error saat verifikasi Shopping Cart:', e);
  await prisma.$disconnect();
  process.exit(1);
});
