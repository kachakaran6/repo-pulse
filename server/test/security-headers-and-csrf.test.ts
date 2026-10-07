import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

describe('Security Headers & CSRF Verification (12-SECURITY.md)', () => {
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
      .post('/api/repos/101/meta')
      .set('Origin', 'https://malicious-attacker.com')
      .set('Content-Type', 'text/plain')
      .send('forged-payload');

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
    expect(res.body.message).toContain('CSRF validation failed');
  });

  it('allows mutating requests with custom anti-CSRF header', async () => {
    const res = await request(app)
      .post('/auth/logout')
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({});

    expect(res.status).toBe(200);
  });
});
