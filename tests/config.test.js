import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../src/config.js';

test('varsayilanlar', () => {
  const c = loadConfig({});
  assert.equal(c.port, 3000);
  assert.equal(c.vitalsDb, '/app/data/vitals.db');
  assert.equal(c.mountPrefix, '');
  assert.equal(c.nodeEnv, 'development');
});

test('env degerleri varsayilani ezer', () => {
  const c = loadConfig({ PORT: '4000', VITALS_DB: '/tmp/x.db', MOUNT_PREFIX: '/v/abc', NODE_ENV: 'production' });
  assert.equal(c.port, 4000);
  assert.equal(c.vitalsDb, '/tmp/x.db');
  assert.equal(c.mountPrefix, '/v/abc');
  assert.equal(c.nodeEnv, 'production');
});
