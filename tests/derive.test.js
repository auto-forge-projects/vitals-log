import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mean, map, periodFor, enrich } from '../src/derive.js';

test('mean: aritmetik ortalama, 1 ondalik', () => {
  assert.equal(mean(120, 80), 100);
  assert.equal(mean(121, 79), 100);
  assert.equal(mean(130, 85), 107.5);
});

test('mean: eksik deger null doner', () => {
  assert.equal(mean(null, 80), null);
  assert.equal(mean(120, null), null);
  assert.equal(mean(undefined, undefined), null);
});

test('map: diyastolik + (sistolik-diyastolik)/3', () => {
  assert.equal(map(120, 80), 93.3);
  assert.equal(map(90, 60), 70);
});

test('map: eksik deger null doner', () => {
  assert.equal(map(null, 80), null);
});

test('periodFor: gunduz esikleri', () => {
  assert.equal(periodFor(5), 'Sabah');
  assert.equal(periodFor(10), 'Sabah');
  assert.equal(periodFor(11), 'Öğle');
  assert.equal(periodFor(14), 'Öğle');
  assert.equal(periodFor(15), 'İkindi');
  assert.equal(periodFor(17), 'İkindi');
  assert.equal(periodFor(18), 'Akşam');
  assert.equal(periodFor(20), 'Akşam');
});

test('periodFor: Yatsi gece yarisini sarar', () => {
  assert.equal(periodFor(21), 'Yatsı');
  assert.equal(periodFor(23), 'Yatsı');
  assert.equal(periodFor(0), 'Yatsı');
  assert.equal(periodFor(4), 'Yatsı');
});

test('enrich: satira turetilmis kol ortalamalarini ekler', () => {
  const row = {
    right_systolic: 120, right_diastolic: 80,
    left_systolic: 130, left_diastolic: 85,
    fever: 36.6, pulse: 72, oxygen: 98,
  };
  const out = enrich(row);
  assert.equal(out.right_mean, 100);
  assert.equal(out.right_map, 93.3);
  assert.equal(out.left_mean, 107.5);
  assert.equal(out.left_map, 100);
  assert.equal(out.fever, 36.6);
});

test('enrich: eksik kol verisinde ortalamalar null', () => {
  const out = enrich({ right_systolic: null, right_diastolic: null, left_systolic: 120, left_diastolic: 80 });
  assert.equal(out.right_mean, null);
  assert.equal(out.right_map, null);
  assert.equal(out.left_mean, 100);
});
