import { Router } from 'express';
import { env } from '../config/env.js';
import {
  setOAuthStateCookie,
  verifyAndClearOAuthState,
  exchangeCodeForUser,
  findOrCreateUser,
} from '../auth/github.js';
import {
  createSession,
  destroySession,
  destroyAllUserSessions,
} from '../auth/session.js';
import { requireAuth, authRateLimiter } from '../auth/middleware.js';
import { db } from '../db/index.js';
import { runUserSync } from '../sync/engine.js';
import { logger } from '../utils/logger.js';

export const authRouter = Router();

// Apply auth rate limiter
authRouter.use(authRateLimiter);

/**
 * Resolves the dynamic public base URL of the incoming request.
 * Prioritizes custom configured external APP_URL / API_URL, then reverse proxy
 * headers (X-Forwarded-Proto, X-Forwarded-Host), then Host header.
 */
export function getRequestBaseUrl(req: import('express').Request): string {
  if (env.APP_URL && !env.APP_URL.includes('localhost') && !env.APP_URL.includes('127.0.0.1')) {
    return env.APP_URL.replace(/\/+$/, '');
  }

  const forwardedProto = req.get('x-forwarded-proto');
  const forwardedHost = req.get('x-forwarded-host');
  const host = forwardedHost || req.get('host');

  if (host) {
    const proto = forwardedProto
      ? forwardedProto.split(',')[0].trim()
      : req.secure ? 'https' : (req.protocol || 'http');
    return `${proto}://${host.split(',')[0].trim()}`;
  }

  return env.APP_URL.replace(/\/+$/, '');
}

/**
 * GET /auth/status
 * Public status endpoint indicating OAuth & Demo configuration
 */
authRouter.get('/status', (req, res) => {
  res.json({
    githubConfigured: Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
    demoEnabled: Boolean(env.DEMO_MODE_ENABLED),
    appUrl: getRequestBaseUrl(req),
    clientId: env.GITHUB_CLIENT_ID ? `${env.GITHUB_CLIENT_ID.substring(0, 4)}...` : null,
  });
});

/**
 * GET /auth/github/start
 * Initiates GitHub App authorization flow with state cookie
 */
authRouter.get('/github/start', (req, res) => {
  if (!env.GITHUB_CLIENT_ID) {
    logger.warn('GitHub App Client ID not configured.');
    res.redirect('/?error=github_not_configured');
    return;
  }

  const state = setOAuthStateCookie(req, res);
  const baseUrl = (env.API_URL && !env.API_URL.includes('localhost') && !env.API_URL.includes('127.0.0.1'))
    ? env.API_URL.replace(/\/+$/, '')
    : getRequestBaseUrl(req);
  const redirectUri = `${baseUrl}/auth/github/callback`;

  const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
  githubAuthUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  githubAuthUrl.searchParams.set('state', state);
  githubAuthUrl.searchParams.set('redirect_uri', redirectUri);

  res.redirect(githubAuthUrl.toString());
});

/**
 * GET /auth/github/callback
 * Handles GitHub OAuth callback, verifies state, upserts user, creates session, redirects
 */
authRouter.get('/github/callback', async (req, res) => {
  const code = req.query.code as string;
  const state = req.query.state as string;

  if (!state || !verifyAndClearOAuthState(req, res, state)) {
    logger.warn('OAuth callback rejected: Invalid or expired state parameter');
    res.redirect('/?error=invalid_oauth_state');
    return;
  }

  if (!code) {
    res.redirect('/?error=missing_code');
    return;
  }

  try {
    const profile = await exchangeCodeForUser(code);
    const user = await findOrCreateUser(profile);

    await createSession(user.id, req, res);
    await db.logAudit(user.id, 'user_logged_in', { method: 'github_oauth' });

    // Check if user has an active GitHub App installation
    const installation = await db.getInstallation(user.id);
    if (!installation && env.GITHUB_APP_SLUG) {
      // Direct user to install the GitHub App to choose repos
      res.redirect(`https://github.com/apps/${env.GITHUB_APP_SLUG}/installations/new`);
      return;
    }

    // Trigger initial sync if first time
    const repos = await db.getUserRepos(user.id);
    if (repos.length === 0) {
      runUserSync(user.id).catch((e) => logger.error({ error: e.message }, 'Initial sync error'));
    }

    res.redirect('/');
  } catch (err: any) {
    logger.error({ error: err.message }, 'OAuth callback processing failed');
    res.redirect('/?error=auth_failed');
  }
});

