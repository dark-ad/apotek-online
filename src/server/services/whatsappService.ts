/**
 * WhatsApp Notification Service via Fonnte API for APOTEK SEHAT
 *
 * Handles reliable, server-side delivery of operational notifications
 * to Admin and Customers via Fonnte WhatsApp API (https://api.fonnte.com/send).
 *
 * Features:
 * - Dynamic configuration stored securely in SQLite database (with AES-256-GCM encryption)
 * - Automatic phone number normalization (e.g. 0857... or 62857...)
 * - Non-blocking asynchronous dispatch: failure will never interrupt order transactions
 * - In-memory event deduplication to prevent duplicate message spam
 * - Timeout handling (10s) with AbortController
 */

import { prisma } from '../../lib/db';
import { decryptApiKey, encryptApiKey, maskApiKey } from '../crypto';

const FONNTE_API_URL = 'https://api.fonnte.com/send';
const FONNTE_DEVICE_URL = 'https://api.fonnte.com/device';

// In-memory deduplication cache: dedupKey -> timestamp
const dedupCache = new Map<string, number>();
const DEDUP_TTL_MS = 2 * 60 * 1000; // 2 minutes

function isDuplicate(key: string): boolean {
  const now = Date.now();
  // Prune expired
  for (const [k, time] of dedupCache.entries()) {
    if (now - time > DEDUP_TTL_MS) dedupCache.delete(k);
  }
  if (dedupCache.has(key)) return true;
  dedupCache.set(key, now);
  return false;
}

/**
 * Format currency into IDR
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

/**
 * Normalize Indonesian phone numbers for Fonnte
 * Accepts 0857..., 62857..., +62857... -> returns standard number e.g. 085767646273
 */
export function normalizePhone(rawPhone?: string | null): string {
  if (!rawPhone) return '';
  let cleaned = rawPhone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('62')) {
    cleaned = '0' + cleaned.slice(2);
  }
  return cleaned;
}

export interface FonnteDeviceStatus {
  status: boolean;
  device?: string;
  name?: string;
  device_status?: string;
  quota?: string | number;
  package?: string;
  expired?: string;
  reason?: string;
}

export interface SendWhatsappResult {
  success: boolean;
  target: string;
  id?: string;
  message?: string;
  error?: string;
  skipped?: boolean;
}

/**
 * Get or initialize WhatsApp settings from database
 */
export async function getWhatsappSettings() {
  let setting = await prisma.whatsappSetting.findUnique({
    where: { id: 'default' },
  });

  if (!setting) {
    const defaultToken = 'Uw7sFjsy6vD5MoRavap2';
    setting = await prisma.whatsappSetting.create({
      data: {
        id: 'default',
        provider: 'fonnte',
        apiTokenEncrypted: encryptApiKey(defaultToken),
        apiTokenMasked: maskApiKey(defaultToken),
        adminPhone: '085767646273',
        isEnabled: true,
        notifyOnNewOrder: true,
        notifyOnStatusChange: true,
        notifyCustomer: true,
        senderName: 'APOTEK SEHAT',
      },
    });
  }

  return setting;
}

/**
 * Check Fonnte device connection status
 */
