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

  await t.test('active boundary: 0 to 7 days', () => {
    assert.equal(statusOf(new Date(now).toISOString(), now), 'active');
    assert.equal(statusOf(new Date(now - 1 * dayMs).toISOString(), now), 'active');
    assert.equal(statusOf(new Date(now - 7 * dayMs).toISOString(), now), 'active');
  });

  await t.test('cooling boundary: 8 to 14 days', () => {
    assert.equal(statusOf(new Date(now - 8 * dayMs).toISOString(), now), 'cooling');
    assert.equal(statusOf(new Date(now - 14 * dayMs).toISOString(), now), 'cooling');
  });

  await t.test('stale boundary: 15 to 30 days', () => {
    assert.equal(statusOf(new Date(now - 15 * dayMs).toISOString(), now), 'stale');
    assert.equal(statusOf(new Date(now - 30 * dayMs).toISOString(), now), 'stale');
  });

  await t.test('dead boundary: 31+ days', () => {
    assert.equal(statusOf(new Date(now - 31 * dayMs).toISOString(), now), 'dead');
    assert.equal(statusOf(new Date(now - 60 * dayMs).toISOString(), now), 'dead');
    assert.equal(statusOf(new Date(now - 365 * dayMs).toISOString(), now), 'dead');
  });
});
