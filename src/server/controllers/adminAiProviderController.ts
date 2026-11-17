import type { IncomingMessage, ServerResponse } from 'http';
import { prisma } from '../../lib/db';
import { sendJson, parseJsonBody, getAuthenticatedUser } from '../utils';
import { encryptApiKey, decryptApiKey, maskApiKey } from '../crypto';
import {
  fetchProviderModels,
  testProviderConnection,
  AiProviderType,
  PROVIDER_TEMPLATES,
} from '../services/aiProviderService';

function requireAdmin(req: IncomingMessage, res: ServerResponse): boolean {
  const user = getAuthenticatedUser(req);
  if (!user) {
    sendJson(res, 401, {
      success: false,
      message: 'Sesi login telah berakhir. Silakan login kembali.',
    });
    return false;
  }
  if (user.role !== 'ADMIN') {
    sendJson(res, 403, {
      success: false,
      message: 'Akses ditolak: Hanya peran ADMIN yang memiliki izin konfigurasi AI.',
    });
    return false;
  }
  return true;
}

/**
 * GET /api/admin/ai-providers — Ambil daftar seluruh provider yang tersimpan
 */
export async function handleGetAiProviders(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  if (!requireAdmin(req, res)) return;

  try {
    const providers = await prisma.aiProvider.findMany({
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
      select: {
        id: true,
        providerType: true,
        name: true,
        baseUrl: true,
        apiKeyMasked: true,
        modelId: true,
        isActive: true,
        isVerified: true,
        connectionStatus: true,
        lastTestedAt: true,
        lastError: true,
        isFallback: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    sendJson(res, 200, {
      success: true,
      data: providers,
    });
  } catch (err: any) {
    console.error('[AI CONFIG] Failed to get providers:', err);
    sendJson(res, 500, {
      success: false,
      message: 'Gagal memuat daftar provider AI.',
    });
  }
}

/**
 * GET /api/admin/ai-providers/:id — Detail single provider
 */
export async function handleGetAiProviderDetail(
  req: IncomingMessage,
  res: ServerResponse,
  id: string
): Promise<void> {
  if (!requireAdmin(req, res)) return;

  try {
    const provider = await prisma.aiProvider.findUnique({
      where: { id },
      select: {
        id: true,
        providerType: true,
        name: true,
        baseUrl: true,
        apiKeyMasked: true,
        modelId: true,
        isActive: true,
        isVerified: true,
        connectionStatus: true,
        lastTestedAt: true,
        lastError: true,
        isFallback: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!provider) {
      sendJson(res, 404, { success: false, message: 'Provider AI tidak ditemukan.' });
      return;
    }

    sendJson(res, 200, { success: true, data: provider });
  } catch (err: any) {
    console.error('[AI CONFIG] Failed to get provider detail:', err);
    sendJson(res, 500, { success: false, message: 'Gagal memuat detail provider.' });
  }
}

/**
 * POST /api/admin/ai-providers — Tambah provider baru
 */
export async function handleCreateAiProvider(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  if (!requireAdmin(req, res)) return;

  try {
    const body = await parseJsonBody(req);
    const {
      providerType,
      name,
      baseUrl,
      apiKey,
      modelId,
      isActive,
      isFallback,
    } = body;

    if (!providerType || !name || !baseUrl || !modelId) {
      sendJson(res, 400, {
        success: false,
        message: 'Tipe provider, nama, URL endpoint, dan model wajib diisi.',
      });
      return;
    }

    if (!apiKey && providerType !== 'custom') {
      sendJson(res, 400, {
        success: false,
        message: 'API Key wajib diisi untuk provider ini.',
      });
      return;
    }

    const encryptedKey = apiKey ? encryptApiKey(apiKey) : null;
    const maskedKey = apiKey ? maskApiKey(apiKey) : null;

    // Ketentuan: Jika langsung ingin dijadikan aktif, verifikasi koneksi terlebih dahulu
    let isVerified = false;
    let connectionStatus = 'UNVERIFIED';
    let lastTestedAt: Date | null = null;
    let lastError: string | null = null;

    if (isActive) {
      const test = await testProviderConnection(
        providerType as AiProviderType,
        baseUrl,
        apiKey || '',
        modelId
      );
      if (!test.success) {
        sendJson(res, 400, {
          success: false,
          message: `Tidak dapat mengaktifkan provider yang belum terverifikasi: ${test.message}`,
        });
        return;
      }
      isVerified = true;
      connectionStatus = 'CONNECTED';
      lastTestedAt = new Date();
    }

    // Pastikan hanya satu provider aktif
    if (isActive) {
      await prisma.aiProvider.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }

    if (isFallback) {
      await prisma.aiProvider.updateMany({
        where: { isFallback: true },
        data: { isFallback: false },
      });
    }

    const newProvider = await prisma.aiProvider.create({
      data: {
        providerType,
        name,
        baseUrl: baseUrl.trim(),
        apiKeyEncrypted: encryptedKey,
        apiKeyMasked: maskedKey,
        modelId: modelId.trim(),
        isActive: !!isActive,
        isVerified,
        connectionStatus,
        lastTestedAt,
        lastError,
        isFallback: !!isFallback,
      },
      select: {
        id: true,
        providerType: true,
        name: true,
        baseUrl: true,
        apiKeyMasked: true,
        modelId: true,
        isActive: true,
        isVerified: true,
        connectionStatus: true,
        lastTestedAt: true,
        isFallback: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    sendJson(res, 201, {
      success: true,
      message: `Konfigurasi provider "${newProvider.name}" berhasil disimpan.`,
      data: newProvider,
    });
  } catch (err: any) {
    console.error('[AI CONFIG] Create provider error:', err);
    sendJson(res, 500, {
      success: false,
      message: `Gagal menyimpan konfigurasi provider: ${err?.message || 'Kesalahan server'}`,
    });
  }
}

/**
 * PUT /api/admin/ai-providers/:id — Edit provider
 */
export async function handleUpdateAiProvider(
  req: IncomingMessage,
  res: ServerResponse,
  id: string
): Promise<void> {
  if (!requireAdmin(req, res)) return;

  try {
    const existing = await prisma.aiProvider.findUnique({ where: { id } });
    if (!existing) {
      sendJson(res, 404, { success: false, message: 'Provider tidak ditemukan.' });
      return;
    }

    const body = await parseJsonBody(req);
    const {
      providerType,
      name,
      baseUrl,
      apiKey,
      modelId,
      isActive,
      isFallback,
    } = body;

    const dataToUpdate: any = {};
    if (name) dataToUpdate.name = name;
    if (providerType) dataToUpdate.providerType = providerType;
    if (baseUrl) dataToUpdate.baseUrl = baseUrl.trim();
    if (modelId) dataToUpdate.modelId = modelId.trim();

    // Jika API key baru diisi, enkripsi ulang
    let resolvedApiKey = decryptApiKey(existing.apiKeyEncrypted);
    if (apiKey && apiKey.trim()) {
      dataToUpdate.apiKeyEncrypted = encryptApiKey(apiKey.trim());
      dataToUpdate.apiKeyMasked = maskApiKey(apiKey.trim());
      resolvedApiKey = apiKey.trim();
      // Reset status verifikasi karena key berubah
      dataToUpdate.isVerified = false;
      dataToUpdate.connectionStatus = 'UNVERIFIED';
    }

    // Jika diminta aktif, pastikan terverifikasi
    if (isActive !== undefined) {
      if (isActive && !existing.isVerified && !dataToUpdate.isVerified) {
        // Coba uji koneksi otomatis sebelum mengaktifkan
        const targetType = (dataToUpdate.providerType || existing.providerType) as AiProviderType;
        const targetUrl = dataToUpdate.baseUrl || existing.baseUrl;
        const targetModel = dataToUpdate.modelId || existing.modelId;

        const test = await testProviderConnection(targetType, targetUrl, resolvedApiKey, targetModel);
        if (!test.success) {
          sendJson(res, 400, {
            success: false,
            message: `Gagal mengaktifkan provider: Pengujian koneksi gagal (${test.message})`,
          });
          return;
        }

        dataToUpdate.isVerified = true;
        dataToUpdate.connectionStatus = 'CONNECTED';
        dataToUpdate.lastTestedAt = new Date();
      }

      if (isActive) {
        await prisma.aiProvider.updateMany({
          where: { id: { not: id }, isActive: true },
          data: { isActive: false },
        });
        dataToUpdate.isActive = true;
      } else {
        dataToUpdate.isActive = false;
      }
    }

    if (isFallback !== undefined) {
      if (isFallback) {
        await prisma.aiProvider.updateMany({
          where: { id: { not: id }, isFallback: true },
          data: { isFallback: false },
        });
        dataToUpdate.isFallback = true;
      } else {
        dataToUpdate.isFallback = false;
      }
    }

    const updated = await prisma.aiProvider.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        providerType: true,
        name: true,
        baseUrl: true,
        apiKeyMasked: true,
        modelId: true,
        isActive: true,
        isVerified: true,
        connectionStatus: true,
        lastTestedAt: true,
        isFallback: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    sendJson(res, 200, {
      success: true,
      message: `Konfigurasi provider "${updated.name}" berhasil diperbarui.`,
      data: updated,
    });
  } catch (err: any) {
    console.error('[AI CONFIG] Update provider error:', err);
    sendJson(res, 500, {
      success: false,
      message: `Gagal memperbarui konfigurasi: ${err?.message || 'Kesalahan server'}`,
    });
  }
}

/**
 * DELETE /api/admin/ai-providers/:id — Hapus provider
 */
export async function handleDeleteAiProvider(
  req: IncomingMessage,
  res: ServerResponse,
  id: string
): Promise<void> {
  if (!requireAdmin(req, res)) return;

  try {
    const existing = await prisma.aiProvider.findUnique({ where: { id } });
    if (!existing) {
      sendJson(res, 404, { success: false, message: 'Provider tidak ditemukan.' });
      return;
    }

    await prisma.aiProvider.delete({ where: { id } });

    sendJson(res, 200, {
      success: true,
      message: `Provider "${existing.name}" berhasil dihapus.`,
    });
  } catch (err: any) {
    console.error('[AI CONFIG] Delete provider error:', err);
    sendJson(res, 500, {
      success: false,
      message: 'Gagal menghapus provider AI.',
    });
  }
}

/**
 * POST /api/admin/ai-providers/:id/set-active — Jadikan provider aktif utama
 */
export async function handleSetActiveAiProvider(
  req: IncomingMessage,
  res: ServerResponse,
  id: string
): Promise<void> {
  if (!requireAdmin(req, res)) return;

  try {
    const target = await prisma.aiProvider.findUnique({ where: { id } });
    if (!target) {
      sendJson(res, 404, { success: false, message: 'Provider tidak ditemukan.' });
      return;
    }

    // Ketentuan: Provider yang belum berhasil diverifikasi tidak boleh diaktifkan
    if (!target.isVerified) {
      // Coba verifikasi otomatis sekali lagi
      const apiKey = decryptApiKey(target.apiKeyEncrypted);
      const test = await testProviderConnection(
        target.providerType as AiProviderType,
        target.baseUrl,
        apiKey,
        target.modelId
      );

      if (!test.success) {
        sendJson(res, 400, {
          success: false,
          message: `Provider belum berhasil diverifikasi. Lakukan Uji Koneksi terlebih dahulu (${test.message}).`,
        });
        return;
      }

      await prisma.aiProvider.update({
        where: { id },
        data: {
          isVerified: true,
          connectionStatus: 'CONNECTED',
          lastTestedAt: new Date(),
        },
      });
    }

    // Nonaktifkan semua provider lain
    await prisma.aiProvider.updateMany({
      where: { id: { not: id }, isActive: true },
      data: { isActive: false },
    });

    // Aktifkan target provider
    const activated = await prisma.aiProvider.update({
      where: { id },
      data: { isActive: true },
      select: {
        id: true,
        name: true,
        providerType: true,
        modelId: true,
        isActive: true,
      },
    });

    sendJson(res, 200, {
      success: true,
      message: `Provider "${activated.name}" (${activated.modelId}) sekarang menjadi provider aktif untuk chatbot.`,
      data: activated,
    });
  } catch (err: any) {
    console.error('[AI CONFIG] Set active error:', err);
    sendJson(res, 500, {
      success: false,
      message: 'Gagal mengaktifkan provider AI.',
    });
  }
}

/**
 * POST /api/admin/ai-providers/:id/set-fallback — Jadikan provider fallback cadangan
 */
export async function handleSetFallbackAiProvider(
  req: IncomingMessage,
  res: ServerResponse,
  id: string
): Promise<void> {
  if (!requireAdmin(req, res)) return;

  try {
    const target = await prisma.aiProvider.findUnique({ where: { id } });
    if (!target) {
      sendJson(res, 404, { success: false, message: 'Provider tidak ditemukan.' });
      return;
    }

    const newFallbackState = !target.isFallback;
    if (newFallbackState) {
      await prisma.aiProvider.updateMany({
        where: { id: { not: id }, isFallback: true },
        data: { isFallback: false },
      });
    }

    await prisma.aiProvider.update({
      where: { id },
      data: { isFallback: newFallbackState },
    });

    sendJson(res, 200, {
      success: true,
      message: newFallbackState
        ? `Provider "${target.name}" ditetapkan sebagai fallback cadangan.`
        : `Provider "${target.name}" dinonaktifkan dari status fallback.`,
    });
  } catch (err: any) {
    console.error('[AI CONFIG] Set fallback error:', err);
    sendJson(res, 500, { success: false, message: 'Gagal mengatur status fallback.' });
  }
}

/**
 * POST /api/admin/ai-providers/test-connection — Uji koneksi live ke API provider
 */
export async function handleTestAiConnection(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  if (!requireAdmin(req, res)) return;

  try {
    const body = await parseJsonBody(req);
    let { id, providerType, baseUrl, apiKey, modelId } = body;

    // Jika testing provider yang sudah tersimpan di database dan API key tidak dikirim ulang
    if (id && (!apiKey || !apiKey.trim())) {
      const stored = await prisma.aiProvider.findUnique({ where: { id } });
      if (stored) {
        apiKey = decryptApiKey(stored.apiKeyEncrypted);
        providerType = providerType || stored.providerType;
        baseUrl = baseUrl || stored.baseUrl;
        modelId = modelId || stored.modelId;
      }
    }

    if (!providerType || !modelId) {
      sendJson(res, 400, {
        success: false,
        message: 'Tipe provider dan model ID wajib disertakan untuk pengujian.',
      });
      return;
    }

    const result = await testProviderConnection(
      providerType as AiProviderType,
      baseUrl || '',
      apiKey || '',
      modelId
    );

    // Update status ke database jika pengujian dilakukan pada provider tersimpan
    if (id) {
      await prisma.aiProvider.update({
        where: { id },
        data: {
          isVerified: result.success,
          connectionStatus: result.success ? 'CONNECTED' : 'FAILED',
          lastTestedAt: new Date(),
          lastError: result.success ? null : result.message,
        },
      });
    }

    sendJson(res, 200, {
      success: result.success,
      data: result,
      message: result.message,
    });
  } catch (err: any) {
    console.error('[AI CONFIG] Test connection error:', err);
    sendJson(res, 500, {
      success: false,
      message: `Terjadi kendala saat menguji koneksi: ${err?.message || 'Kesalahan jaringan'}`,
    });
  }
}

/**
 * POST /api/admin/ai-providers/fetch-models — Ambil daftar model dari endpoint provider
 */
export async function handleFetchAiModels(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  if (!requireAdmin(req, res)) return;

  try {
    const body = await parseJsonBody(req);
    let { id, providerType, baseUrl, apiKey } = body;

    if (id && (!apiKey || !apiKey.trim())) {
      const stored = await prisma.aiProvider.findUnique({ where: { id } });
      if (stored) {
        apiKey = decryptApiKey(stored.apiKeyEncrypted);
        providerType = providerType || stored.providerType;
        baseUrl = baseUrl || stored.baseUrl;
      }
    }

    if (!providerType) {
      sendJson(res, 400, {
        success: false,
        message: 'Tipe provider wajib ditentukan.',
      });
      return;
    }

    const models = await fetchProviderModels(
      providerType as AiProviderType,
      baseUrl || '',
      apiKey || ''
    );

    sendJson(res, 200, {
      success: true,
      data: models,
      message: `Berhasil memuat ${models.length} model untuk ${PROVIDER_TEMPLATES[providerType as AiProviderType]?.name || providerType}.`,
    });
  } catch (err: any) {
    console.error('[AI CONFIG] Fetch models error:', err);
    sendJson(res, 500, {
      success: false,
      message: `Gagal memuat model: ${err?.message || 'Endpoint tidak merespon'}`,
    });
  }
}

