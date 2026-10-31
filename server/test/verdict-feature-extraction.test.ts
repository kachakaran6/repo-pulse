import { describe, it, expect } from 'vitest';
import {
  extractVerdictFeatures,
  vectorizeFeatures,
  calculate12WeekTrend,
  calculateHygieneScore,
  explainTopContributingFeatures,
  FEATURE_NAMES,
} from '../src/ml/features.js';

describe('Personalized Verdicts: Feature Extraction', () => {
  const now = new Date('2026-10-30T12:00:00Z').getTime();

  it('extracts all 12 required features from a repository at decision time', () => {
    const mockRepo = {
      id: 1,
      full_name: 'testuser/momentum-service',
      last_commit_at: new Date(now - 14 * 864e5).toISOString(), // 14 days quiet
      created_at_github: new Date(now - 400 * 864e5).toISOString(), // 400 days old
      language: 'TypeScript',
      stars: 42,
      open_issues: 3,
      size_kb: 1024,
      owner_type: 'User',
      default_branch: 'main',
      is_fork: false,
      contributors_count: 4,
      meta: {
        goal_date: '2026-12-31',
        decided_at: new Date(now - 60 * 864e5).toISOString(),
      },
      activity: [
        { day: new Date(now - 5 * 864e5).toISOString().split('T')[0]!, commits_mine: 5 },
        { day: new Date(now - 12 * 864e5).toISOString().split('T')[0]!, commits_mine: 3 },
      ],
    };

    const features = extractVerdictFeatures(mockRepo, now);

    // 1. days_since_last_commit
    expect(features.days_since_last_commit).toBe(14);
    // 2. twelve_week_trend
    expect(typeof features.twelve_week_trend).toBe('number');
    expect(features.twelve_week_trend).toBeGreaterThanOrEqual(-1);
    expect(features.twelve_week_trend).toBeLessThanOrEqual(1);
    // 3. age_days
    expect(features.age_days).toBe(400);
    // 4. language
    expect(features.language).toBe('TypeScript');
    // 5. stars
    expect(features.stars).toBe(42);
    // 6. open_issues_prs
    expect(features.open_issues_prs).toBe(3);
    // 7. hygiene_score
    expect(features.hygiene_score).toBeGreaterThanOrEqual(0);
    expect(features.hygiene_score).toBeLessThanOrEqual(100);
    // 8. has_finish_line
    expect(features.has_finish_line).toBe(true);
    // 9. size_kb
    expect(features.size_kb).toBe(1024);
    // 10. number_of_contributors
    expect(features.contributors_count).toBe(4);
    // 11. owner_type
    expect(features.owner_type).toBe('User');
    // 12. time_since_last_verdict_change_days
    expect(features.time_since_last_verdict_change_days).toBe(60);
  });

  it('handles null, missing, and fallback values gracefully without NaN', () => {
    const minimalRepo = {
      id: 2,
      full_name: 'testuser/bare-repo',
    };

    const features = extractVerdictFeatures(minimalRepo, now);

    expect(features.days_since_last_commit).toBe(365);
    expect(features.twelve_week_trend).toBe(0);
    expect(features.age_days).toBe(180);
    expect(features.language).toBe('Unknown');
    expect(features.stars).toBe(0);
    expect(features.open_issues_prs).toBe(0);
    expect(features.hygiene_score).toBeGreaterThanOrEqual(0);
    expect(features.has_finish_line).toBe(false);
    expect(features.size_kb).toBe(0);
    expect(features.contributors_count).toBe(1);
    expect(features.owner_type).toBe('User');
    expect(features.time_since_last_verdict_change_days).toBe(180);
  });

  it('calculates positive and negative 12-week momentum trends', () => {
    // Accelerating activity in recent weeks
    const acceleratingActivity = [
      { day: new Date(now - 70 * 864e5).toISOString().split('T')[0]!, commits_mine: 1 },
      { day: new Date(now - 14 * 864e5).toISOString().split('T')[0]!, commits_mine: 8 },
      { day: new Date(now - 3 * 864e5).toISOString().split('T')[0]!, commits_mine: 12 },
    ];
    const posTrend = calculate12WeekTrend(acceleratingActivity, now);
    expect(posTrend).toBeGreaterThan(0);

    // Declining activity (commits only in distant weeks)
    const deceleratingActivity = [
      { day: new Date(now - 75 * 864e5).toISOString().split('T')[0]!, commits_mine: 15 },
      { day: new Date(now - 65 * 864e5).toISOString().split('T')[0]!, commits_mine: 10 },
      { day: new Date(now - 2 * 864e5).toISOString().split('T')[0]!, commits_mine: 0 },
    ];
    const negTrend = calculate12WeekTrend(deceleratingActivity, now);
    expect(negTrend).toBeLessThan(0);
  });

  it('vectorizes features into exactly 20 normalized numbers', () => {
    const features = {
      days_since_last_commit: 45,
      twelve_week_trend: -0.35,
      age_days: 720,
      language: 'TypeScript',
      stars: 120,
      open_issues_prs: 4,
      hygiene_score: 85,
      has_finish_line: true,
      size_kb: 4500,
      contributors_count: 3,
      owner_type: 'User' as const,
      time_since_last_verdict_change_days: 90,
    };

    const vector = vectorizeFeatures(features);

    expect(vector).toHaveLength(FEATURE_NAMES.length);
    expect(vector).toHaveLength(20);

    for (let i = 0; i < vector.length; i++) {
      expect(Number.isFinite(vector[i])).toBe(true);
      expect(vector[i]).toBeGreaterThanOrEqual(-1);
      expect(vector[i]).toBeLessThanOrEqual(1);
    }

    // TypeScript one-hot check (index 11)
    expect(vector[11]).toBe(1.0);
    // Python one-hot check (index 13)
    expect(vector[13]).toBe(0.0);
  });

  it('explains top contributing features in plain English', () => {
    const features = {
      days_since_last_commit: 210,
      twelve_week_trend: -0.6,
      age_days: 800,
      language: 'JavaScript',
      stars: 0,
      open_issues_prs: 1,
      hygiene_score: 25,
      has_finish_line: false,
      size_kb: 50,
      contributors_count: 1,
      owner_type: 'User' as const,
      time_since_last_verdict_change_days: 210,
    };

    const topWeights = [
      { name: 'days_since_last_commit', score: 2.4 },
      { name: 'stars', score: 1.8 },
      { name: 'twelve_week_trend', score: 1.2 },
    ];

    const { explanation, contributingFeatures } = explainTopContributingFeatures(
      features,
      'retire',
      topWeights
    );

    expect(explanation).toContain('You usually retire repos like this');
    expect(explanation).toContain('210+ days quiet');
    expect(explanation).toContain('no github stars');
    expect(contributingFeatures).toHaveLength(3);
    expect(contributingFeatures[0]?.label).toBe('Commit Recency');
  });
});
