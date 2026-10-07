import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import { db } from '../db/index.js';
import { logger } from '../utils/logger.js';

export const OAUTH_STATE_COOKIE = 'oauth_state';
export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Generate cryptographically secure random OAuth state and set short-lived HttpOnly cookie
 */
export function setOAuthStateCookie(req: Request, res: Response): string {
  const state = crypto.randomBytes(32).toString('hex');
  const isProduction = env.NODE_ENV === 'production';
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';

  res.cookie(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: isProduction ? true : isHttps,
    sameSite: 'lax',
    path: '/',
    maxAge: OAUTH_STATE_TTL_MS,
  });

  return state;
}

/**
 * Verify incoming OAuth state parameter against the HttpOnly cookie
 */
export function verifyAndClearOAuthState(req: Request, res: Response, incomingState: string): boolean {
  const cookieState = req.cookies?.[OAUTH_STATE_COOKIE];
  res.clearCookie(OAUTH_STATE_COOKIE, { path: '/' });

  if (!incomingState || !cookieState) {
    return false;
  }

  // Constant-time comparison
  const incomingBuffer = Buffer.from(incomingState);
  const cookieBuffer = Buffer.from(cookieState);

  if (incomingBuffer.length !== cookieBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(incomingBuffer, cookieBuffer);
}

export interface GitHubUserProfile {
  id: string;
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

  if (!tokenRes.ok) {
    throw new Error(`GitHub token exchange HTTP error: ${tokenRes.status}`);
  }

  const tokenData = (await tokenRes.json()) as any;
  if (!tokenData.access_token) {
    throw new Error(`GitHub token exchange failed: ${tokenData.error_description || tokenData.error || 'unknown error'}`);
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

  // Crucial security rule: we NEVER log, store or return the user's access token!
  return {
    id: String(profile.id),
    login: profile.login,
    name: profile.name || profile.login,
    avatar_url: profile.avatar_url,
  };
}

/**
 * Upsert user in database from GitHub profile (handles user renames and avatar updates)
 */
export async function findOrCreateUser(profile: GitHubUserProfile): Promise<{ id: string; login: string; name: string; avatar_url: string }> {
  const row = await db.upsertUser({
    github_user_id: profile.id,
    login: profile.login,
    name: profile.name || profile.login,
    avatar_url: profile.avatar_url,
  });

  return {
    id: String(row.id),
    login: row.login,
    name: row.name || row.login,
    avatar_url: row.avatar_url,
  };
}
