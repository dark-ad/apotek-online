/**
 * Telegram Notification Service for APOTEK SEHAT
 *
 * Handles server-side delivery of operational notifications to Admin and Staff
 * via the official Telegram Bot API (sendMessage with parse_mode=HTML).
 *
 * Security & Reliability Guarantees:
 * - Token is strictly kept server-side (never exposed to client or logs)
 * - Strict timeout prevention using AbortController (default 5000ms)
 * - Safe HTML entity escaping to prevent broken formatting / injection
 * - Deduplication window with TTL to avoid duplicate alerts from retries/refreshes
 * - Non-blocking execution: Telegram failure NEVER breaks database transactions
 */

export type TelegramRecipientRole = 'ADMIN' | 'STAFF' | 'BOTH';

export interface TelegramSendResult {
  success: boolean;
  recipient: string;
  messageId?: number;
  error?: string;
  skipped?: boolean;
}

export interface TelegramConfigStatus {
  enabled: boolean;
  botConfigured: boolean;
  botUsername?: string;
  adminChatIdConfigured: boolean;
  adminChatIdMasked: string | null;
  staffChatIdConfigured: boolean;
  staffChatIdMasked: string | null;
  lowStockThreshold: number;
}

// In-memory deduplication cache: key -> timestamp (ms)
const deduplicationCache = new Map<string, number>();
const DEDUP_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL

function pruneDedupCache(): void {
  const now = Date.now();
  for (const [key, timestamp] of deduplicationCache.entries()) {
    if (now - timestamp > DEDUP_TTL_MS) {
      deduplicationCache.delete(key);
    }
  }
}

export function isDuplicateEvent(dedupKey: string): boolean {
  pruneDedupCache();
  const now = Date.now();
  if (deduplicationCache.has(dedupKey)) {
    return true;
  }
  deduplicationCache.set(dedupKey, now);
  return false;
}

export function clearDedupCache(): void {
  deduplicationCache.clear();
}

export function escapeHtml(input: string | number | null | undefined): string {
  if (input === null || input === undefined) return '';
  const str = String(input);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function formatWibDateTime(date: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

export function maskChatId(chatId?: string | null): string | null {
  if (!chatId) return null;
  const str = String(chatId).trim();
  if (str.length <= 4) return '***' + str;
  return str.slice(0, 3) + '****' + str.slice(-3);
}

import fs from 'fs';
import path from 'path';

function readEnvLocalFallback(key: string): string {
  try {
    const envLocalPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envLocalPath)) {
      const content = fs.readFileSync(envLocalPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=');
          const k = trimmed.substring(0, idx).trim();
          let v = trimmed.substring(idx + 1).trim();
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
            v = v.slice(1, -1);
          }
          if (k === key) return v;
        }
      }
    }
  } catch {}
  return '';
}

export function getTelegramConfig() {
  const token = (process.env.TELEGRAM_BOT_TOKEN || readEnvLocalFallback('TELEGRAM_BOT_TOKEN') || '').trim();
  const adminChatId = (process.env.TELEGRAM_ADMIN_CHAT_ID || readEnvLocalFallback('TELEGRAM_ADMIN_CHAT_ID') || '').trim();
  const staffChatId = (process.env.TELEGRAM_STAFF_CHAT_ID || readEnvLocalFallback('TELEGRAM_STAFF_CHAT_ID') || '').trim();
  const enabledStr = (process.env.TELEGRAM_NOTIFICATIONS_ENABLED || readEnvLocalFallback('TELEGRAM_NOTIFICATIONS_ENABLED') || 'true').trim().toLowerCase();
  const enabled = enabledStr === 'true' || enabledStr === '1';

  const rawThreshold = parseInt(process.env.TELEGRAM_LOW_STOCK_THRESHOLD || readEnvLocalFallback('TELEGRAM_LOW_STOCK_THRESHOLD') || '10', 10);
  const lowStockThreshold = isNaN(rawThreshold) || rawThreshold < 1 ? 10 : rawThreshold;

  return {
    token,
    adminChatId,
    staffChatId,
    enabled,
    lowStockThreshold,
    isBotConfigured: Boolean(token),
  };
}

export function getTelegramConfigStatus(): TelegramConfigStatus {
  const config = getTelegramConfig();
  return {
    enabled: config.enabled,
    botConfigured: config.isBotConfigured,
    adminChatIdConfigured: Boolean(config.adminChatId),
    adminChatIdMasked: maskChatId(config.adminChatId),
    staffChatIdConfigured: Boolean(config.staffChatId),
    staffChatIdMasked: maskChatId(config.staffChatId),
    lowStockThreshold: config.lowStockThreshold,
  };
}

