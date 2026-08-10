import { test } from 'node:test';
import assert from 'node:assert/strict';
import { securityHeaders } from '../src/middleware/securityHeaders.js';

test('CSP script-src self, inline yok', () => {
  const h = securityHeaders();
  assert.match(h['Content-Security-Policy'], /script-src 'self'/);
  assert.match(h['Content-Security-Policy'], /frame-ancestors 'none'/);
});

test('gizlilik/onbellek basliklari mevcut', () => {
  const h = securityHeaders();
  assert.equal(h['Referrer-Policy'], 'no-referrer');
  assert.equal(h['X-Content-Type-Options'], 'nosniff');
  assert.equal(h['X-Robots-Tag'], 'noindex, nofollow');
  assert.equal(h['Cache-Control'], 'no-store');
  assert.match(h['Strict-Transport-Security'], /max-age=/);
});
