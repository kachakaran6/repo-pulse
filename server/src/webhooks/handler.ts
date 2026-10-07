import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import { memoryDb } from '../db/index.js';
import { logger } from '../utils/logger.js';

// Idempotency delivery cache with 1-hour TTL
const processedDeliveries = new Map<string, number>();

setInterval(() => {
  const now = Date.now();
  for (const [id, time] of processedDeliveries.entries()) {
    if (now - time > 3600000) {
      processedDeliveries.delete(id);
    }
  }
}, 60000);

/**
 * Verify GitHub webhook HMAC-SHA256 signature in constant time
 */
export function verifyWebhookSignature(rawBody: Buffer | string, signatureHeader?: string, secret?: string): boolean {
  const webhookSecret = secret || env.GITHUB_WEBHOOK_SECRET;
  if (!signatureHeader || !webhookSecret) {
    return false;
  }

  const parts = signatureHeader.split('=');
  if (parts.length !== 2 || parts[0] !== 'sha256') {
    return false;
  }

  const signature = parts[1];
  const hmac = crypto.createHmac('sha256', webhookSecret);
  hmac.update(rawBody);
  const expectedSignature = hmac.digest('hex');

  const sigBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

  if (sigBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
}

/**
 * Express Route Handler for incoming GitHub webhooks
 */
export async function handleGitHubWebhook(req: Request, res: Response): Promise<void> {
  const deliveryId = req.headers['x-github-delivery'] as string;
  const event = req.headers['x-github-event'] as string;
  const signature = req.headers['x-hub-signature-256'] as string;

  if (!deliveryId || !event) {
    res.status(400).json({ error: 'Missing required webhook headers' });
    return;
  }

  // Idempotency verification
  if (processedDeliveries.has(deliveryId)) {
    logger.debug({ deliveryId }, 'Duplicate webhook delivery received, ignoring');
    res.status(200).json({ message: 'Event already processed' });
    return;
  }

  // Signature verification (req.rawBody preserved by raw body parser)
  const rawBody = (req as any).rawBody || JSON.stringify(req.body);
  const isValid = verifyWebhookSignature(rawBody, signature);

  if (!isValid) {
    logger.warn({ event, deliveryId }, 'Invalid webhook signature rejected');
    res.status(401).json({ error: 'Invalid webhook signature' });
    return;
  }

  processedDeliveries.set(deliveryId, Date.now());

  // Return 200 fast
  res.status(200).json({ received: true });

  // Process event asynchronously
  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    if (event === 'push') {
      const repoFullName = payload.repository?.full_name;
      const pushedHeadCommit = payload.head_commit?.timestamp || payload.pushed_at;
      
      logger.info({ repoFullName, event }, 'Processing push webhook');

      if (repoFullName) {
        // Find matching repos across all users and update last_commit_at
        for (const repo of memoryDb.repos.values()) {
          if (repo.full_name.toLowerCase() === repoFullName.toLowerCase()) {
            repo.last_commit_at = new Date(pushedHeadCommit || Date.now());
            const day = new Date().toISOString().split('T')[0];
            const currentAct = memoryDb.repoActivity.get(`${repo.id}_${day}`) || { commits: 0 };
            memoryDb.upsertActivity(repo.id, repo.user_id, day, currentAct.commits + (payload.commits?.length || 1));
          }
        }
      }
    } else if (event === 'installation' || event === 'installation_repositories') {
      logger.info({ action: payload.action, installationId: payload.installation?.id }, 'Processing installation webhook');
    }
  } catch (err: any) {
    logger.error({ error: err.message }, 'Error in async webhook event handler');
  }
}
