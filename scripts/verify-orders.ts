/**
 * Test Otomatis End-to-End: Alur Checkout dan Pemesanan Obat (Customer)
 * Memverifikasi seluruh 7 Aturan Bisnis (PRD) dan batasan otorisasi
 */
import { prisma } from '../src/lib/db';
import { generateToken } from '../src/server/auth';
import http from 'http';

const BASE_URL = 'http://localhost:3000';

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string>;
}

async function request<T = any>(
  path: string,
  options: {
    method?: string;
    token?: string;
    body?: any;
  } = {}
): Promise<{ status: number; data: ApiResponse<T> }> {
  const url = new URL(path, BASE_URL);
  const method = options.method || 'GET';
  const postData = options.body ? JSON.stringify(options.body) : undefined;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }
  if (postData) {
    headers['Content-Length'] = Buffer.byteLength(postData).toString();
  }

  return new Promise((resolve, reject) => {
    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            const data = raw ? JSON.parse(raw) : {};
            resolve({ status: res.statusCode || 500, data });
          } catch (e) {
            reject(new Error(`Gagal parse JSON response (${res.statusCode}): ${raw.slice(0, 300)}`));
          }
        });
      }
    );

    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runOrderVerification() {
  console.log('\n=== Apotek Online + AI — Verifikasi Fitur Checkout & Order ===\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, title: string, details?: string) => {
    if (condition) {
      console.log(`  ✅ ${title}`);
      passed++;
    } else {
      console.error(`  ❌ ${title}`);
      if (details) console.error(`     Detail: ${details}`);
      failed++;
    }
  };

  try {
    // 1. Setup Test Users
    const customer = await prisma.user.findFirst({ where: { role: 'CUSTOMER' } });
    const staff = await prisma.user.findFirst({ where: { role: 'STAFF' } });
    if (!customer || !staff) {
      throw new Error('User test CUSTOMER atau STAFF tidak ditemukan di database.');
    }

    const customerToken = generateToken({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      role: 'CUSTOMER',
    });

    const staffToken = generateToken({
      id: staff.id,
      name: staff.name,
      email: staff.email,
      role: 'STAFF',
    });

    // Medicines: Find one that requires prescription and one that does not
    const rxMedicine = await prisma.medicine.findFirst({
      where: { requiresPrescription: true, stock: { gt: 5 } },
    });
    const otcMedicine = await prisma.medicine.findFirst({
      where: { requiresPrescription: false, stock: { gt: 5 } },
    });

    if (!rxMedicine || !otcMedicine) {
      throw new Error('Obat resep atau obat OTC tidak ditemukan dengan stok yang cukup.');
    }

    console.log('1️⃣  Otorisasi Role Akses Checkout:');
    // Test 1: Anonymous checkout rejected
    const anonRes = await request('/api/orders/checkout', { method: 'POST', body: {} });
    assert(anonRes.status === 401, 'Akses checkout tanpa login ditolak (HTTP 401)');

    // Test 2: STAFF cannot checkout
    const staffRes = await request('/api/orders/checkout', { method: 'POST', token: staffToken, body: {} });
    assert(staffRes.status === 403, 'Akses checkout role STAFF ditolak (HTTP 403)');

    console.log('\n2️⃣  Business Rule 1 & 2: Validasi Resep Dokter untuk Obat Resep:');
    // Clear user cart first
    await prisma.cartItem.deleteMany({ where: { userId: customer.id } });

    // Add prescription medicine to cart
    await prisma.cartItem.create({
      data: {
        userId: customer.id,
        medicineId: rxMedicine.id,
        quantity: 2,
      },
    });

    // Attempt checkout WITHOUT prescriptionUrl
    const noRxRes = await request('/api/orders/checkout', {
      method: 'POST',
      token: customerToken,
      body: {
        shippingAddress: 'Jl. Merdeka No. 10, Jakarta Pusat',
        notes: 'Uji coba order resep tanpa upload',
      },
    });

    assert(noRxRes.status === 400, 'Checkout obat resep tanpa upload resep ditolak (HTTP 400)');
    assert(
      noRxRes.data.message?.includes('resep') || false,
      'Pesan penolakan resep jelas dan informatif',
      noRxRes.data.message
    );

    console.log('\n3️⃣  Upload Dokumen Resep Dokter:');
    // Test prescription upload endpoint
    const sampleBase64 = Buffer.from('Fake prescription image data').toString('base64');
    const uploadRes = await request<{ prescriptionUrl: string; fileName: string }>('/api/upload/prescription', {
      method: 'POST',
      token: customerToken,
      body: {
        fileName: 'resep-dokter-spesialis.png',
        fileType: 'image/png',
        fileData: `data:image/png;base64,${sampleBase64}`,
      },
    });

    assert(uploadRes.status === 200, 'Upload berkas resep berhasil (HTTP 200)');
    assert(Boolean(uploadRes.data.data?.prescriptionUrl), 'Mendapatkan URL berkas resep');
    const prescriptionUrl = uploadRes.data.data?.prescriptionUrl || '';

    console.log('\n4️⃣  Business Rule 6 & 7: Pembuatan Order Resep (Status PENDING_VERIFICATION):');
    const initialRxStock = rxMedicine.stock;

    const rxCheckoutRes = await request<{ order: any }>('/api/orders/checkout', {
      method: 'POST',
      token: customerToken,
      body: {
        shippingAddress: 'Jl. Sudirman No. 12, Jakarta',
        notes: 'Pasien rawat jalan',
        prescriptionUrl,
      },
    });

    assert(rxCheckoutRes.status === 201, 'Order dengan resep berhasil dibuat (HTTP 201)');
    const rxOrder = rxCheckoutRes.data.data?.order;
    assert(Boolean(rxOrder?.id && rxOrder?.shortId), `Nomor Order ID dibuat (#${rxOrder?.shortId})`);
    assert(
      rxOrder?.status === 'PENDING_VERIFICATION',
      'Status awal adalah PENDING_VERIFICATION (Business Rule 7)',
      rxOrder?.status
    );
    assert(rxOrder?.requiresPrescription === true, 'Flag requiresPrescription tersimpan true');

    console.log('\n5️⃣  Business Rule 4 & 5: Snapshot Harga & Total Server-Side:');
    const expectedSubtotal = rxMedicine.price * 2;
    assert(rxOrder?.totalAmount === expectedSubtotal, `Total order server-side akurat (Rp ${rxOrder?.totalAmount})`);
    assert(rxOrder?.items?.[0]?.price === rxMedicine.price, `Snapshot harga obat di OrderItem sesuai (Rp ${rxMedicine.price})`);
    assert(rxOrder?.items?.[0]?.quantity === 2, 'Kuantitas OrderItem sesuai (2 unit)');

    console.log('\n6️⃣  Pengurangan Stok Atomik & Pembersihan Keranjang:');
    const updatedRxMedicine = await prisma.medicine.findUnique({ where: { id: rxMedicine.id } });
    assert(
      updatedRxMedicine?.stock === initialRxStock - 2,
      `Stok obat di database berkurang secara atomik (${initialRxStock} -> ${updatedRxMedicine?.stock})`
    );

    const cartCountAfter = await prisma.cartItem.count({ where: { userId: customer.id } });
    assert(cartCountAfter === 0, 'Keranjang belanja customer otomatis dikosongkan setelah checkout berhasil');

    console.log('\n7️⃣  Business Rule 7: Order Obat Bebas Tanpa Resep (Status PENDING_PAYMENT):');
    // Add OTC medicine to cart
    await prisma.cartItem.create({
      data: {
        userId: customer.id,
        medicineId: otcMedicine.id,
        quantity: 3,
      },
    });

    const otcCheckoutRes = await request<{ order: any }>('/api/orders/checkout', {
      method: 'POST',
      token: customerToken,
      body: {
        shippingAddress: 'Jl. Thamrin No. 8, Jakarta',
        notes: 'Obat flu biasa',
      },
    });

    assert(otcCheckoutRes.status === 201, 'Order obat bebas berhasil dibuat tanpa upload resep (HTTP 201)');
    const otcOrder = otcCheckoutRes.data.data?.order;
    assert(
      otcOrder?.status === 'PENDING_PAYMENT',
      'Status awal adalah PENDING_PAYMENT untuk obat bebas (Business Rule 7)',
      otcOrder?.status
    );
    assert(otcOrder?.requiresPrescription === false, 'Flag requiresPrescription adalah false');

    console.log('\n8️⃣  Business Rule 3: Validasi Ulang Stok saat Pembuatan Order:');
    // Set medicine stock to 0 in database
    await prisma.medicine.update({
      where: { id: otcMedicine.id },
      data: { stock: 0 },
    });

    // Try to create order with cart containing out of stock medicine
    await prisma.cartItem.create({
      data: {
        userId: customer.id,
        medicineId: otcMedicine.id,
        quantity: 1,
      },
    });

    const outOfStockRes = await request('/api/orders/checkout', {
      method: 'POST',
      token: customerToken,
      body: {
        shippingAddress: 'Jl. Gatot Subroto No. 1',
      },
    });

    assert(
      outOfStockRes.status === 400,
      'Order dengan stok obat yang habis ditolak saat checkout (HTTP 400)'
    );

    // Restore stock
    await prisma.medicine.update({
      where: { id: otcMedicine.id },
      data: { stock: 50 },
    });
    await prisma.cartItem.deleteMany({ where: { userId: customer.id } });

    console.log('\n9️⃣  Riwayat Pesanan & Detail Pesanan (Ownership Guard):');
    // List customer orders
    const myOrdersRes = await request<{ orders: any[]; total: number }>('/api/orders', {
      token: customerToken,
    });
    assert(myOrdersRes.status === 200, 'Pengambilan riwayat pesanan customer berhasil (HTTP 200)');
    assert(myOrdersRes.data.data?.orders?.length! >= 2, `Jumlah pesanan terdaftar (${myOrdersRes.data.data?.total} pesanan)`);

    // Get order detail
    const detailRes = await request<{ order: any }>(`/api/orders/${otcOrder.id}`, {
      token: customerToken,
    });
    assert(detailRes.status === 200, 'Pengambilan detail pesanan spesifik berhasil (HTTP 200)');
    assert(detailRes.data.data?.order?.id === otcOrder.id, 'ID pesanan pada detail sesuai');

    // Test unauthorized access by another user/staff
    const unauthorizedDetail = await request(`/api/orders/${otcOrder.id}`, {
      token: staffToken,
    });
    assert(unauthorizedDetail.status === 403, 'Akses detail pesanan user lain ditolak (HTTP 403 Forbidden)');

    console.log('\n🔟  Simulasi Pembayaran Manual (Mock Payment):');
    const mockPayRes = await request<{ paymentStatus: string; status: string }>(
      `/api/orders/${otcOrder.id}/mock-pay`,
      {
        method: 'POST',
        token: customerToken,
      }
    );

    assert(mockPayRes.status === 200, 'Simulasi pembayaran manual berhasil (HTTP 200)');
    assert(mockPayRes.data.data?.paymentStatus === 'PAID', 'Payment status terbarui menjadi PAID');
    assert(mockPayRes.data.data?.status === 'CONFIRMED', 'Status pesanan terbarui menjadi CONFIRMED');

  } catch (err: any) {
    console.error('Fatal Test Error:', err);
    failed++;
  }

  console.log('\n══════════════════════════════════════════════');
  console.log(`📊 Hasil Pengujian Checkout & Order: ${passed} passed / ${failed} failed / ${passed + failed} total`);
  if (failed === 0) {
    console.log('🎉 Seluruh pengujian fitur Checkout & Order berhasil 100% memenuhi semua Business Rules!');
  }
  console.log('══════════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

runOrderVerification();