export async function sendTelegramMessage(
  chatId: string,
  htmlText: string,
  timeoutMs = 5000
): Promise<TelegramSendResult> {
  const config = getTelegramConfig();

  if (!config.enabled) {
    return {
      success: false,
      recipient: chatId,
      skipped: true,
      error: 'Notifikasi Telegram dinonaktifkan (TELEGRAM_NOTIFICATIONS_ENABLED=false)',
    };
  }

  if (!config.token) {
    return {
      success: false,
      recipient: chatId,
      skipped: true,
      error: 'TELEGRAM_BOT_TOKEN belum dikonfigurasi.',
    };
  }

  if (!chatId) {
    return {
      success: false,
      recipient: 'unknown',
      skipped: true,
      error: 'Chat ID penerima belum ditentukan.',
    };
  }

  const endpoint = `https://api.telegram.org/bot${config.token}/sendMessage`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: htmlText,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    const data: any = await response.json().catch(() => ({}));

    if (!response.ok || !data.ok) {
      const errMsg = data.description || `HTTP ${response.status} ${response.statusText}`;
      console.warn(`[Telegram Service] Gagal mengirim pesan ke ${maskChatId(chatId)}: ${errMsg}`);
      return {
        success: false,
        recipient: chatId,
        error: errMsg,
      };
    }

    return {
      success: true,
      recipient: chatId,
      messageId: data.result?.message_id,
    };
  } catch (err: any) {
    clearTimeout(timer);
    const isAbort = err?.name === 'AbortError' || err?.message?.includes('aborted');
    const errMsg = isAbort ? `Koneksi timeout setelah ${timeoutMs}ms` : err?.message || 'Network error';
    console.warn(`[Telegram Service Error] Ke ${maskChatId(chatId)}: ${errMsg}`);
    return {
      success: false,
      recipient: chatId,
      error: errMsg,
    };
  }
}

export async function dispatchNotification(
  role: TelegramRecipientRole,
  htmlText: string,
  dedupKey?: string
): Promise<TelegramSendResult[]> {
  if (dedupKey && isDuplicateEvent(dedupKey)) {
    return [
      {
        success: true,
        recipient: role,
        skipped: true,
        error: `Pesan duplikat diabaikan (key: ${dedupKey})`,
      },
    ];
  }

  const config = getTelegramConfig();
  const targetChatIds = new Set<string>();

  if (role === 'ADMIN' || role === 'BOTH') {
    if (config.adminChatId) targetChatIds.add(config.adminChatId);
  }
  if (role === 'STAFF' || role === 'BOTH') {
    if (config.staffChatId) targetChatIds.add(config.staffChatId);
  }

  // Fallback: If STAFF has no chat ID, try ADMIN
  if (role === 'STAFF' && targetChatIds.size === 0 && config.adminChatId) {
    targetChatIds.add(config.adminChatId);
  }

  if (targetChatIds.size === 0) {
    return [
      {
        success: false,
        recipient: role,
        skipped: true,
        error: `Tidak ada Chat ID yang dikonfigurasi untuk role ${role}.`,
      },
    ];
  }

  const results: TelegramSendResult[] = [];
  for (const chatId of targetChatIds) {
    const res = await sendTelegramMessage(chatId, htmlText);
    results.push(res);
  }

  return results;
}

export async function notifyOrderCreated(order: {
  id: string;
  shortId?: string;
  totalAmount: number;
  itemCount: number;
  status: string;
  requiresPrescription: boolean;
  prescriptionUrl?: string | null;
  customerName?: string;
  createdAt?: Date;
}): Promise<TelegramSendResult[]> {
  const shortId = order.shortId || order.id.slice(-8).toUpperCase();
  const dedupKey = `ORDER_CREATED:${order.id}`;

  const rxStatus = order.requiresPrescription
    ? (order.prescriptionUrl ? '⚠️ <b>Perlu Verifikasi Resep Dokter</b>' : '⚠️ <i>Resep Belum Diunggah</i>')
    : '✅ <i>Obat Bebas / Non-Resep</i>';

  const html = `
📦 <b>PESANAN BARU MASUK</b> — <code>#${escapeHtml(shortId)}</code>
━━━━━━━━━━━━━━━━━━━━
⏰ <b>Waktu:</b> ${formatWibDateTime(order.createdAt || new Date())}
👤 <b>Pelanggan:</b> ${escapeHtml(order.customerName || 'Customer')}
🛍️ <b>Jumlah Item:</b> ${escapeHtml(order.itemCount)} produk
💰 <b>Total Tagihan:</b> ${formatRupiah(order.totalAmount)}
📋 <b>Status:</b> <code>${escapeHtml(order.status)}</code>
💊 <b>Kebutuhan Resep:</b> ${rxStatus}
━━━━━━━━━━━━━━━━━━━━
<i>Segera tinjau melalui Dashboard Operasional Apotek Sehat.</i>
`.trim();

  return dispatchNotification('BOTH', html, dedupKey);
}

