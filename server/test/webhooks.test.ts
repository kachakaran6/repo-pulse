import { describe, it, expect } from 'vitest';
import request from 'supertest';
import crypto from 'node:crypto';
import { app } from '../src/app.js';
import { verifyWebhookSignature } from '../src/webhooks/handler.js';
import { env } from '../src/config/env.js';

describe('GitHub Webhooks Security & HMAC Verification (Stage S3)', () => {
  const webhookSecret = 'test_webhook_secret_key_12345';

  it('verifies valid HMAC-SHA256 signature in constant time', () => {
    const rawPayload = JSON.stringify({ action: 'push', repository: { full_name: 'test/repo' } });
    const hmac = crypto.createHmac('sha256', webhookSecret).update(rawPayload).digest('hex');
    const signatureHeader = `sha256=${hmac}`;

    const isValid = verifyWebhookSignature(rawPayload, signatureHeader, webhookSecret);
    expect(isValid).toBe(true);
  });

  it('rejects tampered webhook payloads or signatures', () => {
    const rawPayload = JSON.stringify({ action: 'push', repository: { full_name: 'test/repo' } });
    const tamperedPayload = JSON.stringify({ action: 'push', repository: { full_name: 'hacked/repo' } });
    const hmac = crypto.createHmac('sha256', webhookSecret).update(rawPayload).digest('hex');
    const signatureHeader = `sha256=${hmac}`;

    const isValid = verifyWebhookSignature(tamperedPayload, signatureHeader, webhookSecret);
    expect(isValid).toBe(false);
  });

  it('rejects invalid or forged signature over HTTP', async () => {
    const res = await request(app)
      .post('/webhooks/github')
      .set('X-GitHub-Delivery', 'delivery-uuid-123')
      .set('X-GitHub-Event', 'push')
      .set('X-Hub-Signature-256', 'sha256=invalid_forged_hash')
      .send({ action: 'push' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid webhook signature');
  });

  it('accepts valid signed webhook and enforces delivery idempotency', async () => {
    const payload = { action: 'push', repository: { full_name: 'test/repo' } };
    const rawBody = JSON.stringify(payload);
    const hmac = crypto.createHmac('sha256', env.GITHUB_WEBHOOK_SECRET).update(rawBody).digest('hex');
    const signature = `sha256=${hmac}`;
    const deliveryId = `delivery-unique-${Date.now()}`;

    // First delivery -> 200 OK
    const firstRes = await request(app)
      .post('/webhooks/github')
      .set('X-GitHub-Delivery', deliveryId)
      .set('X-GitHub-Event', 'push')
      .set('X-Hub-Signature-256', signature)
      .set('Content-Type', 'application/json')
      .send(payload);

    expect(firstRes.status).toBe(200);
    expect(firstRes.body.received).toBe(true);

    // Duplicate delivery -> 200 OK with "already processed" message
    const duplicateRes = await request(app)
      .post('/webhooks/github')
      .set('X-GitHub-Delivery', deliveryId)
      .set('X-GitHub-Event', 'push')
      .set('X-Hub-Signature-256', signature)
      .set('Content-Type', 'application/json')
      .send(payload);

    expect(duplicateRes.status).toBe(200);
    expect(duplicateRes.body.message).toBe('Event already processed');
  });
});
