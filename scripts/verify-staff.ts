/**
 * Test Otomatis End-to-End: Alur Kerja & Business Rules Dashboard STAFF
 * Apotek Online + AI
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

async function runStaffVerification() {
  console.log('\n=== Apotek Online + AI — Verifikasi Fitur Dashboard STAFF ===\n');

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
    const staff = await prisma.user.findFirst({ where: { role: 'STAFF' } });
    const customer = await prisma.user.findFirst({ where: { role: 'CUSTOMER' } });
    if (!staff || !customer) {
      throw new Error('User test STAFF atau CUSTOMER tidak ditemukan di database.');
    }

    const staffToken = generateToken({
      id: staff.id,
      name: staff.name,
      email: staff.email,
      role: 'STAFF',
    });

    const customerToken = generateToken({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      role: 'CUSTOMER',
    });

    console.log('1️⃣  Otorisasi Role & Pembatasan Akses Admin:');
    // Test: Customer cannot access staff orders
    const custStaffRes = await request('/api/staff/orders', { token: customerToken });
    assert(custStaffRes.status === 403, 'Akses dashboard staf oleh role CUSTOMER ditolak (HTTP 403)');

    // Test: Staff can access staff orders
    const staffOrdersRes = await request<{ orders: any[]; total: number }>('/api/staff/orders', {
      token: staffToken,
    });
    assert(staffOrdersRes.status === 200, 'Akses antrean pesanan oleh role STAFF diizinkan (HTTP 200)');
    assert(Boolean(staffOrdersRes.data.data?.orders), 'Mendapatkan daftar pesanan masuk');

    // Test: Staff CANNOT access admin users (PRD: Staff tidak dapat mengakses halaman Admin)
    const staffAdminRes = await request('/api/admin/users', { token: staffToken });
    assert(
      staffAdminRes.status === 403,
      'Akses halaman/API Admin oleh role STAFF diblokir ketat (HTTP 403 Forbidden)'
    );

    console.log('\n2️⃣  Melihat Data Customer & Item Pesanan (Detail Pesanan):');
    // Ensure we have a sample test order
    let sampleOrder = await prisma.order.findFirst({
      include: { customer: true, items: { include: { medicine: true } } },
      orderBy: { createdAt: 'desc' },
    });

    if (!sampleOrder) {
      // Create one if none exists
      const med = await prisma.medicine.findFirst({ where: { stock: { gt: 5 } } });
      sampleOrder = await prisma.order.create({
        data: {
          customerId: customer.id,
          totalAmount: 25000,
          status: 'PENDING_VERIFICATION',
          requiresPrescription: true,
          prescriptionUrl: '/uploads/prescriptions/sample_rx.png',
          shippingAddress: 'Jl. Fatmawati No. 15, Jakarta',
          items: {
            create: [
              {
                medicineId: med!.id,
                quantity: 2,
                price: 12500,
                subtotal: 25000,
              },
            ],
          },
        },
        include: { customer: true, items: { include: { medicine: true } } },
      });
    }

    const detailRes = await request<{ order: any }>(`/api/staff/orders/${sampleOrder.id}`, {
      token: staffToken,
    });
    assert(detailRes.status === 200, 'Staf berhasil membuka detail pesanan (HTTP 200)');
    const orderData = detailRes.data.data?.order;
    assert(Boolean(orderData?.customer?.name), `Melihat data customer pasien: ${orderData?.customer?.name}`);
    assert(Boolean(orderData?.customer?.phone || orderData?.customer?.email), 'Melihat kontak telepon / email customer');
    assert(orderData?.items?.length > 0, `Melihat daftar item obat pesanan (${orderData?.items?.length} item)`);

    console.log('\n3️⃣  Verifikasi Resep — Penolakan Resep (Wajib Alasan Penolakan):');
    // Create an order specifically in PENDING_VERIFICATION for rejection test
    const medRx = await prisma.medicine.findFirst({ where: { requiresPrescription: true } });
    const orderToReject = await prisma.order.create({
      data: {
        customerId: customer.id,
        totalAmount: 50000,
        status: 'PENDING_VERIFICATION',
        requiresPrescription: true,
        prescriptionUrl: '/uploads/prescriptions/blur_rx.jpg',
        shippingAddress: 'Jl. Percobaan No. 99',
        items: {
          create: [{ medicineId: medRx!.id, quantity: 1, price: 50000, subtotal: 50000 }],
        },
      },
    });

    // Test reject WITHOUT reason -> must fail 400
    const rejectNoReason = await request(`/api/staff/orders/${orderToReject.id}/verify-prescription`, {
      method: 'POST',
      token: staffToken,
      body: { action: 'REJECT' },
    });
    assert(
      rejectNoReason.status === 400,
      'Penolakan resep tanpa alasan ditolak oleh server (HTTP 400 - Alasan wajib)'
    );

    // Test reject WITH reason -> succeeds 200
    const rejectWithReason = await request<{ status: string; rejectionReason: string }>(
      `/api/staff/orders/${orderToReject.id}/verify-prescription`,
      {
        method: 'POST',
        token: staffToken,
        body: {
          action: 'REJECT',
          reason: 'Foto resep buram dan tidak terbaca nama dokternya. Harap foto ulang.',
        },
      }
    );
    assert(rejectWithReason.status === 200, 'Penolakan resep dengan alasan berhasil (HTTP 200)');
    assert(rejectWithReason.data.data?.status === 'CANCELLED', 'Status pesanan otomatis berubah menjadi CANCELLED');
    assert(
      Boolean(rejectWithReason.data.data?.rejectionReason),
      `Alasan penolakan tersimpan di database: "${rejectWithReason.data.data?.rejectionReason}"`
    );

    console.log('\n4️⃣  Business Rule: Order Resep Tidak Boleh Masuk PROCESSING Sebelum Resep Diverifikasi:');
    // Create another order in PENDING_VERIFICATION
    const pendingRxOrder = await prisma.order.create({
      data: {
        customerId: customer.id,
        totalAmount: 35000,
        status: 'PENDING_VERIFICATION',
        requiresPrescription: true,
        prescriptionUrl: '/uploads/prescriptions/valid_rx.png',
        items: {
          create: [{ medicineId: medRx!.id, quantity: 1, price: 35000, subtotal: 35000 }],
        },
      },
    });

    // Attempt to directly set status to PROCESSING before verifying prescription
    const directProcessingRes = await request(`/api/staff/orders/${pendingRxOrder.id}/status`, {
      method: 'PUT',
      token: staffToken,
      body: { status: 'PROCESSING' },
    });
    assert(
      directProcessingRes.status === 400,
      'Mengubah status ke PROCESSING sebelum resep diverifikasi ditolak (HTTP 400)'
    );
    assert(
      directProcessingRes.data.message?.includes('sebelum resep diverifikasi') || false,
      'Pesan validasi transisi status jelas dan informatif'
    );

    console.log('\n5️⃣  Verifikasi Resep — Menyetujui Resep (Approve):');
    const approveRes = await request<{ status: string }>(
      `/api/staff/orders/${pendingRxOrder.id}/verify-prescription`,
      {
        method: 'POST',
        token: staffToken,
        body: { action: 'APPROVE' },
      }
    );
    assert(approveRes.status === 200, 'Persetujuan resep dokter berhasil (HTTP 200)');
    assert(
      approveRes.data.data?.status === 'PENDING_PAYMENT',
      'Status pesanan beralih ke PENDING_PAYMENT setelah resep disetujui'
    );

    console.log('\n6️⃣  Validasi Seluruh Transisi 7 Status Order:');
    // Test invalid status
    const invalidStatusRes = await request(`/api/staff/orders/${pendingRxOrder.id}/status`, {
      method: 'PUT',
      token: staffToken,
      body: { status: 'STATUS_TIDAK_DIKENAL' },
    });
    assert(invalidStatusRes.status === 400, 'Perubahan status ke nilai yang tidak valid ditolak (HTTP 400)');

    // Sequential status progression: PROCESSING -> READY_FOR_PICKUP -> SHIPPED -> COMPLETED
    const step1 = await request(`/api/staff/orders/${pendingRxOrder.id}/status`, {
      method: 'PUT',
      token: staffToken,
      body: { status: 'PROCESSING' },
    });
    assert(step1.status === 200, 'Status pesanan berhasil diubah menjadi PROCESSING');

    const step2 = await request(`/api/staff/orders/${pendingRxOrder.id}/status`, {
      method: 'PUT',
      token: staffToken,
      body: { status: 'READY_FOR_PICKUP' },
    });
    assert(step2.status === 200, 'Status pesanan berhasil diubah menjadi READY_FOR_PICKUP');

    const step3 = await request(`/api/staff/orders/${pendingRxOrder.id}/status`, {
      method: 'PUT',
      token: staffToken,
      body: { status: 'SHIPPED' },
    });
    assert(step3.status === 200, 'Status pesanan berhasil diubah menjadi SHIPPED');

    const step4 = await request(`/api/staff/orders/${pendingRxOrder.id}/status`, {
      method: 'PUT',
      token: staffToken,
      body: { status: 'COMPLETED' },
    });
    assert(step4.status === 200, 'Status pesanan berhasil diubah menjadi COMPLETED');

    console.log('\n7️⃣  Manajemen Stok Obat Apotek (Tambah, Kurang, Validasi Negatif):');
    // Fetch staff medicines list
    const medListRes = await request<{ medicines: any[]; total: number }>('/api/staff/medicines', {
      token: staffToken,
    });
    assert(medListRes.status === 200, 'Staf dapat mengambil daftar stok inventaris obat (HTTP 200)');
    const targetMed = medListRes.data.data?.medicines?.[0];
    const initialStock = targetMed.stock;

    // Test ADD stock
    const addStockRes = await request<{ medicine: any }>(`/api/staff/medicines/${targetMed.id}/stock`, {
      method: 'PUT',
      token: staffToken,
      body: { action: 'ADD', amount: 15, notes: 'Restock PBF' },
    });
    assert(addStockRes.status === 200, 'Penambahan stok obat berhasil (HTTP 200)');
    assert(
      addStockRes.data.data?.medicine?.stock === initialStock + 15,
      `Stok bertambah dengan benar (${initialStock} -> ${addStockRes.data.data?.medicine?.stock})`
    );

    // Test SUBTRACT stock
    const subStockRes = await request<{ medicine: any }>(`/api/staff/medicines/${targetMed.id}/stock`, {
      method: 'PUT',
      token: staffToken,
      body: { action: 'SUBTRACT', amount: 5, notes: 'Obat rusak' },
    });
    assert(subStockRes.status === 200, 'Pengurangan stok obat berhasil (HTTP 200)');
    assert(
      subStockRes.data.data?.medicine?.stock === initialStock + 10,
      `Stok berkurang dengan benar (${initialStock + 15} -> ${subStockRes.data.data?.medicine?.stock})`
    );

    // Test SUBTRACT resulting in negative stock -> must be rejected
    const negativeStockRes = await request(`/api/staff/medicines/${targetMed.id}/stock`, {
      method: 'PUT',
      token: staffToken,
      body: { action: 'SUBTRACT', amount: initialStock + 999 },
    });
    assert(
      negativeStockRes.status === 400,
      'Pengurangan stok yang menghasilkan angka negatif ditolak (HTTP 400 - Min 0 unit)'
    );

    // Reset stock to initial
    await prisma.medicine.update({
      where: { id: targetMed.id },
      data: { stock: initialStock },
    });

  } catch (err: any) {
    console.error('Fatal Test Error:', err);
    failed++;
  }

  console.log('\n══════════════════════════════════════════════');
  console.log(`📊 Hasil Pengujian Dashboard STAFF: ${passed} passed / ${failed} failed / ${passed + failed} total`);
  if (failed === 0) {
    console.log('🎉 Seluruh pengujian fitur Dashboard STAFF berhasil 100% memenuhi semua Business Rules!');
  }
  console.log('══════════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

runStaffVerification();
