/**
 * Indexing Job Queue (BullMQ with resilient in-process execution fallback)
 */

import { Queue, Worker, type Job } from 'bullmq';
import { indexUserRepositories } from './indexer.js';
import { logger } from '../utils/logger.js';

export interface IndexJobData {
  userId: string | number;
  repoId?: string | number;
  fullReindex?: boolean;
}

const QUEUE_NAME = 'repo-indexing';
const redisUrl = process.env.REDIS_URL;

let bullQueue: Queue<IndexJobData> | null = null;
let bullWorker: Worker<IndexJobData> | null = null;

// Initialize BullMQ if Redis is configured
if (redisUrl) {
  try {
    bullQueue = new Queue<IndexJobData>(QUEUE_NAME, {
      connection: { url: redisUrl },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });

    bullWorker = new Worker<IndexJobData>(
      QUEUE_NAME,
      async (job: Job<IndexJobData>) => {
        logger.info({ jobId: job.id, data: job.data }, 'Processing BullMQ repo indexing job');
        await indexUserRepositories(job.data.userId, {
          fullReindex: job.data.fullReindex,
          repoId: job.data.repoId,
        });
      },
      { connection: { url: redisUrl }, concurrency: 2 }
    );

    bullWorker.on('completed', (job) => {
      logger.info({ jobId: job.id }, 'BullMQ repo indexing job completed');
    });

    bullWorker.on('failed', (job, err) => {
      logger.error({ jobId: job?.id, error: err.message }, 'BullMQ repo indexing job failed');
    });
  } catch (err: any) {
    logger.warn({ error: err.message }, 'Failed to initialize BullMQ Redis queue, falling back to resilient in-process runner');
    bullQueue = null;
    bullWorker = null;
  }
}

/**
 * Enqueue an indexing job for a user
 */
export async function enqueueIndexingJob(
  userId: string | number,
  options: { fullReindex?: boolean; repoId?: string | number } = {}
): Promise<{ jobId: string; queued: boolean; status: string }> {
  const jobData: IndexJobData = {
    userId,
    repoId: options.repoId,
    fullReindex: options.fullReindex,
  };

  if (bullQueue) {
    try {
      const job = await bullQueue.add('index-user-repos', jobData);
      return {
        jobId: String(job.id),
        queued: true,
        status: 'queued',
      };
    } catch (err: any) {
      logger.warn({ error: err.message }, 'BullMQ enqueue failed, executing with in-process runner');
    }
  }

  // Resilient in-process execution fallback for environments without Redis
  const mockJobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  // Execute async without blocking the HTTP request
  setTimeout(async () => {
    try {
      await indexUserRepositories(userId, options);
    } catch (err: any) {
      logger.error({ error: err.message, jobId: mockJobId }, 'In-process indexing job failed');
    }
  }, 10);

  return {
    jobId: mockJobId,
    queued: true,
    status: 'running',
  };
}

/**
 * Close queue and worker connections on shutdown
 */
export async function closeIndexingQueue(): Promise<void> {
  if (bullWorker) {
    await bullWorker.close();
  }
  if (bullQueue) {
    await bullQueue.close();
  }
}
