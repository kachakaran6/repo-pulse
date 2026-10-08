import crypto from 'node:crypto';

/**
 * Hash a password using Node crypto scrypt with random salt
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

/**
 * Verify a plain password against stored salt:hash string
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    if (!storedHash || !storedHash.includes(':')) {
      return false;
    }
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) {
      return false;
    }
    const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedBuffer = Buffer.from(derivedKey, 'hex');

    if (keyBuffer.length !== derivedBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(keyBuffer, derivedBuffer);
  } catch {
    return false;
  }
}
