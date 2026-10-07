import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import {
  generateOAuthState,
  verifyOAuthState,
  exchangeCodeForUser,
  findOrCreateUser,
} from '../auth/github.js';
import {
  createSession,
  destroySession,
  destroyAllUserSessions,
  COOKIE_NAME,
} from '../auth/session.js';
import { requireAuth, authRateLimiter } from '../auth/middleware.js';
import { memoryDb } from '../db/index.js';
import { runUserSync } from '../sync/engine.js';
import { logger } from '../utils/logger.js';

export const authRouter = Router();

// Apply auth rate limiter
authRouter.use(authRateLimiter);

/**
 * Initiate GitHub OAuth authorization flow
 */
authRouter.get('/github/start', (req, res) => {
  const state = generateOAuthState();

  if (!env.GITHUB_CLIENT_ID) {
    // In dev / demo mode without GitHub credentials, offer instant redirect
    res.redirect(`${env.APP_URL}/?auth_demo=true`);
    return;
  }

  const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
  githubAuthUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  githubAuthUrl.searchParams.set('state', state);
  githubAuthUrl.searchParams.set('redirect_uri', `${req.protocol}://${req.get('host')}/auth/github/callback`);
  githubAuthUrl.searchParams.set('scope', 'read:user');

  res.redirect(githubAuthUrl.toString());
});

/**
 * Handle GitHub OAuth callback
 */
authRouter.get('/github/callback', async (req, res) => {
  const code = req.query.code as string;
  const state = req.query.state as string;

  if (!state || !verifyOAuthState(state)) {
    logger.warn('OAuth callback rejected: Invalid or expired state parameter');
    res.redirect(`${env.APP_URL}/?error=invalid_oauth_state`);
    return;
  }

  if (!code) {
    res.redirect(`${env.APP_URL}/?error=missing_code`);
    return;
  }

  try {
    const profile = await exchangeCodeForUser(code);
    const user = await findOrCreateUser(profile);

    await createSession(user.id, req, res);
    memoryDb.logAudit(user.id, 'user_logged_in', { method: 'github_oauth' });

    // Trigger initial sync in background if first time
    const repos = memoryDb.getUserRepos(user.id);
    if (repos.length === 0) {
      runUserSync(user.id).catch((e) => logger.error({ error: e.message }, 'Initial sync error'));
    }

    res.redirect(`${env.APP_URL}/`);
  } catch (err: any) {
    logger.error({ error: err.message }, 'OAuth callback failed');
    res.redirect(`${env.APP_URL}/?error=auth_failed`);
  }
});

/**
 * Instant Demo Login (for developer setup & testing without GitHub OAuth keys)
 */
authRouter.post('/demo-login', async (req, res) => {
  if (env.NODE_ENV === 'production') {
    res.status(403).json({ error: 'Forbidden', message: 'Demo login is disabled in production environments.' });
    return;
  }

  const schema = z.object({
    username: z.string().min(1).max(39).default('demo-developer'),
  });

  const parsed = schema.safeParse(req.body);
  const username = parsed.success ? parsed.data.username : 'demo-developer';

  const user = await findOrCreateUser({
    id: 100001,
    login: username,
    name: username === 'demo-developer' ? 'Demo Developer' : username,
    avatar_url: `https://avatars.githubusercontent.com/u/100001?v=4`,
  });

  await createSession(user.id, req, res);
  memoryDb.logAudit(user.id, 'user_logged_in', { method: 'demo' });

  // Run initial sync
  await runUserSync(user.id);

  res.json({
    ok: true,
    user: {
      id: user.id,
      login: user.login,
      name: user.name,
      avatar_url: user.avatar_url,
    },
  });
});

/**
 * Sign out current session
 */
authRouter.post('/logout', async (req, res) => {
  const token = req.cookies?.[COOKIE_NAME] || req.cookies?.['sid'] || req.headers['x-session-token'];
  if (token && typeof token === 'string') {
    await destroySession(token, res);
  }
  res.clearCookie(COOKIE_NAME);
  res.clearCookie('sid');
  res.json({ ok: true, message: 'Signed out successfully' });
});

/**
 * Sign out everywhere - delete all sessions for user
 */
authRouter.post('/logout-all', requireAuth, async (req, res) => {
  if (req.user) {
    await destroyAllUserSessions(req.user.id, res);
    memoryDb.logAudit(req.user.id, 'user_logged_out_all');
  }
  res.clearCookie(COOKIE_NAME);
  res.clearCookie('sid');
  res.json({ ok: true, message: 'Signed out of all active sessions' });
});
