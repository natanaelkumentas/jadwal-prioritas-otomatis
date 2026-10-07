import crypto from 'crypto';
import { cookies } from 'next/headers';
import { UserRole, UserSession } from './auth-types';
export * from './auth-types';

const SESSION_COOKIE_NAME = 'saps_session';
const SESSION_SECRET = process.env.SESSION_SECRET || 'airnav-jadwal-saps-super-secret-salt-2026';
const SESSION_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

/**
 * Hash password securely using Node.js crypto scrypt
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify plaintext password against stored salt:hash string
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, hash] = storedHash.split(':');
    if (!salt || !hash) return false;
    const computedHash = crypto.scryptSync(password, salt, 64);
    const storedHashBuf = Buffer.from(hash, 'hex');
    return crypto.timingSafeEqual(computedHash, storedHashBuf);
  } catch {
    return false;
  }
}

/**
 * Create HMAC signed session token
 */
export function signSessionToken(session: UserSession): string {
  const payload = {
    ...session,
    exp: Math.floor(Date.now() / 1000) + SESSION_EXPIRY_SECONDS,
  };
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadStr)
    .digest('base64url');
  return `${payloadStr}.${signature}`;
}

/**
 * Verify and decode HMAC signed session token
 */
export function verifySessionToken(token: string): UserSession | null {
  try {
    const [payloadStr, signature] = token.split('.');
    if (!payloadStr || !signature) return null;

    const expectedSig = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(payloadStr)
      .digest('base64url');

    if (signature !== expectedSig) return null;

    const payload = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }

    return {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role as UserRole,
      staffId: payload.staffId,
    };
  } catch {
    return null;
  }
}

/**
 * Get the current user session from cookies on the server
 */
export async function getSession(): Promise<UserSession | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return verifySessionToken(token);
  } catch {
    return null;
  }
}

export const getCurrentUser = getSession;

/**
 * Set session cookie
 */
export async function setSessionCookie(session: UserSession) {
  const token = signSessionToken(session);
  const cookieStore = cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_EXPIRY_SECONDS,
  });
}

/**
 * Clear session cookie
 */
export async function clearSessionCookie() {
  const cookieStore = cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
