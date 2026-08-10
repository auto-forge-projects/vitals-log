import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkAccess } from '../src/middleware/accessGate.js';

const PREFIX = '/v/abcdefghijklmnopqrstuvwx0123456789AB'; // >=22 karakter token bolumu

test('/health her zaman muaf (prefix bos olsa bile)', () => {
  assert.deepEqual(checkAccess({ pathname: '/health', mountPrefix: PREFIX }), { allowed: true, remainder: '/health' });
  assert.deepEqual(checkAccess({ pathname: '/health', mountPrefix: '' }), { allowed: true, remainder: '/health' });
});

test('dogru prefix ile kalan yol dogru cikarilir', () => {
  const res = checkAccess({ pathname: `${PREFIX}/api/readings`, mountPrefix: PREFIX });
  assert.equal(res.allowed, true);
  assert.equal(res.remainder, '/api/readings');
});

test('prefix ile TAM eslesme -> kok yol', () => {
  const res = checkAccess({ pathname: PREFIX, mountPrefix: PREFIX });
  assert.equal(res.allowed, true);
  assert.equal(res.remainder, '/');
});

test('yanlis prefix reddedilir', () => {
  const res = checkAccess({ pathname: '/v/yanlis-token/api/readings', mountPrefix: PREFIX });
  assert.equal(res.allowed, false);
});

test('prefix olmadan dogrudan /api istegi reddedilir', () => {
  const res = checkAccess({ pathname: '/api/readings', mountPrefix: PREFIX });
  assert.equal(res.allowed, false);
});

test('bos MOUNT_PREFIX (gelistirme) her yolu gecirir', () => {
  const res = checkAccess({ pathname: '/api/readings', mountPrefix: '' });
  assert.equal(res.allowed, true);
  assert.equal(res.remainder, '/api/readings');
});

test('kismi prefix esleme (uzunluk farkli) reddedilir', () => {
  const res = checkAccess({ pathname: PREFIX.slice(0, -1), mountPrefix: PREFIX });
  assert.equal(res.allowed, false);
});
