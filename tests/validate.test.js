import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate } from '../src/validate.js';

function ok(input) {
  const r = validate(input);
  assert.equal(r.error, undefined, `beklenmeyen hata: ${JSON.stringify(r.error)}`);
  return r.value;
}
function err(input) {
  const r = validate(input);
  assert.ok(r.error, 'hata bekleniyordu ama yok');
  return r.error;
}

test('gecerli tam kayit kabul edilir', () => {
  const v = ok({
    right_systolic: 120, right_diastolic: 80,
    left_systolic: 118, left_diastolic: 76,
    fever: 36.6, pulse: 72, oxygen: 98,
    time_period: 'Sabah',
  });
  assert.equal(v.right_systolic, 120);
  assert.ok(v.ts); // ts verilmediyse now() atanir
});

test('en az bir olcum zorunlu', () => {
  const e = err({ time_period: 'Sabah' });
  assert.equal(e.code, 'invalid_field');
});

test('sistolik araligi disinda deger reddedilir', () => {
  const e = err({ right_systolic: 39, right_diastolic: 80, time_period: 'Sabah' });
  assert.equal(e.field, 'right_systolic');
});

test('diyastolik sistolikten buyuk olamaz', () => {
  const e = err({ right_systolic: 80, right_diastolic: 90, time_period: 'Sabah' });
  assert.equal(e.field, 'right_diastolic');
});

test('oksijen 50-100 disi reddedilir (DDL ile birebir)', () => {
  err({ oxygen: 49, time_period: 'Sabah' });
  err({ oxygen: 101, time_period: 'Sabah' });
  ok({ oxygen: 50, time_period: 'Sabah' });
  ok({ oxygen: 100, time_period: 'Sabah' });
});

test('gecersiz time_period reddedilir', () => {
  const e = err({ pulse: 70, time_period: 'Gece' });
  assert.equal(e.field, 'time_period');
});

test('bilinmeyen alan reddedilir', () => {
  const e = err({ pulse: 70, time_period: 'Sabah', extra_field: 1 });
  assert.equal(e.field, 'extra_field');
});

test('__proto__ own-property olarak gelirse reddedilir', () => {
  const input = JSON.parse('{"pulse":70,"time_period":"Sabah","__proto__":{"x":1}}');
  const e = err(input);
  assert.equal(e.field, '__proto__');
});

test('constructor anahtari reddedilir (prototype pollution)', () => {
  const input = JSON.parse('{"pulse":70,"time_period":"Sabah","constructor":{"x":1}}');
  const e = err(input);
  assert.equal(e.field, 'constructor');
});

test('ts verilirse aynen korunur', () => {
  const v = ok({ pulse: 70, time_period: 'Sabah', ts: '2026-08-06T07:15:00+03:00' });
  assert.equal(v.ts, '2026-08-06T07:15:00+03:00');
});

test('gecersiz ts formati reddedilir', () => {
  const e = err({ pulse: 70, time_period: 'Sabah', ts: '06/08/2026' });
  assert.equal(e.field, 'ts');
});
