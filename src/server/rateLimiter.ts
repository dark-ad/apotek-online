import type { IncomingMessage, ServerResponse } from 'http';
import { sendJson } from './utils';

interface RateLimitConfig {
  windowMs: number; // Jendela waktu dalam milidetik
  maxRequests: number; // Batas maksimum request dalam windowMs
  message: string;
}

interface ClientRecord {
  timestamps: number[];
}

// In-memory store per scope
const ipBuckets = new Map<string, ClientRecord>();

// Bersihkan rekaman kadaluwarsa secara berkala setiap 5 menit
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of ipBuckets.entries()) {
    // Ambil window maksimum (15 menit = 900.000 ms)
    record.timestamps = record.timestamps.filter((ts) => now - ts < 15 * 60 * 1000);
    if (record.timestamps.length === 0) {
      ipBuckets.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Ekstraksi alamat IP client dari request headers atau socket
 */
export function getClientIp(req: IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

/**
 * Terapkan rate limit pada request.
 * Mengembalikan true jika request diizinkan, false jika melebihi batas (dan otomatis mengirim respons HTTP 429).
 */
export function checkRateLimit(
  req: IncomingMessage,
  res: ServerResponse,
  scope: string,
  config: RateLimitConfig
): boolean {
  const ip = getClientIp(req);
  const key = `${scope}:${ip}`;
  const now = Date.now();

  let record = ipBuckets.get(key);
  if (!record) {
    record = { timestamps: [] };
    ipBuckets.set(key, record);
  }

  // Hapus timestamp yang berada di luar windowMs
  record.timestamps = record.timestamps.filter((ts) => now - ts < config.windowMs);

  if (record.timestamps.length >= config.maxRequests) {
    const oldestTimestamp = record.timestamps[0];
    const retryAfterSec = Math.max(1, Math.ceil((oldestTimestamp + config.windowMs - now) / 1000));

    res.setHeader('Retry-After', String(retryAfterSec));
    sendJson(res, 429, {
      success: false,
      message: `${config.message} Silakan coba lagi dalam ${retryAfterSec} detik.`,
      errors: {
        rateLimit: 'Terlalu banyak permintaan dalam waktu singkat (HTTP 429 Too Many Requests).',
      },
    });
    return false;
  }

  record.timestamps.push(now);
  return true;
}

// Preset konfigurasi keamanan
export const RATE_LIMIT_CONFIGS = {
  // Login: Maksimal 10 percobaan per 15 menit per IP (mencegah brute force password)
  LOGIN: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 10,
    message: 'Terlalu banyak percobaan login gagal dari IP Anda.',
  },
  // Register: Maksimal 30 akun baru per 1 jam per IP (mencegah spam pendaftaran)
  REGISTER: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 30,
    message: 'Batas pendaftaran akun baru tercapai untuk sesi ini.',
  },
  // AI Chat: Maksimal 25 pesan per 1 menit per IP (mencegah abuse token AI)
  AI_CHAT: {
    windowMs: 60 * 1000,
    maxRequests: 25,
    message: 'Anda mengirim pesan ke Asisten AI terlalu cepat.',
  },
  // File Upload: Maksimal 12 unggahan resep per 10 menit per IP
  UPLOAD: {
    windowMs: 10 * 60 * 1000,
    maxRequests: 12,
    message: 'Batas unggah berkas tercapai.',
  },
  // General API: Maksimal 200 request per menit per IP
  GENERAL: {
    windowMs: 60 * 1000,
    maxRequests: 200,
    message: 'Frekuensi permintaan API melebihi ambang batas wajar.',
  },
};
