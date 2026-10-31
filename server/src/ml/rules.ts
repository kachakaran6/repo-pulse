/**
 * Cold-start verdict rules based on Pulse Score activity thresholds.
 * Used when a user has fewer than 30 triage decisions.
 */

import type { Verdict, VerdictFeatures, VerdictSuggestion, ContributingFeature } from './types.js';
import { MIN_DECISIONS_REQUIRED } from './model.js';

/**
 * Computes rule-based verdict suggestion from repository features
 */
export function predictWithRules(
  features: VerdictFeatures,
  decisionCount = 0
): VerdictSuggestion {
  const days = features.days_since_last_commit;
  let verdict: Verdict = 'keep';
  let confidence = 0.8;
  let probKeep = 0.33;
  let probPause = 0.33;
  let probRetire = 0.33;

  if (days <= 10) {
    verdict = 'keep';
    confidence = 0.92;
    probKeep = 0.85;
    probPause = 0.10;
    probRetire = 0.05;
  } else if (days <= 20) {
    verdict = 'keep';
    confidence = 0.78;
    probKeep = 0.70;
    probPause = 0.22;
    probRetire = 0.08;
  } else if (days <= 60) {
    verdict = 'pause';
    confidence = 0.75;
    probKeep = 0.15;
    probPause = 0.72;
    probRetire = 0.13;
  } else if (days <= 120) {
    verdict = 'retire';
    confidence = 0.82;
    probKeep = 0.08;
    probPause = 0.17;
    probRetire = 0.75;
  } else {
    verdict = 'retire';
    confidence = 0.94;
    probKeep = 0.03;
    probPause = 0.07;
    probRetire = 0.90;
  }

  const contributingFeatures: ContributingFeature[] = [
    {
      feature: 'days_since_last_commit',
      label: 'Commit Recency',
      impact: days <= 20 ? 'positive' : 'negative',
      description: days <= 1 ? 'Commits pushed recently' : `${days} days since last commit`,
    },
    {
      feature: 'hygiene_score',
      label: 'Activity Cadence',
      impact: features.hygiene_score >= 50 ? 'positive' : 'negative',
      description: `Hygiene score ${features.hygiene_score}/100`,
    },
    {
      feature: 'twelve_week_trend',
      label: '12-Week Velocity',
      impact: features.twelve_week_trend >= 0 ? 'positive' : 'negative',
      description:
        features.twelve_week_trend > 0.1
          ? 'Positive recent activity trend'
          : features.twelve_week_trend < -0.1
          ? 'Declining commit activity'
          : 'Low commit volume',
    },
  ];

  const remainingDecisions = Math.max(0, MIN_DECISIONS_REQUIRED - decisionCount);
  const explanation = `Suggested by Pulse Score rules (${days <= 1 ? 'active commits' : `${days} days quiet`}). Personalization unlocks after 30 triage decisions (${decisionCount}/${MIN_DECISIONS_REQUIRED} logged, ${remainingDecisions} more to go).`;

  return {
    verdict,
    confidence,
    probabilities: {
      keep: probKeep,
      pause: probPause,
      retire: probRetire,
    },
    explanation,
    contributingFeatures,
    source: 'rule_based_cold_start',
    decisionCount,
  };
}
