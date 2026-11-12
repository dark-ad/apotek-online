import type { IncomingMessage, ServerResponse } from 'http';
import { sendJson, parseJsonBody, requireAuth } from '../utils';
import {
  getTelegramConfigStatus,
  sendTestNotification,
  TelegramRecipientRole,
} from '../services/telegramService';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * GET /api/admin/telegram/status
 * Get Telegram configuration status for Admin dashboard (safe, no secret tokens leaked)
 */
export async function handleGetTelegramStatus(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const admin = requireAuth(req, res, ['ADMIN']);
  if (!admin) return;

  const status = getTelegramConfigStatus();
  sendJson(res, 200, {
    success: true,
    data: status,
  });
}

/**
 * POST /api/admin/telegram/test
 * Send a test Telegram notification (Admin only)
 */
export async function handleTestTelegramNotification(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const admin = requireAuth(req, res, ['ADMIN']);
  if (!admin) return;

  const body = await parseJsonBody(req);
  const targetRole: TelegramRecipientRole =
    body.targetRole === 'STAFF' || body.targetRole === 'BOTH' ? body.targetRole : 'ADMIN';

  const results = await sendTestNotification(targetRole, admin.name || 'Admin Apotek Sehat');

  const allSuccess = results.length > 0 && results.every((r) => r.success);
  const hasError = results.find((r) => !r.success && !r.skipped);

  if (allSuccess) {
    sendJson(res, 200, {
      success: true,
      message: `Notifikasi uji coba Telegram berhasil dikirim ke target ${targetRole}!`,
      data: {
        results,
      },
    });
    return;
  }

  if (hasError) {
    sendJson(res, 400, {
      success: false,
      message: `Gagal mengirim notifikasi Telegram: ${hasError.error || 'Terjadi kesalahan pada Telegram API'}`,
      data: {
        results,
      },
    });
    return;
  }

  // Skipped (e.g., chat ID not configured or disabled)
  const skippedMsg = results[0]?.error || 'Pengiriman diabaikan. Pastikan Chat ID sudah diisi.';
  sendJson(res, 400, {
    success: false,
    message: skippedMsg,
    data: {
      results,
    },
  });
}

/**
 * PUT /api/admin/telegram/config
 * Update Chat IDs or threshold dynamically from Admin dashboard (Admin only)
 */
export async function handleUpdateTelegramConfig(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const admin = requireAuth(req, res, ['ADMIN']);
  if (!admin) return;

  const body = await parseJsonBody(req);
  const adminChatId = body.adminChatId !== undefined ? String(body.adminChatId).trim() : null;
  const staffChatId = body.staffChatId !== undefined ? String(body.staffChatId).trim() : null;
  const enabled = body.enabled !== undefined ? Boolean(body.enabled) : null;
  const lowStockThreshold = body.lowStockThreshold !== undefined ? parseInt(body.lowStockThreshold, 10) : null;

  // Update in process.env
  if (adminChatId !== null) process.env.TELEGRAM_ADMIN_CHAT_ID = adminChatId;
  if (staffChatId !== null) process.env.TELEGRAM_STAFF_CHAT_ID = staffChatId;
  if (enabled !== null) process.env.TELEGRAM_NOTIFICATIONS_ENABLED = enabled ? 'true' : 'false';
  if (lowStockThreshold !== null && !isNaN(lowStockThreshold)) {
    process.env.TELEGRAM_LOW_STOCK_THRESHOLD = String(lowStockThreshold);
  }

  // Update .env file if it exists
  const envPath = join(process.cwd(), '.env');
  if (existsSync(envPath)) {
    try {
      let envContent = readFileSync(envPath, 'utf8');

      if (adminChatId !== null) {
        if (envContent.match(/^TELEGRAM_ADMIN_CHAT_ID=.*/m)) {
          envContent = envContent.replace(/^TELEGRAM_ADMIN_CHAT_ID=.*/m, `TELEGRAM_ADMIN_CHAT_ID=${adminChatId}`);
        } else {
          envContent += `\nTELEGRAM_ADMIN_CHAT_ID=${adminChatId}`;
        }
      }

      if (staffChatId !== null) {
        if (envContent.match(/^TELEGRAM_STAFF_CHAT_ID=.*/m)) {
          envContent = envContent.replace(/^TELEGRAM_STAFF_CHAT_ID=.*/m, `TELEGRAM_STAFF_CHAT_ID=${staffChatId}`);
        } else {
          envContent += `\nTELEGRAM_STAFF_CHAT_ID=${staffChatId}`;
        }
      }

      if (enabled !== null) {
        const val = enabled ? 'true' : 'false';
        if (envContent.match(/^TELEGRAM_NOTIFICATIONS_ENABLED=.*/m)) {
          envContent = envContent.replace(/^TELEGRAM_NOTIFICATIONS_ENABLED=.*/m, `TELEGRAM_NOTIFICATIONS_ENABLED=${val}`);
        } else {
          envContent += `\nTELEGRAM_NOTIFICATIONS_ENABLED=${val}`;
        }
      }

      if (lowStockThreshold !== null && !isNaN(lowStockThreshold)) {
        if (envContent.match(/^TELEGRAM_LOW_STOCK_THRESHOLD=.*/m)) {
          envContent = envContent.replace(/^TELEGRAM_LOW_STOCK_THRESHOLD=.*/m, `TELEGRAM_LOW_STOCK_THRESHOLD=${lowStockThreshold}`);
        } else {
          envContent += `\nTELEGRAM_LOW_STOCK_THRESHOLD=${lowStockThreshold}`;
        }
      }

      writeFileSync(envPath, envContent, 'utf8');
    } catch (err: any) {
      console.warn('[Telegram Controller] Gagal menulis ke .env:', err.message);
    }
  }

  sendJson(res, 200, {
    success: true,
    message: 'Pengaturan Telegram berhasil diperbarui.',
    data: getTelegramConfigStatus(),
  });
}
