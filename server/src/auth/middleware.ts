import type { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { validateSession } from './session.js';
import { db } from '../db/index.js';
import { env } from '../config/env.js';
import { sendError } from '../http/errors.js';

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
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader && typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : undefined;
  const headerToken = (req.headers['x-session-token'] as string | undefined) || bearerToken;
  const token = req.cookies?.[cookieName] || req.cookies?.['sid'] || req.cookies?.['__Host-sid'] || headerToken;

  if (!token || typeof token !== 'string') {
    sendError(res, 401, 'Unauthorized', 'Authentication required. Please sign in.');
    return;
  }

  const session = await validateSession(token);
  if (!session) {
    sendError(res, 401, 'Unauthorized', 'Session expired or invalid. Please sign in again.');
    return;
  }

  const userRecord = await db.findUserById(session.userId);
  if (!userRecord) {
    sendError(res, 401, 'Unauthorized', 'User account not found.');
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

  const origin = (req.headers['origin'] || req.headers['referer']) as string | undefined;
  const appUrl = env.APP_URL;
  const host = req.get('x-forwarded-host') || req.get('host');

  const isHostOrigin = origin && host ? origin.includes(host.split(',')[0].trim()) : false;
  const isSameOrigin =
    !origin ||
    isHostOrigin ||
    (appUrl && origin.startsWith(appUrl)) ||
    origin.startsWith('http://localhost') ||
    origin.startsWith('http://127.0.0.1');

  // A browser-provided foreign origin is never trusted, even if it can supply
  // a custom header. This prevents the header from becoming a CSRF bypass.
  if (origin && !isSameOrigin) {
    sendError(res, 403, 'Forbidden', 'CSRF validation failed: Untrusted origin.');
    return;
  }

  // Same-origin API clients identify themselves with a custom header.
  const customHeader =
    req.headers['x-requested-with'] ||
    req.headers['x-repopulse-client'] ||
    req.headers['x-csrf-token'];

  if (customHeader || isSameOrigin) {
    return next();
  }

  sendError(res, 403, 'Forbidden', 'CSRF validation failed: Missing custom header or untrusted origin.');
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
