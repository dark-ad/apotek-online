import type { IncomingMessage, ServerResponse } from 'http';
import { verifyToken } from './auth';
import type { ApiResponse, AuthenticatedUserPayload, UserRole } from './types';

/**
 * Helper to send standardized JSON response with CORS & OWASP Security headers
 */
export function sendJson(res: ServerResponse, statusCode: number, data: ApiResponse) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  // OWASP Recommended Security Headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.end(JSON.stringify(data));
}

export class PayloadTooLargeError extends Error {
  constructor(message = 'Ukuran payload melebihi batas yang diizinkan (HTTP 413 Payload Too Large).') {
    super(message);
    this.name = 'PayloadTooLargeError';
  }
}

/**
 * Helper to parse JSON body with strict max size limit to prevent Heap OOM DoS attacks
 * @param req IncomingMessage
 * @param maxSizeBytes Default 1MB (1024 * 1024 bytes)
 */
export async function parseJsonBody(
  req: IncomingMessage,
  maxSizeBytes: number = 1024 * 1024
): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    let totalBytes = 0;

    req.on('data', (chunk) => {
      totalBytes += chunk.length;
      if (totalBytes > maxSizeBytes) {
        req.destroy(); // Hentikan pembacaan socket segera
        reject(new PayloadTooLargeError(`Ukuran request (${(totalBytes / 1024 / 1024).toFixed(1)}MB) melebihi batas maksimum (${(maxSizeBytes / 1024 / 1024).toFixed(1)}MB).`));
        return;
      }
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        resolve(body.trim() ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error('Format JSON pada request body tidak valid.'));
      }
    });

    req.on('error', (err) => reject(err));
  });
}

/**
 * Extract and verify Bearer token from request headers
 */
export function getAuthenticatedUser(req: IncomingMessage): AuthenticatedUserPayload | null {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice(7).trim();
  return verifyToken(token);
}

/**
 * Require authentication and optional role check.
 * Sends 401/403 automatically if check fails.
 */
export function requireAuth(
  req: IncomingMessage,
  res: ServerResponse,
  allowedRoles?: UserRole[]
): AuthenticatedUserPayload | null {
  const authUser = getAuthenticatedUser(req);
  if (!authUser) {
    sendJson(res, 401, {
      success: false,
      message: 'Silakan login terlebih dahulu untuk mengakses layanan ini.',
    });
    return null;
  }

  if (allowedRoles && !allowedRoles.includes(authUser.role)) {
    sendJson(res, 403, {
      success: false,
      message: `AKSES DITOLAK (403 Forbidden): Akun role '${authUser.role}' tidak memiliki izin untuk mengakses resource ini.`,
    });
    return null;
  }

  return authUser;
}

/**
 * Parse integer safely with fallback, min, and max limits (avoids NaN bugs)
 */
export function parseIntSafe(
  val: string | null | undefined,
  defaultValue: number,
  min?: number,
  max?: number
): number {
  if (!val) return defaultValue;
  const parsed = parseInt(val, 10);
  if (isNaN(parsed)) return defaultValue;
  let result = parsed;
  if (min !== undefined) result = Math.max(min, result);
  if (max !== undefined) result = Math.min(max, result);
  return result;
}
