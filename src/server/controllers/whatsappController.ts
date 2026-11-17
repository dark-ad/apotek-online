import type { IncomingMessage, ServerResponse } from 'http';
import { prisma } from '../../lib/db';
import { sendJson, parseJsonBody, requireAuth } from '../utils';
import { encryptApiKey, maskApiKey, decryptApiKey } from '../crypto';
import {
  getWhatsappSettings,
  checkFonnteStatus,
  sendWhatsappMessage,
  normalizePhone,
} from '../services/whatsappService';

/**
 * GET /api/admin/whatsapp/settings
 * Admin only: get current WhatsApp Fonnte settings & live device status
 */
export async function handleGetWhatsappSettings(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const admin = requireAuth(req, res, ['ADMIN']);
  if (!admin) return;

  try {
    const setting = await getWhatsappSettings();

    // Check live device status from Fonnte
    let liveDeviceStatus = null;
    if (setting.apiTokenEncrypted) {
      const decrypted = decryptApiKey(setting.apiTokenEncrypted);
      liveDeviceStatus = await checkFonnteStatus(decrypted);
    }

    sendJson(res, 200, {
      success: true,
      data: {
        id: setting.id,
        provider: setting.provider,
        apiTokenMasked: setting.apiTokenMasked,
        adminPhone: setting.adminPhone,
        isEnabled: setting.isEnabled,
        notifyOnNewOrder: setting.notifyOnNewOrder,
        notifyOnStatusChange: setting.notifyOnStatusChange,
        notifyCustomer: setting.notifyCustomer,
        senderName: setting.senderName,
        lastTestedAt: setting.lastTestedAt,
        lastTestStatus: setting.lastTestStatus,
        lastTestMessage: setting.lastTestMessage,
        liveDevice: liveDeviceStatus,
      },
    });
  } catch (err: any) {
    console.error('[WhatsApp Controller] Error fetching settings:', err);
    sendJson(res, 500, {
      success: false,
      message: 'Gagal memuat pengaturan WhatsApp: ' + (err?.message || 'Kesalahan server'),
    });
  }
}

/**
 * PUT /api/admin/whatsapp/settings
 * Admin only: update WhatsApp settings
 */
export async function handleUpdateWhatsappSettings(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const admin = requireAuth(req, res, ['ADMIN']);
  if (!admin) return;

  try {
    const body = await parseJsonBody(req);
    const existing = await getWhatsappSettings();

    const dataToUpdate: any = {};

    if (body.adminPhone !== undefined) {
      const norm = normalizePhone(body.adminPhone);
      if (!norm || norm.length < 9) {
        sendJson(res, 400, {
          success: false,
          message: 'Nomor WhatsApp admin tidak valid (minimal 9 digit).',
        });
        return;
      }
      dataToUpdate.adminPhone = norm;
    }

    if (body.apiToken && typeof body.apiToken === 'string') {
      const trimmedKey = body.apiToken.trim();
      if (trimmedKey) {
        dataToUpdate.apiTokenEncrypted = encryptApiKey(trimmedKey);
        dataToUpdate.apiTokenMasked = maskApiKey(trimmedKey);
      }
    }

    if (body.isEnabled !== undefined) dataToUpdate.isEnabled = Boolean(body.isEnabled);
    if (body.notifyOnNewOrder !== undefined) dataToUpdate.notifyOnNewOrder = Boolean(body.notifyOnNewOrder);
    if (body.notifyOnStatusChange !== undefined) dataToUpdate.notifyOnStatusChange = Boolean(body.notifyOnStatusChange);
    if (body.notifyCustomer !== undefined) dataToUpdate.notifyCustomer = Boolean(body.notifyCustomer);
    if (body.senderName !== undefined) dataToUpdate.senderName = String(body.senderName).trim();

    const updated = await prisma.whatsappSetting.update({
      where: { id: existing.id },
      data: dataToUpdate,
    });

    sendJson(res, 200, {
      success: true,
      message: 'Pengaturan notifikasi WhatsApp berhasil diperbarui.',
      data: {
        id: updated.id,
        provider: updated.provider,
        apiTokenMasked: updated.apiTokenMasked,
        adminPhone: updated.adminPhone,
        isEnabled: updated.isEnabled,
        notifyOnNewOrder: updated.notifyOnNewOrder,
        notifyOnStatusChange: updated.notifyOnStatusChange,
        notifyCustomer: updated.notifyCustomer,
        senderName: updated.senderName,
      },
    });
  } catch (err: any) {
    console.error('[WhatsApp Controller] Error updating settings:', err);
    sendJson(res, 500, {
      success: false,
      message: 'Gagal memperbarui pengaturan WhatsApp: ' + (err?.message || 'Kesalahan server'),
    });
  }
}

/**
 * POST /api/admin/whatsapp/test
 * Admin only: send a test message to verify Fonnte connection
 */
export async function handleTestWhatsapp(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const admin = requireAuth(req, res, ['ADMIN']);
  if (!admin) return;

  try {
    const body = await parseJsonBody(req);
    const setting = await getWhatsappSettings();

    const targetPhone = body.targetPhone ? normalizePhone(body.targetPhone) : setting.adminPhone;
    if (!targetPhone) {
      sendJson(res, 400, {
        success: false,
        message: 'Nomor telepon tujuan belum ditentukan.',
      });
      return;
    }

    // Custom or default test message
    const testMessage =
      body.message ||
`*TEST NOTIFIKASI WHATSAPP — APOTEK SEHAT* 🏥

Halo! Ini adalah pesan uji coba dari sistem *APOTEK SEHAT*.
Integrasi gateway WhatsApp Fonnte berfungsi dengan baik dan siap menerima notifikasi pesanan.

Waktu kirim: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB.`;

    const tokenToUse = body.apiToken ? body.apiToken.trim() : undefined;
    const sendResult = await sendWhatsappMessage(targetPhone, testMessage, tokenToUse);

    // Update database status
    await prisma.whatsappSetting.update({
      where: { id: setting.id },
      data: {
        lastTestedAt: new Date(),
        lastTestStatus: sendResult.success ? 'CONNECTED' : 'FAILED',
        lastTestMessage: sendResult.success
          ? `Terkirim ke ${targetPhone}`
          : sendResult.error || 'Gagal mengirim pesan',
      },
    });

    if (sendResult.success) {
      sendJson(res, 200, {
        success: true,
        message: `Pesan uji coba WhatsApp berhasil dikirim ke nomor ${targetPhone}!`,
        data: sendResult,
      });
    } else {
      sendJson(res, 400, {
        success: false,
        message: `Gagal mengirim pesan WhatsApp: ${sendResult.error || 'Terjadi kesalahan pada gateway Fonnte'}`,
        data: sendResult,
      });
    }
  } catch (err: any) {
    console.error('[WhatsApp Controller] Error sending test message:', err);
    sendJson(res, 500, {
      success: false,
      message: 'Gagal mengirim pesan uji coba WhatsApp: ' + (err?.message || 'Kesalahan server'),
    });
  }
}

