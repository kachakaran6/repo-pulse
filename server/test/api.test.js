import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../index.js';
import http from 'node:http';

test('RepoPulse API integration checks', async (t) => {
  let server;
  let baseUrl;

  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  t.after(() => {
    server.close();
  });

  await t.test('GET /health returns 200 and healthy service payload', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.equal(data.service, 'repopulse-api');
    assert.ok(data.database);
  });

  await t.test('GET /api/settings returns valid default threshold shape', async () => {
    const res = await fetch(`${baseUrl}/api/settings`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(typeof data.active_max_days, 'number');
    assert.equal(typeof data.cooling_max_days, 'number');
    assert.equal(typeof data.stale_max_days, 'number');
    assert.ok(data.active_max_days <= data.cooling_max_days);
    assert.ok(data.cooling_max_days <= data.stale_max_days);
  });
});