export async function checkFonnteStatus(customToken?: string): Promise<FonnteDeviceStatus> {
  let token = customToken;
  if (!token) {
    const setting = await getWhatsappSettings();
    if (setting.apiTokenEncrypted) {
      token = decryptApiKey(setting.apiTokenEncrypted);
    }
  }

  if (!token) {
    return { status: false, reason: 'API Token belum dikonfigurasi' };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(FONNTE_DEVICE_URL, {
      method: 'POST',
      headers: { Authorization: token },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = (await res.json()) as FonnteDeviceStatus;
    return data;
  } catch (err: any) {
    return {
      status: false,
      reason: err?.name === 'AbortError' ? 'Koneksi ke server Fonnte timeout' : err?.message || 'Gagal menghubungi Fonnte',
    };
  }
}

/**
 * Core function to send WhatsApp message via Fonnte API
 */
export async function sendWhatsappMessage(
  targetPhone: string,
  message: string,
  customToken?: string
): Promise<SendWhatsappResult> {
  const normPhone = normalizePhone(targetPhone);
  if (!normPhone || normPhone.length < 9) {
    return {
      success: false,
      target: targetPhone,
      error: 'Nomor telepon tujuan tidak valid',
      skipped: true,
    };
  }

  let token = customToken;
  let isEnabled = true;

  if (!token) {
    const setting = await getWhatsappSettings();
    isEnabled = setting.isEnabled;
    if (setting.apiTokenEncrypted) {
      token = decryptApiKey(setting.apiTokenEncrypted);
    }
  }

  if (!isEnabled) {
    return {
      success: false,
      target: normPhone,
      error: 'Fitur notifikasi WhatsApp dinonaktifkan di pengaturan',
      skipped: true,
    };
  }

  if (!token) {
    return {
      success: false,
      target: normPhone,
      error: 'API Token Fonnte tidak ditemukan',
      skipped: true,
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const params = new URLSearchParams();
    params.append('target', normPhone);
    params.append('message', message);
    params.append('countryCode', '62');

    const res = await fetch(FONNTE_API_URL, {
      method: 'POST',
      headers: {
        Authorization: token,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data: any = await res.json();

    if (data.status === true) {
      return {
        success: true,
        target: normPhone,
        id: Array.isArray(data.id) ? data.id[0] : data.id,
        message: 'Pesan berhasil terkirim via Fonnte',
      };
    } else {
      return {
        success: false,
        target: normPhone,
        error: data.reason || 'Gagal mengirim pesan dari Fonnte',
      };
    }
  } catch (err: any) {
    const isTimeout = err?.name === 'AbortError';
    return {
      success: false,
      target: normPhone,
      error: isTimeout ? 'Timeout saat menghubungi Fonnte API (10s)' : err?.message || 'Kesalahan jaringan',
    };
  }
}

/**
 * NOTIFICATION 1: Pesanan Baru Masuk (Order Created)
 * Sent to:
 * 1. Admin WhatsApp (085767646273 or setting.adminPhone)
 * 2. Customer WhatsApp (if customer phone is available)
 */
export async function notifyNewOrderWhatsapp(payload: {
  id: string;
  shortId: string;
  customerName: string;
  customerPhone?: string | null;
  totalAmount: number;
  items: Array<{ name: string; quantity: number; unit?: string }>;
  status: string;
  requiresPrescription?: boolean;
}): Promise<void> {
  const dedupKey = `new_order_${payload.id}`;
  if (isDuplicate(dedupKey)) return;

  const setting = await getWhatsappSettings();
  if (!setting.isEnabled || !setting.notifyOnNewOrder) return;

  const itemsText = payload.items
    .map((item) => `• ${item.name} (${item.quantity} ${item.unit || 'unit'})`)
    .join('\n');

  const rxNote = payload.requiresPrescription
    ? '\n⚠️ *Catatan*: Pesanan membutuhkan resep dokter (perlu verifikasi apoteker).'
    : '';

  // 1. Message for Admin
  const adminMsg =
`🔔 *NOTIFIKASI PESANAN MASUK — APOTEK SEHAT* 🔔

Halo Admin / Staf Farmasi, terdapat pesanan baru yang masuk ke sistem:

📦 *Kode Pesanan*: #${payload.shortId}
👤 *Pelanggan*: ${payload.customerName}
📱 *No. HP*: ${payload.customerPhone || '(Tidak tercantum)'}
💰 *Total Pembayaran*: ${formatRupiah(payload.totalAmount)}
📋 *Status Awal*: ${payload.status}${rxNote}

💊 *Rincian Produk*:
${itemsText}

Silakan buka Dashboard Admin untuk memverifikasi dan memproses pesanan ini:
🌐 https://apoteksehat.com/admin`;

  // Send to Admin
  if (setting.adminPhone) {
    sendWhatsappMessage(setting.adminPhone, adminMsg).catch((err) =>
      console.warn('[WhatsApp Notify Admin New Order]', err?.message)
    );
  }

  // 2. Message for Customer (if enabled & phone exists)
  if (setting.notifyCustomer && payload.customerPhone) {
    const custMsg =
`Halo Kak *${payload.customerName}*! 👋

Terima kasih telah berbelanja di *${setting.senderName}*.
Pesanan Anda telah berhasil kami terima dengan rincian berikut:

📦 *Kode Pesanan*: #${payload.shortId}
💰 *Total Tagihan*: ${formatRupiah(payload.totalAmount)}
💊 *Daftar Produk*:
${itemsText}

Pesanan Anda sedang dalam antrean pemrosesan oleh tim apoteker kami. Kami akan menginfokan kembali begitu status pesanan Anda diperbarui!

Salam sehat selalu,
*${setting.senderName}* 🏥`;

    sendWhatsappMessage(payload.customerPhone, custMsg).catch((err) =>
      console.warn('[WhatsApp Notify Customer New Order]', err?.message)
    );
  }
}

/**
 * NOTIFICATION 2: Status Pesanan Berubah (Status Changed / Completed / Cancelled)
 * Sent to: Customer & Admin
 */
export async function notifyOrderStatusChangedWhatsapp(payload: {
  id: string;
  shortId: string;
  customerName: string;
  customerPhone?: string | null;
  oldStatus?: string;
  newStatus: string;
  updatedBy?: string;
  reason?: string | null;
}): Promise<void> {
  const dedupKey = `status_change_${payload.id}_${payload.newStatus}`;
  if (isDuplicate(dedupKey)) return;

  const setting = await getWhatsappSettings();
  if (!setting.isEnabled || !setting.notifyOnStatusChange) return;

  // Build customer-specific message according to new status
  let custMsg = '';
  switch (payload.newStatus) {
    case 'PROCESSING':
      custMsg =
`Halo Kak *${payload.customerName}*! 👋

Kabar baik, pesanan Anda dengan kode *#${payload.shortId}* saat ini *SEDANG DIKEMAS & DISIAPKAN* oleh tim farmasi Apotek Sehat. 💊✨

Mohon tunggu kabar selanjutnya saat obat siap dikirimkan.`;
      break;

    case 'SHIPPED':
      custMsg =
`🚚 *PESANAN SEDANG DIKIRIM* 🚚

Halo Kak *${payload.customerName}*, paket obat untuk pesanan *#${payload.shortId}* sedang dalam perjalanan menuju alamat tujuan Anda!

Pastikan nomor telepon aktif untuk memudahkan kurir saat pengantaran.`;
      break;

    case 'READY_FOR_PICKUP':
      custMsg =
`🛍️ *PESANAN SIAP DIAMBIL* 🛍️

Halo Kak *${payload.customerName}*, pesanan Anda dengan kode *#${payload.shortId}* sudah selesai disiapkan dan *SIAP DIAMBIL* di counter Apotek Sehat.

Silakan tunjukkan kode pesanan ini kepada staf kami saat pengambilan.`;
      break;

    case 'COMPLETED':
      custMsg =
`✅ *PESANAN SELESAI — TERIMA KASIH* ✅

Halo Kak *${payload.customerName}*, pesanan *#${payload.shortId}* telah selesai.

Terima kasih telah mempercayai *${setting.senderName}* untuk kebutuhan obat dan vitamin Anda. Semoga lekas pulih dan sehat selalu! 🙏🏥`;
      break;

    case 'CANCELLED':
      custMsg =
`⚠️ *PEMBERITAHUAN PESANAN DIBATALKAN* ⚠️

Halo Kak *${payload.customerName}*, mohon maaf pesanan *#${payload.shortId}* belum dapat diproses atau telah dibatalkan.
${payload.reason ? `\n*Alasan*: ${payload.reason}` : ''}

Jika ada pertanyaan atau butuh konsultasi obat pengganti, silakan hubungi tim apoteker kami.`;
      break;

    default:
      custMsg =
`Halo Kak *${payload.customerName}*, status pesanan Anda *#${payload.shortId}* telah diperbarui menjadi: *${payload.newStatus}*.`;
  }

  // Send to Customer
  if (setting.notifyCustomer && payload.customerPhone && custMsg) {
    sendWhatsappMessage(payload.customerPhone, custMsg).catch((err) =>
      console.warn('[WhatsApp Notify Customer Status Change]', err?.message)
    );
  }

  // Send brief alert to Admin when Completed or Cancelled
  if (setting.adminPhone && (payload.newStatus === 'COMPLETED' || payload.newStatus === 'CANCELLED')) {
    const adminAlert =
`ℹ️ *UPDATE STATUS PESANAN — APOTEK SEHAT* ℹ️

Pesanan *#${payload.shortId}* (${payload.customerName}) telah diubah statusnya menjadi *${payload.newStatus}* oleh ${payload.updatedBy || 'Staf'}.
${payload.reason ? `Alasan/Catatan: ${payload.reason}` : ''}`;

    sendWhatsappMessage(setting.adminPhone, adminAlert).catch((err) =>
      console.warn('[WhatsApp Notify Admin Status Alert]', err?.message)
    );
  }
}