export async function notifyPrescriptionReviewRequired(order: {
  id: string;
  shortId?: string;
  customerName?: string;
  totalAmount: number;
  createdAt?: Date;
}): Promise<TelegramSendResult[]> {
  const shortId = order.shortId || order.id.slice(-8).toUpperCase();
  const dedupKey = `RX_REVIEW:${order.id}`;

  const html = `
🩺 <b>PERMINTAAN VERIFIKASI RESEP DOKTER</b>
━━━━━━━━━━━━━━━━━━━━
🆔 <b>No. Pesanan:</b> <code>#${escapeHtml(shortId)}</code>
⏰ <b>Waktu:</b> ${formatWibDateTime(order.createdAt || new Date())}
👤 <b>Pasien/Pelanggan:</b> ${escapeHtml(order.customerName || 'Customer')}
💵 <b>Nilai Pesanan:</b> ${formatRupiah(order.totalAmount)}
⏳ <b>Status:</b> <code>PENDING_VERIFICATION</code>
━━━━━━━━━━━━━━━━━━━━
⚠️ <i>Mohon Staf Apoteker segera membuka dashboard untuk memeriksa keaslian dan kesesuaian resep dokter.</i>
`.trim();

  return dispatchNotification('STAFF', html, dedupKey);
}

export async function notifyPrescriptionApproved(order: {
  id: string;
  shortId?: string;
  verifierName?: string;
  nextStatus: string;
}): Promise<TelegramSendResult[]> {
  const shortId = order.shortId || order.id.slice(-8).toUpperCase();
  const dedupKey = `RX_APPROVED:${order.id}`;

  const html = `
✅ <b>RESEP DOKTER TELAH DISETUJUI</b>
━━━━━━━━━━━━━━━━━━━━
🆔 <b>No. Pesanan:</b> <code>#${escapeHtml(shortId)}</code>
⏰ <b>Waktu:</b> ${formatWibDateTime()}
👨‍⚕️ <b>Diverifikasi Oleh:</b> ${escapeHtml(order.verifierName || 'Staf Apoteker')}
🔄 <b>Status Baru:</b> <code>${escapeHtml(order.nextStatus)}</code>
━━━━━━━━━━━━━━━━━━━━
<i>Pesanan dapat dilanjutkan ke tahap pembayaran atau peracikan obat.</i>
`.trim();

  return dispatchNotification('BOTH', html, dedupKey);
}

export async function notifyPrescriptionRejected(order: {
  id: string;
  shortId?: string;
  verifierName?: string;
  reason: string;
}): Promise<TelegramSendResult[]> {
  const shortId = order.shortId || order.id.slice(-8).toUpperCase();
  const dedupKey = `RX_REJECTED:${order.id}`;

  const html = `
❌ <b>RESEP DOKTER DITOLAK</b>
━━━━━━━━━━━━━━━━━━━━
🆔 <b>No. Pesanan:</b> <code>#${escapeHtml(shortId)}</code>
⏰ <b>Waktu:</b> ${formatWibDateTime()}
👨‍⚕️ <b>Diverifikasi Oleh:</b> ${escapeHtml(order.verifierName || 'Staf Apoteker')}
🚫 <b>Alasan Penolakan:</b>
<blockquote>${escapeHtml(order.reason)}</blockquote>
📋 <b>Status Akhir:</b> <code>CANCELLED</code>
━━━━━━━━━━━━━━━━━━━━
<i>Pesanan telah dibatalkan secara otomatis sesuai prosedur farmasi.</i>
`.trim();

  return dispatchNotification('BOTH', html, dedupKey);
}

