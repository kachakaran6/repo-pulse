import type { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { COOKIE_NAME, validateSession } from './session.js';
import { memoryDb, pool } from '../db/index.js';
import { env } from '../config/env.js';

export interface AuthenticatedUser {
  id: number;
  login: string;
  name: string;
  avatar_url: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      sessionIdHash?: string;
    }
  }
}

/**
 * Authentication middleware: verifies session cookie, checks expiry, sets req.user
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.[COOKIE_NAME] || req.cookies?.['sid'] || req.headers['x-session-token'];

  if (!token || typeof token !== 'string') {
    res.status(401).json({ error: 'Unauthorized', message: 'Authentication required. Please sign in.' });
    return;
  }

  const session = await validateSession(token);
  if (!session) {
    res.status(401).json({ error: 'Unauthorized', message: 'Session expired or invalid. Please sign in again.' });
    return;
  }

  // Load user profile
  let userRecord: any = null;
  if (pool) {
    try {
      const res = await pool.query(
        `SELECT id, login, name, avatar_url FROM users WHERE id = $1 AND deleted_at IS NULL`,
        [session.userId]
      );
      if (res.rows.length > 0) {
        userRecord = res.rows[0];
      }
    } catch {
      userRecord = memoryDb.findUserById(session.userId);
    }
  } else {
    userRecord = memoryDb.findUserById(session.userId);
  }

  if (!userRecord) {
    res.status(401).json({ error: 'Unauthorized', message: 'User account not found.' });
    return;
  }

  req.user = {
    id: Number(userRecord.id),
    login: userRecord.login,
    name: userRecord.name || userRecord.login,
    avatar_url: userRecord.avatar_url,
  };
  req.sessionIdHash = session.idHash;

  next();
}

/**
 * Optional authentication middleware for public/hybrid endpoints
 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.[COOKIE_NAME] || req.cookies?.['sid'] || req.headers['x-session-token'];
  if (token && typeof token === 'string') {
    const session = await validateSession(token);
    if (session) {
      const userRecord = memoryDb.findUserById(session.userId);
      if (userRecord) {
        req.user = {
          id: Number(userRecord.id),
          login: userRecord.login,
          name: userRecord.name || userRecord.login,
          avatar_url: userRecord.avatar_url,
        };
        req.sessionIdHash = session.idHash;
      }
    }
  }
  next();
}

/**
 * CSRF protection middleware for state-changing HTTP requests
 * Verifies Origin header and checks for custom header on mutating requests
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (!mutatingMethods.includes(req.method)) {
    return next();
  }

  // Skip webhook endpoints (they use HMAC signatures)
  if (req.path.startsWith('/webhooks')) {
    return next();
  }

  // Skip in test environment if header is bypassed
  if (env.NODE_ENV === 'test' && !req.headers['origin'] && !req.headers['referer']) {
    return next();
  }

  const origin = (req.headers['origin'] || req.headers['referer']) as string | undefined;
  const appUrl = env.APP_URL;
  const host = req.get('host');

  // Custom client header verification
  const customHeader = req.headers['x-requested-with'] || req.headers['x-repopulse-client'] || req.headers['x-csrf-token'];
  const contentType = req.headers['content-type'];

  // Accept valid requests with JSON content-type or custom header or matched origin
  const isJsonMutation = typeof contentType === 'string' && contentType.includes('application/json');
  const isHostOrigin = origin && host ? origin.includes(host) : false;
  const isSameOrigin = !origin || isHostOrigin || (appUrl && origin.startsWith(appUrl)) || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1');

  if (isSameOrigin || customHeader || isJsonMutation) {
    return next();
  }

  res.status(403).json({ error: 'Forbidden', message: 'CSRF validation failed: Missing custom header or untrusted origin.' });
}

/**
 * Rate limiters configured per 12-SECURITY.md
 */
export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too Many Requests', message: 'Too many authentication attempts. Please wait 60 seconds.' },
});

export const syncRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too Many Requests', message: 'Sync request rate limit reached. Please wait.' },
});

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too Many Requests', message: 'Rate limit exceeded. Please slow down.' },
});
