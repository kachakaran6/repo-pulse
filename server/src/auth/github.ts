import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { memoryDb, pool } from '../db/index.js';
import { logger } from '../utils/logger.js';

// In-memory state store with 10-minute TTL for OAuth CSRF protection
const stateStore = new Map<string, { createdAt: number; codeVerifier?: string }>();

// Cleanup stale states
setInterval(() => {
  const now = Date.now();
  for (const [state, data] of stateStore.entries()) {
    if (now - data.createdAt > 600000) {
      stateStore.delete(state);
    }
  }
}, 60000);

export function generateOAuthState(): string {
  const state = crypto.randomBytes(24).toString('hex');
  stateStore.set(state, { createdAt: Date.now() });
  return state;
}

export function verifyOAuthState(state: string): boolean {
  if (!state || !stateStore.has(state)) {
    return false;
  }
  const data = stateStore.get(state)!;
  stateStore.delete(state);
  return Date.now() - data.createdAt <= 600000;
}

export interface GitHubUserProfile {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
}

/**
 * Exchange OAuth authorization code for GitHub user profile
 */
export async function exchangeCodeForUser(code: string): Promise<GitHubUserProfile> {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    throw new Error('GitHub App client credentials not configured.');
  }

  // Exchange code for token
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const tokenData = (await tokenRes.json()) as any;
  if (!tokenData.access_token) {
    throw new Error(`GitHub token exchange failed: ${tokenData.error_description || 'unknown error'}`);
  }

  // Fetch authenticated user profile using short-lived user token
  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `Bearer ${tokenData.access_token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'RepoPulse-v2',
    },
  });

  if (!userRes.ok) {
    throw new Error(`Failed to fetch user profile from GitHub: ${userRes.status}`);
  }

  const profile = (await userRes.json()) as any;

  // Crucial security rule: we NEVER store the user's access token!
  return {
    id: profile.id,
    login: profile.login,
    name: profile.name || profile.login,
    avatar_url: profile.avatar_url,
  };
}

/**
 * Find or create user in database from GitHub profile
 */
export async function findOrCreateUser(profile: GitHubUserProfile): Promise<{ id: number; login: string; name: string; avatar_url: string }> {
  if (pool) {
    try {
      const existing = await pool.query(
        `SELECT id, github_user_id, login, name, avatar_url FROM users WHERE github_user_id = $1 AND deleted_at IS NULL`,
        [profile.id]
      );
      if (existing.rows.length > 0) {
        // Update any changed login/avatar
        await pool.query(
          `UPDATE users SET login = $1, name = $2, avatar_url = $3 WHERE id = $4`,
          [profile.login, profile.name, profile.avatar_url, existing.rows[0].id]
        );
        return {
          id: Number(existing.rows[0].id),
          login: profile.login,
          name: profile.name || profile.login,
          avatar_url: profile.avatar_url,
        };
      }

      // Create new user
      const inserted = await pool.query(
        `INSERT INTO users (github_user_id, login, name, avatar_url)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [profile.id, profile.login, profile.name, profile.avatar_url]
      );
      const userId = Number(inserted.rows[0].id);

      // Create default settings
      await pool.query(
        `INSERT INTO settings (user_id, active_days, cooling_days, stale_days, theme)
         VALUES ($1, 7, 14, 30, 'system')
         ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      );

      return {
        id: userId,
        login: profile.login,
        name: profile.name || profile.login,
        avatar_url: profile.avatar_url,
      };
    } catch (err: any) {
      logger.error({ error: err.message }, 'PostgreSQL user lookup/create failed, falling back to memory store');
    }
  }

  // Memory fallback
  let user = memoryDb.findUserByGithubId(profile.id);
  if (!user) {
    user = memoryDb.createUser({
      github_user_id: profile.id,
      login: profile.login,
      name: profile.name || profile.login,
      avatar_url: profile.avatar_url,
    });
  }
  return {
    id: user.id,
    login: user.login,
    name: user.name,
    avatar_url: user.avatar_url,
  };
}
