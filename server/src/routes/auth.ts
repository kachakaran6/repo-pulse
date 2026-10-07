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
import { validateGitHubToken, syncReposWithPat, userTokens } from '../sync/github-pat.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
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
    res.redirect('/?auth_demo=true');
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
    memoryDb.logAudit(user.id, 'user_logged_in', { method: 'github_oauth' });

    // Trigger initial sync in background if first time
    const repos = memoryDb.getUserRepos(user.id);
    if (repos.length === 0) {
      runUserSync(user.id).catch((e) => logger.error({ error: e.message }, 'Initial sync error'));
    }

    res.redirect('/');
  } catch (err: any) {
    logger.error({ error: err.message }, 'OAuth callback failed');
    res.redirect('/?error=auth_failed');
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
 * Sign in using GitHub Personal Access Token (PAT)
 */
authRouter.post('/token-login', async (req, res) => {
  const schema = z.object({
    token: z.string().min(1, 'Token is required'),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation Error', message: 'GitHub token is required.' });
    return;
  }

  try {
    const rawToken = parsed.data.token.trim();
    const ghUser = await validateGitHubToken(rawToken);

    const user = await findOrCreateUser({
      id: ghUser.id,
      login: ghUser.login,
      name: ghUser.name || ghUser.login,
      avatar_url: ghUser.avatar_url,
    });

    // Store token in active session store
    userTokens.set(user.id, rawToken);

    await createSession(user.id, req, res);
    memoryDb.logAudit(user.id, 'user_logged_in', { method: 'pat' });

    // Run initial live sync with PAT
    await syncReposWithPat(user.id, rawToken);

    res.json({
      ok: true,
      user: {
        id: user.id,
        login: user.login,
        name: user.name,
        avatar_url: user.avatar_url,
      },
    });
  } catch (err: any) {
    logger.error({ error: err.message }, 'PAT login failed');
    res.status(401).json({ error: 'Authentication Failed', message: err.message || 'Invalid GitHub token' });
  }
});

/**
 * Register a new Cloud Sync Account (with optional token vault storage)
 */
authRouter.post('/signup', async (req, res) => {
  const schema = z.object({
    username: z.string().min(3).max(39).regex(/^[a-zA-Z0-9_-]+$/, 'Username must be alphanumeric, hyphen or underscore'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    token: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation Error', message: parsed.error.issues[0]?.message || 'Invalid input.' });
    return;
  }

  const { username, password, token } = parsed.data;

  // Check if username already exists
  const existing = memoryDb.findUserByLogin(username);
  if (existing) {
    res.status(400).json({ error: 'User Exists', message: 'Username is already registered. Please sign in.' });
    return;
  }

  let ghUser: any = null;
  const cleanToken = token?.trim() || null;
  if (cleanToken) {
    try {
      ghUser = await validateGitHubToken(cleanToken);
    } catch (err: any) {
      res.status(400).json({ error: 'Token Error', message: `Invalid GitHub token: ${err.message}` });
      return;
    }
  }

  const passwordHash = hashPassword(password);
  const newUser = memoryDb.createUser({
    github_user_id: ghUser?.id || undefined,
    login: username,
    name: ghUser?.name || username,
    avatar_url: ghUser?.avatar_url || `https://avatars.githubusercontent.com/u/${Math.floor(Math.random() * 100000)}?v=4`,
    password_hash: passwordHash,
    saved_token: cleanToken,
  });


  if (cleanToken) {
    userTokens.set(newUser.id, cleanToken);
    // Sync repos directly with PAT
    try {
      await syncReposWithPat(newUser.id, cleanToken);
    } catch (e: any) {
      logger.error({ err: e.message }, 'Initial sync error on signup');
    }
  } else {
    try {
      await runUserSync(newUser.id);
    } catch (e: any) {
      logger.error({ err: e.message }, 'Demo sync error on signup');
    }
  }

  await createSession(newUser.id, req, res);
  memoryDb.logAudit(newUser.id, 'user_signed_up', { with_token: Boolean(cleanToken) });

  res.json({
    ok: true,
    user: {
      id: newUser.id,
      login: newUser.login,
      name: newUser.name,
      avatar_url: newUser.avatar_url,
    },
  });
});

/**
 * Log into Cloud Sync Account
 */
authRouter.post('/login', async (req, res) => {
  const schema = z.object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation Error', message: 'Username and password are required.' });
    return;
  }

  const { username, password } = parsed.data;
  const user = memoryDb.findUserByLogin(username);

  if (!user || !user.password_hash || !verifyPassword(password, user.password_hash)) {
    res.status(401).json({ error: 'Authentication Failed', message: 'Invalid username or password.' });
    return;
  }

  // If user has saved token, restore it in memory and sync repos if empty
  if (user.saved_token) {
    userTokens.set(user.id, user.saved_token);
    const existingRepos = memoryDb.getUserRepos(user.id);
    if (existingRepos.length === 0) {
      try {
        await syncReposWithPat(user.id, user.saved_token);
      } catch (e: any) {
        logger.error({ err: e.message }, 'Sync error on user login');
      }
    }
  }

  await createSession(user.id, req, res);
  memoryDb.logAudit(user.id, 'user_logged_in', { method: 'password' });

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
