import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import { db } from '../db/index.js';
import { logger } from '../utils/logger.js';

export const IDLE_TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const ABSOLUTE_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export interface SessionData {
  userId: string;
  idHash: string;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
}

/**
 * Generate a new 256-bit cryptographically secure session and store its SHA-256 hash
 */
export async function createSession(
  userId: string | number,
  req: Request,
  res: Response
): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ABSOLUTE_LIFETIME_MS);

  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const ipHash = crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16);
  const ua = req.headers['user-agent'] || 'unknown';

  await db.createSession({
    id_hash: tokenHash,
    user_id: userId,
    expires_at: expiresAt,
    ip_hash: ipHash,
    ua: String(ua).substring(0, 500),
  });

  const isProduction = env.NODE_ENV === 'production';
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  const cookieName = env.SESSION_COOKIE_NAME || (isProduction ? '__Host-sid' : 'sid');

  res.cookie(cookieName, rawToken, {
    httpOnly: true,
    secure: isProduction ? true : isHttps,
    sameSite: 'lax',
    path: '/',
    maxAge: ABSOLUTE_LIFETIME_MS,
  });

  return rawToken;
}

/**
 * Validate incoming session token from cookie
 */
export async function validateSession(rawToken: string): Promise<SessionData | null> {
  if (!rawToken || typeof rawToken !== 'string' || rawToken.length < 32) {
    return null;
  }

  const tokenHash = hashToken(rawToken);
  const now = new Date();

  const session = await db.findSession(tokenHash);
  if (!session) {
    return null;
  }

  const createdAt = new Date(session.created_at);
  const lastSeenAt = new Date(session.last_seen_at);
  const expiresAt = new Date(session.expires_at);

  // Check absolute lifetime (30 days)
  if (now.getTime() > expiresAt.getTime()) {
    await db.deleteSession(tokenHash);
    return null;
  }

  // Check idle timeout (7 days)
  if (now.getTime() - lastSeenAt.getTime() > IDLE_TIMEOUT_MS) {
    await db.deleteSession(tokenHash);
    return null;
  }

  // Update last seen in background
  db.updateSessionLastSeen(tokenHash).catch((err) => {
    logger.warn({ error: err.message }, 'Failed to update session last seen');
  });

  return {
    userId: String(session.user_id),
    idHash: tokenHash,
    createdAt,
    lastSeenAt: now,
    expiresAt,
  };
}

/**
 * Delete a specific session
 */
export async function destroySession(rawToken: string, res?: Response): Promise<void> {
  if (rawToken) {
    const tokenHash = hashToken(rawToken);
    await db.deleteSession(tokenHash);
  }

  if (res) {
    const isProduction = env.NODE_ENV === 'production';
    const cookieName = env.SESSION_COOKIE_NAME || (isProduction ? '__Host-sid' : 'sid');
    res.clearCookie(cookieName, { path: '/' });
    res.clearCookie('sid', { path: '/' });
    res.clearCookie('__Host-sid', { path: '/' });
  }
}

/**
 * Sign out everywhere - delete all sessions for a user
 */
export async function destroyAllUserSessions(userId: string | number, res?: Response): Promise<void> {
  await db.deleteAllUserSessions(userId);

  if (res) {
    const isProduction = env.NODE_ENV === 'production';
    const cookieName = env.SESSION_COOKIE_NAME || (isProduction ? '__Host-sid' : 'sid');
    res.clearCookie(cookieName, { path: '/' });
    res.clearCookie('sid', { path: '/' });
    res.clearCookie('__Host-sid', { path: '/' });
  }
}
