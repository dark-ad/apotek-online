import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const DEFAULT_SECRET = 'apotek-sehat-ai-secret-jwt-key-2026';
export const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_SECRET;
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('[SECURITY WARNING] JWT_SECRET tidak didefinisikan pada environment variable! Menggunakan fallback secret default sangat tidak disarankan untuk deployment produksi.');
}
export const JWT_EXPIRES_IN = '7d';

export interface TokenPayload {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'STAFF' | 'CUSTOMER';
  phone?: string | null;
  address?: string | null;
}

/**
 * Hash password securely with bcrypt (10 rounds salt)
 */
export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainText, salt);
}

/**
 * Compare plain password against bcrypt hash
 */
export async function comparePassword(plainText: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plainText, hashed);
}

/**
 * Generate secure JWT token
 */
export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Check if a given user role matches allowed roles
 */
export function checkRoleAuthorization(
  userRole: string,
  allowedRoles: ('ADMIN' | 'STAFF' | 'CUSTOMER')[]
): boolean {
  return allowedRoles.includes(userRole as any);
}
