import crypto from 'crypto';

// Secret key for encrypting provider API keys at rest
const ENCRYPTION_SECRET =
  process.env.ENCRYPTION_SECRET ||
  process.env.JWT_SECRET ||
  'apotek-sehat-ai-super-secret-encryption-key-2026';

// Derive 32-byte key using sha256
function getDerivedKey(): Buffer {
  return crypto.createHash('sha256').update(ENCRYPTION_SECRET).digest();
}

/**
 * Encrypt sensitive text (API Key) using AES-256-GCM
 * Output format: ivHex:authTagHex:ciphertextHex
 */
export function encryptApiKey(plainText: string): string {
  if (!plainText) return '';
  const key = getDerivedKey();
  const iv = crypto.randomBytes(12); // 96 bits IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypt ciphertext back to plain API key
 */
export function decryptApiKey(cipherString: string | null | undefined): string {
  if (!cipherString) return '';
  try {
    const parts = cipherString.split(':');
    if (parts.length !== 3) {
      // Fallback for unencrypted legacy keys
      return cipherString;
    }
    const [ivHex, authTagHex, encryptedHex] = parts;
    const key = getDerivedKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err: any) {
    console.error('[CRYPTO] Failed to decrypt API key:', err?.message);
    return '';
  }
}

/**
 * Mask API key for secure frontend display (never reveals full key)
 * e.g. "sk-proj-1234567890abcdef" -> "sk-proj-••••••••cdef"
 */
export function maskApiKey(plainText: string): string {
  if (!plainText) return '';
  const trimmed = plainText.trim();
  if (trimmed.length <= 8) {
    return '••••••••';
  }

  // Preserve recognized prefix like "sk-", "nvapi-", "gsk_", etc.
  const prefixMatch = trimmed.match(/^(sk-proj-|nvapi-|gsk_|openrouter-|[a-zA-Z0-9_-]{3,8})/);
  const prefix = prefixMatch ? prefixMatch[0] : trimmed.slice(0, 4);
  const suffix = trimmed.slice(-4);

  return `${prefix}••••••••${suffix}`;
}

