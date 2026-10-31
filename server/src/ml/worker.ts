/**
 * Verdict Model Training Worker and Nightly Scheduler
 */

import { Queue, Worker, type Job } from 'bullmq';
import { verdictLearningService } from './service.js';
import { db } from '../db/index.js';
import { logger } from '../utils/logger.js';
import { MIN_DECISIONS_REQUIRED } from './model.js';

export interface VerdictTrainingJobData {
  userId: string | number;
}

const QUEUE_NAME = 'verdict-model-training';
const redisUrl = process.env.REDIS_URL;

let trainingQueue: Queue<VerdictTrainingJobData> | null = null;
let trainingWorker: Worker<VerdictTrainingJobData> | null = null;

if (redisUrl) {
  try {
    trainingQueue = new Queue<VerdictTrainingJobData>(QUEUE_NAME, {
      connection: { url: redisUrl },
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 50,
      },
    });

    trainingWorker = new Worker<VerdictTrainingJobData>(
      QUEUE_NAME,
      async (job: Job<VerdictTrainingJobData>) => {
        logger.info({ jobId: job.id, userId: job.data.userId }, 'Processing verdict model training job');
        await verdictLearningService.trainUserModel(job.data.userId);
      },
      { connection: { url: redisUrl }, concurrency: 1 }
    );

    trainingWorker.on('completed', (job) => {
      logger.info({ jobId: job.id }, 'Verdict model training job completed');
    });

    trainingWorker.on('failed', (job, err) => {
      logger.error({ jobId: job?.id, error: err.message }, 'Verdict model training job failed');
    });
  } catch (err: any) {
    logger.warn({ error: err.message }, 'BullMQ not available for verdict training, using in-process runner');
    trainingQueue = null;
    trainingWorker = null;
  }
}

/**
 * Enqueue a model retraining job for a user
 */
export async function scheduleVerdictTraining(userId: string | number): Promise<void> {
  if (trainingQueue) {
    try {
      await trainingQueue.add('train-user-model', { userId });
      return;
    } catch (err: any) {
      logger.warn({ error: err.message, userId }, 'Failed to queue training job, running synchronously');
    }
  }

  // Fallback: Run in next event loop tick
  setImmediate(async () => {
    try {
      await verdictLearningService.trainUserModel(userId);
    } catch (err: any) {
      logger.error({ error: err.message, userId }, 'In-process verdict model training failed');
    }
  });
}

/**
 * Nightly batch retrain for all users who have at least 30 decisions
 */
export async function runNightlyVerdictRetraining(): Promise<number> {
  logger.info('Starting nightly personalized verdict retraining run');
  let retrainedCount = 0;

  try {
    // In postgres or memory, get users who have verdicts
    const users = await db.getAllUsers?.() || [];
    for (const u of users) {
      const stats = await verdictLearningService.getLearningStats(u.id);
      if (stats.decisionCount >= MIN_DECISIONS_REQUIRED) {
        await verdictLearningService.trainUserModel(u.id);
        retrainedCount++;
      }
    }
  } catch (err: any) {
    logger.error({ error: err.message }, 'Nightly verdict retraining failed');
  }

  return retrainedCount;
}

// Set up 24-hour interval for nightly retraining (non-blocking)
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const nightlyTimer = setInterval(() => {
  runNightlyVerdictRetraining().catch(() => {});
}, TWENTY_FOUR_HOURS_MS);

// Allow Node to exit cleanly in tests
if (nightlyTimer && typeof nightlyTimer.unref === 'function') {
  nightlyTimer.unref();
}
