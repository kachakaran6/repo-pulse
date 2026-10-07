import type { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { validateSession } from './session.js';
import { db } from '../db/index.js';
import { env } from '../config/env.js';

export interface AuthenticatedUser {
  id: string;
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
  const cookieName = env.SESSION_COOKIE_NAME || (env.NODE_ENV === 'production' ? '__Host-sid' : 'sid');
  const token = req.cookies?.[cookieName] || req.cookies?.['sid'] || req.cookies?.['__Host-sid'];

  if (!token || typeof token !== 'string') {
    res.status(401).json({ error: 'Unauthorized', message: 'Authentication required. Please sign in.' });
    return;
  }

  const session = await validateSession(token);
  if (!session) {
    res.status(401).json({ error: 'Unauthorized', message: 'Session expired or invalid. Please sign in again.' });
    return;
  }

  const userRecord = await db.findUserById(session.userId);
  if (!userRecord) {
    res.status(401).json({ error: 'Unauthorized', message: 'User account not found.' });
    return;
  }

  req.user = {
    id: String(userRecord.id),
    login: userRecord.login,
    name: userRecord.name || userRecord.login,
    avatar_url: userRecord.avatar_url,
  };
  req.sessionIdHash = session.idHash;

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

  // Custom client header verification
  const customHeader =
    req.headers['x-requested-with'] ||
    req.headers['x-repopulse-client'] ||
    req.headers['x-csrf-token'];

  if (customHeader) {
    return next();
  }

  const origin = (req.headers['origin'] || req.headers['referer']) as string | undefined;
  const appUrl = env.APP_URL;
  const host = req.get('host');

  const isHostOrigin = origin && host ? origin.includes(host) : false;
  const isSameOrigin =
    !origin ||
    isHostOrigin ||
    (appUrl && origin.startsWith(appUrl)) ||
    origin.startsWith('http://localhost') ||
    origin.startsWith('http://127.0.0.1');

  if (isSameOrigin) {
    return next();
  }

  res.status(403).json({
    error: 'Forbidden',
    message: 'CSRF validation failed: Missing custom header or untrusted origin.',
  });
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
