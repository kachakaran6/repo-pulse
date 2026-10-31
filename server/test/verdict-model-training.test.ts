import { describe, it, expect } from 'vitest';
import {
  trainVerdictModel,
  predictWithModel,
  MIN_DECISIONS_REQUIRED,
  type TrainingSample,
} from '../src/ml/model.js';
import type { VerdictFeatures, Verdict } from '../src/ml/types.js';

describe('Personalized Verdicts: Model Training on Fixture Data', () => {
  const now = new Date('2026-10-30T12:00:00Z').getTime();

  // Helper to generate synthetic repo features for training fixtures
  function createSampleFeatures(overrides: Partial<VerdictFeatures> = {}): VerdictFeatures {
    return {
      days_since_last_commit: 5,
      twelve_week_trend: 0.5,
      age_days: 300,
      language: 'TypeScript',
      stars: 50,
      open_issues_prs: 2,
      hygiene_score: 90,
      has_finish_line: true,
      size_kb: 2000,
      contributors_count: 3,
      owner_type: 'User',
      time_since_last_verdict_change_days: 30,
      ...overrides,
    };
  }

  // Generate 45 realistic historical decisions fixture (>= 30 required)
  function generateFixtureDataset(): TrainingSample[] {
    const samples: TrainingSample[] = [];

    // Pattern 1: Active repos (15 samples) -> keep
    for (let i = 0; i < 15; i++) {
      samples.push({
        features: createSampleFeatures({
          days_since_last_commit: 1 + (i % 7), // 1-7 days quiet
          twelve_week_trend: 0.3 + (i % 5) * 0.1,
          stars: 20 + i * 10,
          hygiene_score: 80 + (i % 20),
        }),
        verdict: 'keep',
        createdAt: new Date(now - i * 3 * 864e5).toISOString(),
      });
    }

    // Pattern 2: Cooling repos (15 samples) -> pause
    for (let i = 0; i < 15; i++) {
      samples.push({
        features: createSampleFeatures({
          days_since_last_commit: 20 + (i % 20), // 20-40 days quiet
          twelve_week_trend: -0.2 - (i % 4) * 0.1,
          stars: 5 + (i % 10),
          hygiene_score: 50 + (i % 20),
        }),
        verdict: 'pause',
        createdAt: new Date(now - (i + 15) * 3 * 864e5).toISOString(),
      });
    }

    // Pattern 3: Dead repos (15 samples) -> retire
    for (let i = 0; i < 15; i++) {
      samples.push({
        features: createSampleFeatures({
          days_since_last_commit: 150 + i * 15, // 150-375 days quiet
          twelve_week_trend: -0.8,
          stars: 0,
          hygiene_score: 20,
          has_finish_line: false,
          contributors_count: 1,
        }),
        verdict: 'retire',
        createdAt: new Date(now - (i + 30) * 3 * 864e5).toISOString(),
      });
    }

    return samples;
  }

  it('trains multinomial logistic regression on 45 fixture decisions with low loss', () => {
    const fixture = generateFixtureDataset();
    expect(fixture.length).toBeGreaterThanOrEqual(MIN_DECISIONS_REQUIRED);

    const model = trainVerdictModel(fixture, now);

    expect(model.classes).toEqual(['keep', 'pause', 'retire']);
    expect(model.weights).toHaveLength(3);
    expect(model.biases).toHaveLength(3);
    expect(model.samplesCount).toBe(45);
    expect(model.loss).toBeLessThan(0.7); // Good cross-entropy convergence
  });

  it('accurately predicts keep, pause, and retire on unseen test features', () => {
    const fixture = generateFixtureDataset();
    const model = trainVerdictModel(fixture, now);

    // Test A: Active repo -> Should predict keep with high confidence
    const activeTestRepo = createSampleFeatures({
      days_since_last_commit: 2,
      twelve_week_trend: 0.7,
      stars: 85,
      hygiene_score: 95,
    });
    const keepPrediction = predictWithModel(activeTestRepo, model, 45);
    expect(keepPrediction.verdict).toBe('keep');
    expect(keepPrediction.confidence).toBeGreaterThanOrEqual(0.65);
    expect(keepPrediction.probabilities.keep).toBeGreaterThan(keepPrediction.probabilities.retire);
    expect(keepPrediction.source).toBe('ml_model');
    expect(keepPrediction.explanation).toContain('keep');

    // Test B: Abandoned repo -> Should predict retire with high confidence
    const deadTestRepo = createSampleFeatures({
      days_since_last_commit: 240,
      twelve_week_trend: -0.9,
      stars: 0,
      hygiene_score: 15,
      has_finish_line: false,
    });
    const retirePrediction = predictWithModel(deadTestRepo, model, 45);
    expect(retirePrediction.verdict).toBe('retire');
    expect(retirePrediction.confidence).toBeGreaterThanOrEqual(0.65);
    expect(retirePrediction.probabilities.retire).toBeGreaterThan(retirePrediction.probabilities.keep);
    expect(retirePrediction.explanation).toContain('retire');
    expect(retirePrediction.contributingFeatures.length).toBeGreaterThanOrEqual(1);
  });

  it('handles class imbalance with inverse frequency weighting', () => {
    // 80% keep (32 samples), 10% pause (4 samples), 10% retire (4 samples) = 40 samples
    const imbalancedDataset: TrainingSample[] = [];

    for (let i = 0; i < 32; i++) {
      imbalancedDataset.push({
        features: createSampleFeatures({ days_since_last_commit: 5 }),
        verdict: 'keep',
      });
    }
    for (let i = 0; i < 4; i++) {
      imbalancedDataset.push({
        features: createSampleFeatures({ days_since_last_commit: 40 }),
        verdict: 'pause',
      });
    }
    for (let i = 0; i < 4; i++) {
      imbalancedDataset.push({
        features: createSampleFeatures({ days_since_last_commit: 300, stars: 0 }),
        verdict: 'retire',
      });
    }

    const model = trainVerdictModel(imbalancedDataset, now);

    // An abandoned repo should still successfully predict retire despite retire being only 10% of samples
    const abandonedRepo = createSampleFeatures({
      days_since_last_commit: 320,
      stars: 0,
      hygiene_score: 10,
    });
    const pred = predictWithModel(abandonedRepo, model, 40);
    expect(pred.verdict).toBe('retire');
  });

  it('handles concept drift by prioritizing recent decisions over ancient ones', () => {
    const driftDataset: TrainingSample[] = [];

    // In the ancient past (250 days ago), user always retired 30-day quiet repos (15 samples)
    for (let i = 0; i < 15; i++) {
      driftDataset.push({
        features: createSampleFeatures({ days_since_last_commit: 30 }),
        verdict: 'retire',
        createdAt: new Date(now - 250 * 864e5).toISOString(),
      });
    }

    // Recently (past 15 days), user changed mind and now pauses 30-day quiet repos (15 samples)
    for (let i = 0; i < 15; i++) {
      driftDataset.push({
        features: createSampleFeatures({ days_since_last_commit: 30 }),
        verdict: 'pause',
        createdAt: new Date(now - 10 * 864e5).toISOString(),
      });
    }

    const model = trainVerdictModel(driftDataset, now);

    // When evaluating a 30-day quiet repo, the recent preference (pause) should dominate
    const testRepo = createSampleFeatures({ days_since_last_commit: 30 });
    const pred = predictWithModel(testRepo, model, 30);
    expect(pred.verdict).toBe('pause');
  });
});
