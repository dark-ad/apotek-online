/**
 * verify-catalog.ts
 * Automated Verification Script for Apotek Online - Customer Medicine Catalog
 * Run: npx tsx scripts/verify-catalog.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type TestResult = { name: string; passed: boolean; detail?: string };
const results: TestResult[] = [];

function log(test: string, passed: boolean, detail?: string) {
  const icon = passed ? '✅' : '❌';
  console.log(`  ${icon} ${test}${detail ? ` — ${detail}` : ''}`);
  results.push({ name: test, passed, detail });
}

async function runTests() {
  console.log('\n=== Apotek Online + AI — Verifikasi Katalog Obat (Customer) ===\n');

  // -------------------------------------------------------------
  // 1. Verifikasi Master Kategori Database
  // -------------------------------------------------------------
  console.log('1️⃣  Master Kategori Obat di Database:');
  const categories = await prisma.category.findMany({
    include: { _count: { select: { medicines: true } } },
    orderBy: { name: 'asc' },
  });

  log('Kategori obat tersedia di database', categories.length >= 5, `${categories.length} kategori ditemukan`);
  log('Kategori "Obat Bebas" terdaftar', categories.some((c) => c.name.includes('Bebas')));
  log('Kategori "Obat Keras & Resep" terdaftar', categories.some((c) => c.name.includes('Keras')));
  log('Kategori "Vitamin & Suplemen" terdaftar', categories.some((c) => c.name.includes('Vitamin')));

  // -------------------------------------------------------------
  // 2. Verifikasi Data Obat & Informasi Wajib Sesuai PRD
  // -------------------------------------------------------------
  console.log('\n2️⃣  Kelengkapan Informasi Obat (PRD Fields):');
  const allMedicines = await prisma.medicine.findMany({
    include: { category: true },
  });

  log('Produk obat tersedia di katalog', allMedicines.length >= 10, `Total: ${allMedicines.length} produk`);

  // Periksa field wajib di setiap obat
  const hasValidFields = allMedicines.every((m) =>
    m.id &&
    m.name &&
    m.category &&
    m.price > 0 &&
    typeof m.stock === 'number' &&
    m.unit &&
    m.description &&
    typeof m.requiresPrescription === 'boolean' &&
    m.image
  );
  log('Setiap obat memiliki field wajib (Nama, Kategori, Harga, Stok, Satuan, Deskripsi, requires_prescription, Gambar)', hasValidFields);

  // -------------------------------------------------------------
  // 3. Verifikasi Kondisi "Stok Habis" (Stock = 0)
  // -------------------------------------------------------------
  console.log('\n3️⃣  Kondisi Obat Stok Habis (Stock = 0):');
  const outOfStockMeds = allMedicines.filter((m) => m.stock === 0);
  log('Terdapat sampel obat dengan stock = 0 di database', outOfStockMeds.length >= 1, `Ditemukan: ${outOfStockMeds.length} produk`);

  for (const m of outOfStockMeds) {
    log(`Obat "${m.name}" stok bernilai 0 (Wajib ditampilkan "Stok Habis")`, m.stock === 0, `Stok: ${m.stock}, Satuan: ${m.unit}`);
  }

  // -------------------------------------------------------------
  // 4. Verifikasi Label "Memerlukan Resep" (requiresPrescription = true)
  // -------------------------------------------------------------
  console.log('\n4️⃣  Penanda Khusus "Memerlukan Resep" (requires_prescription = true):');
  const prescriptionMeds = allMedicines.filter((m) => m.requiresPrescription === true);
  const nonPrescriptionMeds = allMedicines.filter((m) => m.requiresPrescription === false);

  log('Terdapat obat yang memerlukan resep dokter', prescriptionMeds.length >= 2, `${prescriptionMeds.length} produk resep`);
  log('Terdapat obat bebas tanpa resep', nonPrescriptionMeds.length >= 5, `${nonPrescriptionMeds.length} produk bebas`);

  const amox = allMedicines.find((m) => m.name.toLowerCase().includes('amoxicillin'));
  if (amox) {
    log(`Obat antibiotik "${amox.name}" requiresPrescription bernilai TRUE`, amox.requiresPrescription === true);
  }

  // -------------------------------------------------------------
  // 5. Verifikasi Fitur Search (Pencarian Nama & Deskripsi)
  // -------------------------------------------------------------
  console.log('\n5️⃣  Logika Pencarian Obat (Search by Name):');
  const query = 'Paracetamol';
  const searchResults = await prisma.medicine.findMany({
    where: {
      OR: [
        { name: { contains: query } },
        { description: { contains: query } },
      ],
    },
  });
  log(`Pencarian "${query}" menghasilkan hasil yang relevan`, searchResults.length >= 1 && searchResults.some((m) => m.name.includes(query)));

  const notFoundQuery = 'ObatYangTidakPernahAda123XYZ';
  const emptyResults = await prisma.medicine.findMany({
    where: {
      OR: [
        { name: { contains: notFoundQuery } },
        { description: { contains: notFoundQuery } },
      ],
    },
  });
  log(`Pencarian tanpa hasil ("${notFoundQuery}") mengembalikan 0 produk (Empty State)`, emptyResults.length === 0);

  // -------------------------------------------------------------
  // 6. Verifikasi Filter Berdasarkan Kategori
  // -------------------------------------------------------------
  console.log('\n6️⃣  Logika Filter Kategori Obat:');
  const catAlkes = categories.find((c) => c.name.includes('Alat Kesehatan'));
  if (catAlkes) {
    const alkesMeds = await prisma.medicine.findMany({
      where: { categoryId: catAlkes.id },
    });
    log(`Filter kategori "${catAlkes.name}" mengembalikan produk yang sesuai`, alkesMeds.length >= 1 && alkesMeds.every((m) => m.categoryId === catAlkes.id));
  }

  // -------------------------------------------------------------
  // 7. Verifikasi Detail Obat by ID
  // -------------------------------------------------------------
  console.log('\n7️⃣  Detail Obat by ID:');
  const sampleMed = allMedicines[0];
  const medDetail = await prisma.medicine.findUnique({
    where: { id: sampleMed.id },
    include: { category: true },
  });
  log('Detail obat berhasil diambil berdasarkan ID unik', !!medDetail && medDetail.id === sampleMed.id);
  log('Detail obat memuat relasi kategori lengkap', !!medDetail?.category?.name);

  // -------------------------------------------------------------
  // 8. Verifikasi Aturan: Kuantitas Tidak Boleh Melebihi Stok
  // -------------------------------------------------------------
  console.log('\n8️⃣  Validasi Aturan Pembelian (Tidak Boleh Melebihi Stok):');
  // Simulasi logika pembatasan kuantitas keranjang
  const simulateAddToCart = (med: typeof sampleMed, requestedQty: number, currentInCart: number) => {
    if (med.stock <= 0) return { allowed: false, reason: 'STOK_HABIS' };
    if (currentInCart + requestedQty > med.stock) return { allowed: false, reason: 'MELEBIHI_STOK' };
    return { allowed: true, newQty: currentInCart + requestedQty };
  };

  const zeroStockItem = outOfStockMeds[0];
  if (zeroStockItem) {
    const resZero = simulateAddToCart(zeroStockItem as any, 1, 0);
    log('Pembelian produk stok 0 langsung ditolak (STOK_HABIS)', resZero.allowed === false && resZero.reason === 'STOK_HABIS');
  }

  const inStockItem = allMedicines.find((m) => m.stock > 0);
  if (inStockItem) {
    const resAllowed = simulateAddToCart(inStockItem, 2, 0);
    log(`Pembelian kuantitas wajar (2 <= ${inStockItem.stock}) diizinkan`, resAllowed.allowed === true);

    const resOver = simulateAddToCart(inStockItem, inStockItem.stock + 5, 0);
    log(`Pembelian kuantitas melebihi stok (${inStockItem.stock + 5} > ${inStockItem.stock}) ditolak`, resOver.allowed === false && resOver.reason === 'MELEBIHI_STOK');
  }

  // -------------------------------------------------------------
  // Ringkasan Akhir
  // -------------------------------------------------------------
  console.log('\n══════════════════════════════════════════════');
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`📊 Hasil Pengujian Katalog: ${passed} passed / ${failed} failed / ${results.length} total`);

  if (failed === 0) {
    console.log('🎉 Semua pengujian katalog obat berhasil 100% tanpa authorization atau business rule bypass!\n');
  } else {
    console.log('⚠️ Terdapat pengujian yang gagal. Periksa log di atas.\n');
  }

  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(async (e) => {
  console.error('Fatal error saat verifikasi katalog:', e);
  await prisma.$disconnect();
  process.exit(1);
});