export async function notifyOrderStatusChanged(order: {
  id: string;
  shortId?: string;
  oldStatus?: string;
  newStatus: string;
  updatedBy?: string;
  notes?: string;
}): Promise<TelegramSendResult[]> {
  const IMPORTANT_STATUSES = ['PROCESSING', 'READY_FOR_PICKUP', 'SHIPPED', 'COMPLETED', 'CANCELLED'];
  if (!IMPORTANT_STATUSES.includes(order.newStatus)) {
    return [];
  }

  const shortId = order.shortId || order.id.slice(-8).toUpperCase();
  const dedupKey = `STATUS_CHANGE:${order.id}:${order.newStatus}`;

  const statusIcons: Record<string, string> = {
    PROCESSING: '⚙️ Sedang Diproses/Dirapikan',
    READY_FOR_PICKUP: '🛍️ Siap Diambil di Apotek',
    SHIPPED: '🚚 Sedang Dikirim ke Alamat',
    COMPLETED: '🎉 Pesanan Selesai / Diterima',
    CANCELLED: '🚫 Pesanan Dibatalkan',
  };

  const statusDisplay = statusIcons[order.newStatus] || order.newStatus;

  const html = `
🔄 <b>PERUBAHAN STATUS PESANAN</b>
━━━━━━━━━━━━━━━━━━━━
🆔 <b>No. Pesanan:</b> <code>#${escapeHtml(shortId)}</code>
⏰ <b>Waktu:</b> ${formatWibDateTime()}
📊 <b>Status Baru:</b> <b>${escapeHtml(statusDisplay)}</b>
${order.oldStatus ? `⏮️ <b>Status Sebelumnya:</b> <code>${escapeHtml(order.oldStatus)}</code>\n` : ''}${order.updatedBy ? `👤 <b>Diperbarui Oleh:</b> ${escapeHtml(order.updatedBy)}\n` : ''}${order.notes ? `📝 <b>Catatan:</b> ${escapeHtml(order.notes)}\n` : ''}━━━━━━━━━━━━━━━━━━━━
<i>Data sistem diperbarui otomatis di Apotek Sehat AI.</i>
`.trim();

  return dispatchNotification('BOTH', html, dedupKey);
}

export async function notifyLowStock(medicine: {
  id: string;
  name: string;
  stock: number;
  unit: string;
  category?: string;
  threshold?: number;
}): Promise<TelegramSendResult[]> {
  const config = getTelegramConfig();
  const threshold = medicine.threshold ?? config.lowStockThreshold;

  if (medicine.stock > threshold) {
    return [];
  }

  const dedupKey = `LOW_STOCK:${medicine.id}:${medicine.stock}`;

  const isOutOfStock = medicine.stock <= 0;
  const alertIcon = isOutOfStock ? '🚨' : '⚠️';
  const alertTitle = isOutOfStock ? 'STOK OBAT HABIS (OUT OF STOCK)' : 'PERINGATAN STOK OBAT MENIPIS';

  const html = `
${alertIcon} <b>${alertTitle}</b>
━━━━━━━━━━━━━━━━━━━━
💊 <b>Nama Obat:</b> <b>${escapeHtml(medicine.name)}</b>
🏷️ <b>Kategori:</b> ${escapeHtml(medicine.category || 'Umum')}
📦 <b>Sisa Stok Sekarang:</b> <code>${escapeHtml(medicine.stock)} ${escapeHtml(medicine.unit)}</code>
🎯 <b>Batas Minimum Stok:</b> ${escapeHtml(threshold)} ${escapeHtml(medicine.unit)}
⏰ <b>Waktu Terdeteksi:</b> ${formatWibDateTime()}
━━━━━━━━━━━━━━━━━━━━
<i>Segera lakukan restock atau hubungi distributor resmi untuk pemesanan ulang.</i>
`.trim();

  return dispatchNotification('ADMIN', html, dedupKey);
}

export async function sendTestNotification(
  targetRole: TelegramRecipientRole = 'ADMIN',
  testerName = 'Administrator'
): Promise<TelegramSendResult[]> {
  const html = `
🧪 <b>UJI COBA NOTIFIKASI TELEGRAM BERHASIL</b>
━━━━━━━━━━━━━━━━━━━━
🏥 <b>Aplikasi:</b> Apotek Sehat AI
👤 <b>Penguji:</b> ${escapeHtml(testerName)}
🎯 <b>Target Role:</b> <code>${escapeHtml(targetRole)}</code>
⏰ <b>Waktu:</b> ${formatWibDateTime()}
━━━━━━━━━━━━━━━━━━━━
✅ <i>Koneksi antara Apotek Sehat dan Telegram Bot API berjalan dengan normal dan siap mengirimkan notifikasi operasional apotek.</i>
`.trim();

  return dispatchNotification(targetRole, html);
}
