import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { hashToken } from '../src/auth/session.js';
import { setOAuthStateCookie, verifyAndClearOAuthState } from '../src/auth/github.js';

describe('Session Security & Cryptographic Invariants (12-SECURITY.md)', () => {
  it('hashes session tokens using SHA-256 (never storing raw token)', () => {
    const rawToken = '7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a';
    const hash1 = hashToken(rawToken);
    const hash2 = hashToken(rawToken);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
    expect(hash1).not.toBe(rawToken);
  });

  it('generates secure OAuth state cookie and validates with constant-time check', () => {
    let capturedCookie = '';
    const mockReq: any = {
      secure: false,
      headers: {},
      cookies: {},
    };
    const mockRes: any = {
      cookie: (_name: string, val: string) => {
        capturedCookie = val;
        mockReq.cookies.oauth_state = val;
      },
      clearCookie: () => {
        delete mockReq.cookies.oauth_state;
      },
    };

    const state = setOAuthStateCookie(mockReq, mockRes);
    expect(state).toBeDefined();
    expect(state).toBe(capturedCookie);

    // Valid state verification
    const isValid = verifyAndClearOAuthState(mockReq, mockRes, state);
    expect(isValid).toBe(true);

    // State is single-use: subsequent verification fails
    const isReused = verifyAndClearOAuthState(mockReq, mockRes, state);
    expect(isReused).toBe(false);
  });
});

describe('HTTP Security Headers & CSP (12-SECURITY.md)', () => {
  it('serves required HTTP security headers on all responses', async () => {
    const res = await request(app).get('/healthz');

    expect(res.status).toBe(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(res.headers['permissions-policy']).toBe('camera=(), microphone=(), geolocation=()');
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
  });

  it('rejects mutating requests from untrusted origins without custom headers', async () => {
    const res = await request(app)
      .patch('/api/repos/101/meta')
      .set('Origin', 'https://malicious-origin.com')
      .set('Content-Type', 'application/json')
      .send({ decision: 'retire' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
    expect(res.body.message).toContain('CSRF validation failed');
  });

  it('accepts mutating requests with custom anti-CSRF header', async () => {
    const res = await request(app)
      .post('/auth/logout')
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({});

    expect(res.status).toBe(200);
  });
});
