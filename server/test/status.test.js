import test from 'node:test';
import assert from 'node:assert/strict';
import { statusOf } from '../index.js';

test('statusOf status classification and boundary tests', async (t) => {
  const now = new Date('2026-10-07T00:00:00.000Z').getTime();
  const dayMs = 864e5;

  await t.test('null or undefined timestamp yields dead', () => {
    assert.equal(statusOf(null, now), 'dead');
    assert.equal(statusOf(undefined, now), 'dead');
    assert.equal(statusOf('', now), 'dead');
  });

  await t.test('active boundary: 0 to 7 days (default)', () => {
    assert.equal(statusOf(new Date(now).toISOString(), now), 'active');
    assert.equal(statusOf(new Date(now - 1 * dayMs).toISOString(), now), 'active');
    assert.equal(statusOf(new Date(now - 7 * dayMs).toISOString(), now), 'active');
  });

  await t.test('cooling boundary: 8 to 14 days (default)', () => {
    assert.equal(statusOf(new Date(now - 8 * dayMs).toISOString(), now), 'cooling');
    assert.equal(statusOf(new Date(now - 14 * dayMs).toISOString(), now), 'cooling');
  });

  await t.test('stale boundary: 15 to 30 days (default)', () => {
    assert.equal(statusOf(new Date(now - 15 * dayMs).toISOString(), now), 'stale');
    assert.equal(statusOf(new Date(now - 30 * dayMs).toISOString(), now), 'stale');
  });

  await t.test('dead boundary: 31+ days (default)', () => {
    assert.equal(statusOf(new Date(now - 31 * dayMs).toISOString(), now), 'dead');
    assert.equal(statusOf(new Date(now - 60 * dayMs).toISOString(), now), 'dead');
    assert.equal(statusOf(new Date(now - 365 * dayMs).toISOString(), now), 'dead');
  });

  await t.test('custom thresholds: 10 / 20 / 45 days', () => {
    const custom = { active: 10, cooling: 20, stale: 45 };
    assert.equal(statusOf(new Date(now - 10 * dayMs).toISOString(), now, custom), 'active');
    assert.equal(statusOf(new Date(now - 11 * dayMs).toISOString(), now, custom), 'cooling');
    assert.equal(statusOf(new Date(now - 20 * dayMs).toISOString(), now, custom), 'cooling');
    assert.equal(statusOf(new Date(now - 21 * dayMs).toISOString(), now, custom), 'stale');
    assert.equal(statusOf(new Date(now - 45 * dayMs).toISOString(), now, custom), 'stale');
    assert.equal(statusOf(new Date(now - 46 * dayMs).toISOString(), now, custom), 'dead');
  });

  await t.test('per-repository threshold overrides take precedence over global settings', () => {
    const globalThresh = { active: 7, cooling: 14, stale: 30 };
    // repo with override active=3, cooling=6, stale=12
    const repoOverride = { custom_active_days: 3, custom_cooling_days: 6, custom_stale_days: 12 };

    // At 4 days: globally active (<=7), but per-repo cooling (>3 and <=6)
    assert.equal(statusOf(new Date(now - 4 * dayMs).toISOString(), now, globalThresh, repoOverride), 'cooling');
    // At 8 days: globally cooling (<=14), but per-repo stale (>6 and <=12)
    assert.equal(statusOf(new Date(now - 8 * dayMs).toISOString(), now, globalThresh, repoOverride), 'stale');
    // At 15 days: globally stale (<=30), but per-repo dead (>12)
    assert.equal(statusOf(new Date(now - 15 * dayMs).toISOString(), now, globalThresh, repoOverride), 'dead');
  });
});

import { explainStatus, DEFAULT_CATEGORIES, DEFAULT_TAGS } from '../index.js';

test('explainStatus returns human-readable rationale and boundaries', async (t) => {
  const now = new Date('2026-10-07T00:00:00.000Z').getTime();
  const dayMs = 864e5;

  await t.test('explains active repository', () => {
    const res = explainStatus(new Date(now - 2 * dayMs).toISOString(), now);
    assert.equal(res.status, 'active');
    assert.equal(res.days, 2);
    assert.match(res.message, /committed 2 days ago/);
  });

  await t.test('explains cooling repository', () => {
    const res = explainStatus(new Date(now - 10 * dayMs).toISOString(), now);
    assert.equal(res.status, 'cooling');
    assert.equal(res.days, 10);
    assert.match(res.message, /past 7d active, within 14d cooling/);
  });

  await t.test('explains null timestamp gracefully', () => {
    const res = explainStatus(null, now);
    assert.equal(res.status, 'dead');
    assert.equal(res.days, null);
    assert.match(res.message, /No commit activity/);
  });
});

test('taxonomy constants provide sensible defaults', () => {
  assert.ok(DEFAULT_CATEGORIES.includes('Web app'));
  assert.ok(DEFAULT_CATEGORIES.includes('API/service'));
  assert.ok(DEFAULT_TAGS.includes('React'));
  assert.ok(DEFAULT_TAGS.includes('PostgreSQL'));
});

