import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import { memoryDb, pool } from '../db/index.js';
import { logger } from '../utils/logger.js';

export const COOKIE_NAME = 'sid';
export const IDLE_TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const ABSOLUTE_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export interface SessionData {
  userId: number;
  idHash: string;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
}

/**
 * Generate a new 256-bit cryptographically secure session and store its SHA-256 hash
 */
export async function createSession(
  userId: number,
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

  if (pool) {
    try {
      await pool.query(
        `INSERT INTO sessions (id_hash, user_id, created_at, last_seen_at, expires_at, ip_hash, ua)
         VALUES ($1, $2, $3, $3, $4, $5, $6)`,
        [tokenHash, userId, now, expiresAt, ipHash, ua]
      );
    } catch (err: any) {
      logger.error({ error: err.message }, 'Failed to insert session into Postgres, falling back to memory store');
      memoryDb.createSession({ id_hash: tokenHash, user_id: userId, expires_at: expiresAt, ip_hash: ipHash, ua });
    }
  } else {
    memoryDb.createSession({ id_hash: tokenHash, user_id: userId, expires_at: expiresAt, ip_hash: ipHash, ua });
  }

  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';

  // Set standard session cookie with dynamic secure detection
  res.cookie('sid', rawToken, {
    httpOnly: true,
    secure: isHttps,
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

  let session: any = null;

  if (pool) {
    try {
      const res = await pool.query(
        `SELECT id_hash, user_id, created_at, last_seen_at, expires_at
         FROM sessions
         WHERE id_hash = $1`,
        [tokenHash]
      );
      if (res.rows.length > 0) {
        session = res.rows[0];
      }
    } catch (err) {
      session = memoryDb.findSession(tokenHash);
    }
  } else {
    session = memoryDb.findSession(tokenHash);
  }

  if (!session) {
    return null;
  }

  const createdAt = new Date(session.created_at);
  const lastSeenAt = new Date(session.last_seen_at);
  const expiresAt = new Date(session.expires_at);

  // Check absolute lifetime (30 days)
  if (now.getTime() > expiresAt.getTime()) {
    await destroySession(rawToken);
    return null;
  }

  // Check idle timeout (7 days)
  if (now.getTime() - lastSeenAt.getTime() > IDLE_TIMEOUT_MS) {
    await destroySession(rawToken);
    return null;
  }

  // Update last seen
  if (pool) {
    try {
      await pool.query(
        `UPDATE sessions SET last_seen_at = now() WHERE id_hash = $1`,
        [tokenHash]
      );
    } catch {
      memoryDb.updateSessionLastSeen(tokenHash);
    }
  } else {
    memoryDb.updateSessionLastSeen(tokenHash);
  }

  return {
    userId: Number(session.user_id),
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
    if (pool) {
      try {
        await pool.query(`DELETE FROM sessions WHERE id_hash = $1`, [tokenHash]);
      } catch {
        memoryDb.deleteSession(tokenHash);
      }
    } else {
      memoryDb.deleteSession(tokenHash);
    }
  }

  if (res) {
    res.clearCookie('sid', { path: '/' });
    res.clearCookie('__Host-sid', { path: '/' });
  }
}

/**
 * Sign out everywhere - delete all sessions for a user
 */
export async function destroyAllUserSessions(userId: number, res?: Response): Promise<void> {
  if (pool) {
    try {
      await pool.query(`DELETE FROM sessions WHERE user_id = $1`, [userId]);
    } catch {
      memoryDb.deleteAllUserSessions(userId);
    }
  } else {
    memoryDb.deleteAllUserSessions(userId);
  }

  if (res) {
    res.clearCookie('sid', { path: '/' });
    res.clearCookie('__Host-sid', { path: '/' });
  }
}
