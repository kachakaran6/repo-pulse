/**
 * Personalized Verdict Learning & Suggestion Service
 */

import { db } from '../db/index.js';
import { extractVerdictFeatures } from './features.js';
import {
  trainVerdictModel,
  predictWithModel,
  MIN_DECISIONS_REQUIRED,
  type TrainingSample,
} from './model.js';
import { predictWithRules } from './rules.js';
import type {
  Verdict,
  VerdictFeatures,
  VerdictSuggestion,
  VerdictLearningStats,
} from './types.js';
import { logger } from '../utils/logger.js';

export class VerdictLearningService {
  /**
   * Generates a suggested verdict for a repository using trained ML model or cold-start rules
   */
  async getSuggestedVerdict(
    userId: string | number,
    repo: any,
    now = Date.now()
  ): Promise<{ suggestion: VerdictSuggestion; features: VerdictFeatures }> {
    const features = extractVerdictFeatures(repo, now);
    const modelRecord = await db.getUserVerdictModel(userId);

    const decisionCount = modelRecord?.decision_count || 0;

    if (modelRecord?.status === 'trained' && modelRecord?.model_data?.weights) {
      try {
        const suggestion = predictWithModel(features, modelRecord.model_data, decisionCount);
        return { suggestion, features };
      } catch (err: any) {
        logger.warn({ error: err.message, userId }, 'Failed to predict with trained model, falling back to rules');
      }
    }

    // Cold-start fallback
    const suggestion = predictWithRules(features, decisionCount);
    return { suggestion, features };
  }

  /**
   * Logs a user triage decision, tracks agreement/override, and triggers retraining if threshold met
   */
  async recordDecision(
    userId: string | number,
    repoId: string | number,
    verdict: Verdict,
    options: {
      repo?: any;
      suggestedVerdict?: Verdict | null;
      suggestionConfidence?: number | null;
      suggestionSource?: string;
      previousVerdict?: Verdict | null;
    } = {}
  ) {
    let suggestedVerdict = options.suggestedVerdict;
    let confidence = options.suggestionConfidence;
    let source = options.suggestionSource || 'rule_based_cold_start';
    let features: VerdictFeatures | null = null;

    // If suggestion wasn't passed directly, compute it now
    if (suggestedVerdict === undefined && options.repo) {
      const computed = await this.getSuggestedVerdict(userId, options.repo);
      suggestedVerdict = computed.suggestion.verdict;
      confidence = computed.suggestion.confidence;
      source = computed.suggestion.source;
      features = computed.features;
    } else if (options.repo) {
      features = extractVerdictFeatures(options.repo);
    }

    const agreed = suggestedVerdict ? verdict === suggestedVerdict : null;

    const record = await db.recordVerdict(userId, repoId, verdict, {
      previousVerdict: options.previousVerdict ?? null,
      suggestedVerdict: suggestedVerdict ?? null,
      suggestionConfidence: confidence ?? null,
      suggestionSource: source,
      agreed,
      features,
    });

    // Check if eligible for retraining (30 decisions or nightly)
    const modelRecord = await db.getUserVerdictModel(userId);
    if (modelRecord.decision_count >= MIN_DECISIONS_REQUIRED && modelRecord.status === 'cold_start') {
      // Automatic initial training transition
      try {
        await this.trainUserModel(userId);
      } catch (err: any) {
        logger.warn({ error: err.message, userId }, 'Automatic first-time ML model training failed');
      }
    }

    return record;
  }

  /**
   * Trains or retrains a lightweight ML model on the user's historical decisions
   */
  async trainUserModel(userId: string | number): Promise<VerdictLearningStats> {
    const historicalVerdicts = await db.getUserVerdicts(userId, 2000);

    const validSamples: TrainingSample[] = [];
    for (const v of historicalVerdicts) {
      if (v.features && v.verdict) {
        validSamples.push({
          features: v.features,
          verdict: v.verdict as Verdict,
          createdAt: v.created_at,
        });
      }
    }

    if (validSamples.length < MIN_DECISIONS_REQUIRED) {
      const modelRecord = await db.getUserVerdictModel(userId);
      return this.formatLearningStats(modelRecord, validSamples.length);
    }

    // Train the model in-process
    const weights = trainVerdictModel(validSamples);

    await db.saveUserVerdictModel(userId, {
      status: 'trained',
      model_data: weights,
      decision_count: validSamples.length,
      trained_at: new Date(),
    });

    const updatedModel = await db.getUserVerdictModel(userId);
    return this.formatLearningStats(updatedModel, validSamples.length);
  }

  /**
   * Returns current personalization learning stats for user
   */
  async getLearningStats(userId: string | number): Promise<VerdictLearningStats> {
    const modelRecord = await db.getUserVerdictModel(userId);
    const verdicts = await db.getUserVerdicts(userId, 2000);
    return this.formatLearningStats(modelRecord, verdicts.length);
  }

  /**
   * Resets personalization back to cold-start Pulse Score rules
   */
  async resetPersonalization(userId: string | number): Promise<VerdictLearningStats> {
    await db.resetUserVerdictPersonalization(userId);
    return this.getLearningStats(userId);
  }

  private formatLearningStats(modelRecord: any, samplesCount = 0): VerdictLearningStats {
    const totalCount = Math.max(samplesCount, modelRecord?.decision_count || 0);
    const agreements = modelRecord?.agreement_count || 0;
    const overrides = modelRecord?.override_count || 0;
    const evaluated = agreements + overrides;

    const agreementRate = evaluated > 0 ? Math.round((agreements / evaluated) * 100) : 100;

    return {
      status: modelRecord?.status === 'trained' ? 'trained' : 'cold_start',
      decisionCount: totalCount,
      agreementCount: agreements,
      overrideCount: overrides,
      agreementRate,
      minDecisionsRequired: MIN_DECISIONS_REQUIRED,
      trainedAt: modelRecord?.trained_at ? new Date(modelRecord.trained_at).toISOString() : null,
      topSignals: ['days_since_last_commit', 'twelve_week_trend', 'stars', 'hygiene_score'],
    };
  }
}

export const verdictLearningService = new VerdictLearningService();
