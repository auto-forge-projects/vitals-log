import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkAccess, assertProductionPrefix } from '../src/middleware/accessGate.js';

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

// REQ-001: '/' ile baslamayan bir MOUNT_PREFIX uzunluk kontrolunu gecebilir ama HICBIR gercek
// yola (hepsi '/' ile baslar) asla eslesmez -> sunucu acilir, her yol sessizce 404 doner.
test('gelistirmede onek olmadan (gercek yol) MOUNT_PREFIX asla eslesmez', () => {
  const noSlashToken = 'abcdefghijklmnopqrstuvwx0123456789AB'; // >=22 karakter ama '/' yok
  const res = checkAccess({ pathname: '/api/readings', mountPrefix: noSlashToken });
  assert.equal(res.allowed, false);
});

test('assertProductionPrefix: gecerli /v/ onekli token production baslatmaya izin verir', () => {
  assert.doesNotThrow(() => assertProductionPrefix({ nodeEnv: 'production', mountPrefix: PREFIX }));
});

test('assertProductionPrefix: development onek kontrolunden muaf', () => {
  assert.doesNotThrow(() => assertProductionPrefix({ nodeEnv: 'development', mountPrefix: 'kisa' }));
});

test('assertProductionPrefix: kisa token fail-closed olur', () => {
  assert.throws(() => assertProductionPrefix({ nodeEnv: 'production', mountPrefix: '/v/kisa' }));
});

// REQ-001 kok neden: eski gen-token ciktisi gibi '/' ile BASLAMAYAN ama >=22 karakter bir token
// artik fail-closed'i GECMEMELI (eskiden geciyordu -> sessiz erisilemezlik).
test('assertProductionPrefix: onek "/" ile baslamiyorsa fail-closed olur (REQ-001)', () => {
  const noSlashToken = 'abcdefghijklmnopqrstuvwx0123456789AB'; // >=22 karakter, '/' yok
  assert.throws(() => assertProductionPrefix({ nodeEnv: 'production', mountPrefix: noSlashToken }));
});
