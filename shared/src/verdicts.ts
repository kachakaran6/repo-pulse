/**
 * Shared types and contracts for Personalized Verdict Suggestions & Learning
 */

import type { Verdict } from './index.js';

export interface VerdictFeatures {
  days_since_last_commit: number;
  twelve_week_trend: number; // -1.0 to 1.0 (linear regression momentum slope)
  age_days: number;
  language: string;
  stars: number;
  open_issues_prs: number;
  hygiene_score: number; // 0 to 100 composite
  has_finish_line: boolean;
  size_kb: number;
  contributors_count: number;
  owner_type: 'User' | 'Organization';
  time_since_last_verdict_change_days: number;
}

export interface ContributingFeature {
  feature: string;
  label: string;
  impact: 'positive' | 'negative';
  description: string;
  weight?: number;
}

export interface VerdictSuggestion {
  verdict: Verdict;
  confidence: number; // 0.0 to 1.0
  probabilities: {
    keep: number;
    pause: number;
    retire: number;
  };
  explanation: string;
  contributingFeatures: ContributingFeature[];
  source: 'ml_model' | 'rule_based_cold_start';
  decisionCount: number;
}

export interface VerdictLearningStats {
  status: 'cold_start' | 'trained';
  decisionCount: number;
  agreementCount: number;
  overrideCount: number;
  agreementRate: number; // percentage 0 - 100
  minDecisionsRequired: number; // 30
  trainedAt: string | null;
  topSignals?: string[];
}

export interface VerdictDecisionRecord {
  id: string | number;
  userId: string | number;
  repoId: string | number;
  verdict: Verdict;
  previousVerdict: Verdict | null;
  suggestedVerdict: Verdict | null;
  suggestionConfidence: number | null;
  suggestionSource: 'ml_model' | 'rule_based_cold_start';
  agreed: boolean | null;
  features: VerdictFeatures;
  createdAt: string;
}
