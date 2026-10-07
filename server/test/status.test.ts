import { describe, it, expect } from 'vitest';
import { statusOf, explainStatus, generateSummarySentence, thresholdsSchema } from '../src/core/status.js';

describe('statusOf Pure Status Logic', () => {
  const now = new Date('2026-10-07T00:00:00.000Z').getTime();
  const dayMs = 864e5;

  it('handles null, undefined, and empty timestamps as dead', () => {
    expect(statusOf(null, now)).toBe('dead');
    expect(statusOf(undefined, now)).toBe('dead');
    expect(statusOf('', now)).toBe('dead');
    expect(statusOf('invalid-date', now)).toBe('dead');
  });

  it('classifies active repositories within default 0-7 days', () => {
    expect(statusOf(new Date(now).toISOString(), now)).toBe('active');
    expect(statusOf(new Date(now - 1 * dayMs).toISOString(), now)).toBe('active');
    expect(statusOf(new Date(now - 7 * dayMs).toISOString(), now)).toBe('active');
  });

  it('classifies cooling repositories within default 8-14 days', () => {
    expect(statusOf(new Date(now - 8 * dayMs).toISOString(), now)).toBe('cooling');
    expect(statusOf(new Date(now - 14 * dayMs).toISOString(), now)).toBe('cooling');
  });

  it('classifies stale repositories within default 15-30 days', () => {
    expect(statusOf(new Date(now - 15 * dayMs).toISOString(), now)).toBe('stale');
    expect(statusOf(new Date(now - 30 * dayMs).toISOString(), now)).toBe('stale');
  });

  it('classifies dead repositories past 30 days', () => {
    expect(statusOf(new Date(now - 31 * dayMs).toISOString(), now)).toBe('dead');
    expect(statusOf(new Date(now - 90 * dayMs).toISOString(), now)).toBe('dead');
    expect(statusOf(new Date(now - 365 * dayMs).toISOString(), now)).toBe('dead');
  });

  it('supports custom user-defined thresholds (e.g., 10 / 20 / 45)', () => {
    const custom = { active: 10, cooling: 20, stale: 45 };
    expect(statusOf(new Date(now - 10 * dayMs).toISOString(), now, custom)).toBe('active');
    expect(statusOf(new Date(now - 11 * dayMs).toISOString(), now, custom)).toBe('cooling');
    expect(statusOf(new Date(now - 20 * dayMs).toISOString(), now, custom)).toBe('cooling');
    expect(statusOf(new Date(now - 21 * dayMs).toISOString(), now, custom)).toBe('stale');
    expect(statusOf(new Date(now - 45 * dayMs).toISOString(), now, custom)).toBe('stale');
    expect(statusOf(new Date(now - 46 * dayMs).toISOString(), now, custom)).toBe('dead');
  });
});

describe('explainStatus Human Rationale', () => {
  const now = new Date('2026-10-07T00:00:00.000Z').getTime();
  const dayMs = 864e5;

  it('explains active repository clearly', () => {
    const res = explainStatus(new Date(now - 2 * dayMs).toISOString(), now);
    expect(res.status).toBe('active');
    expect(res.days).toBe(2);
    expect(res.message).toContain('committed 2 days ago (within 7d limit)');
  });

  it('explains cooling repository boundary', () => {
    const res = explainStatus(new Date(now - 10 * dayMs).toISOString(), now);
    expect(res.status).toBe('cooling');
    expect(res.days).toBe(10);
    expect(res.message).toContain('past 7d active, within 14d cooling');
  });

  it('explains dead repository with null timestamp', () => {
    const res = explainStatus(null, now);
    expect(res.status).toBe('dead');
    expect(res.days).toBeNull();
    expect(res.message).toBe('No commit activity recorded');
  });
});

describe('Thresholds Schema Validation', () => {
  it('accepts valid strictly ascending thresholds', () => {
    const valid = thresholdsSchema.safeParse({ active_days: 7, cooling_days: 14, stale_days: 30 });
    expect(valid.success).toBe(true);
  });

  it('rejects non-ascending thresholds (cooling <= active)', () => {
    const invalid = thresholdsSchema.safeParse({ active_days: 14, cooling_days: 7, stale_days: 30 });
    expect(invalid.success).toBe(false);
  });

  it('rejects non-ascending thresholds (stale <= cooling)', () => {
    const invalid = thresholdsSchema.safeParse({ active_days: 7, cooling_days: 30, stale_days: 20 });
    expect(invalid.success).toBe(false);
  });
});

describe('generateSummarySentence Rule-based Text', () => {
  it('generates sentence for active commits and cold repos', () => {
    const sentence = generateSummarySentence({
      totalRepos: 10,
      activeCount: 5,
      coolingCount: 2,
      staleCount: 1,
      deadCount: 2,
      weeklyCommits: 14,
      committedReposThisWeek: 3,
      wentColdCount: 2,
    });
    expect(sentence).toBe('You committed to 3 repos this week. 2 went cold.');
  });

  it('generates empty state sentence when no repos exist', () => {
    const sentence = generateSummarySentence({
      totalRepos: 0,
      activeCount: 0,
      coolingCount: 0,
      staleCount: 0,
      deadCount: 0,
      weeklyCommits: 0,
      committedReposThisWeek: 0,
      wentColdCount: 0,
    });
    expect(sentence).toBe('No repositories connected yet. Connect your GitHub account to get started.');
  });
});