/**
 * POST /auth/demo-login
 * Demo / guest exploration session with pre-populated sample repos
 */
authRouter.post('/demo-login', async (req, res) => {
  if (!env.DEMO_MODE_ENABLED && env.NODE_ENV === 'production') {
    res.status(403).json({
      error: 'Forbidden',
      message: 'Demo login is disabled on this server.',
    });
    return;
  }

  try {
    const user = await db.upsertUser({
      github_user_id: '888888888',
      login: 'demo-user',
      name: 'Demo Showcase',
      avatar_url: 'https://avatars.githubusercontent.com/u/9919?s=200&v=4',
    });

    await createSession(user.id, req, res);
    await db.logAudit(user.id, 'user_logged_in', { method: 'demo_login' });

    // Ensure sample repos exist
    const repos = await db.getUserRepos(user.id);
    if (repos.length === 0) {
      await runUserSync(user.id);
    }

    res.json({
      ok: true,
      user: {
        id: String(user.id),
        login: user.login,
        name: user.name,
        avatar_url: user.avatar_url,
      },
    });
  } catch (err: any) {
    logger.error({ error: err.message }, 'Demo login failed');
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

/**
 * POST /auth/dev-login
 * Local development only login endpoint. Strictly blocked in production when DEV_LOGIN_ENABLED is false.
 */
authRouter.post('/dev-login', async (req, res) => {
  if (env.NODE_ENV === 'production' && !env.DEV_LOGIN_ENABLED && !env.DEMO_MODE_ENABLED) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'Dev login is disabled in production environments.',
    });
    return;
  }

  try {
    const user = await db.upsertUser({
      github_user_id: '999999999',
      login: 'dev-user',
      name: 'Developer Mode',
      avatar_url: 'https://avatars.githubusercontent.com/u/999999999?v=4',
    });

    await createSession(user.id, req, res);
    await db.logAudit(user.id, 'user_logged_in', { method: 'dev_login' });

    // Run initial sync
    const repos = await db.getUserRepos(user.id);
    if (repos.length === 0) {
      await runUserSync(user.id);
    }

    res.json({
      ok: true,
      user: {
        id: String(user.id),
        login: user.login,
        name: user.name,
        avatar_url: user.avatar_url,
      },
    });
  } catch (err: any) {
    logger.error({ error: err.message }, 'Dev login failed');
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

/**
 * POST /auth/logout
 * Sign out current active session and clear cookie
 */
authRouter.post('/logout', async (req, res) => {
  const cookieName = env.SESSION_COOKIE_NAME || (env.NODE_ENV === 'production' ? '__Host-sid' : 'sid');
  const token = req.cookies?.[cookieName] || req.cookies?.['sid'] || req.cookies?.['__Host-sid'];

  if (token && typeof token === 'string') {
    await destroySession(token, res);
  } else {
    res.clearCookie(cookieName, { path: '/' });
    res.clearCookie('sid', { path: '/' });
    res.clearCookie('__Host-sid', { path: '/' });
  }

  res.json({ ok: true, message: 'Signed out successfully' });
});

/**
 * POST /auth/logout-all
 * Sign out of all active sessions for current user
 */
authRouter.post('/logout-all', requireAuth, async (req, res) => {
  if (req.user) {
    await destroyAllUserSessions(req.user.id, res);
    await db.logAudit(req.user.id, 'user_logged_out_all');
  }
  res.json({ ok: true, message: 'Signed out of all active sessions' });
});
