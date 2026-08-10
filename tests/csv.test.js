import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toCsv } from '../src/csv.js';

test('BOM ile baslar', () => {
  const csv = toCsv([]);
  assert.equal(csv.charCodeAt(0), 0xFEFF);
});

test('basliklar mimaride tanimlanan sirada', () => {
  const csv = toCsv([]);
  const header = csv.slice(1).split('\r\n')[0];
  assert.equal(header, 'ts,time_period,right_systolic,right_diastolic,right_mean,right_map,left_systolic,left_diastolic,left_mean,left_map,fever,pulse,oxygen');
});

test('turetilmis alanlar (mean/map) satira eklenir', () => {
  const csv = toCsv([{
    ts: '2026-08-06T07:00:00+03:00', time_period: 'Sabah',
    right_systolic: 120, right_diastolic: 80,
    left_systolic: 130, left_diastolic: 85,
    fever: 36.6, pulse: 72, oxygen: 98,
  }]);
  const lines = csv.slice(1).split('\r\n');
  assert.equal(lines[1], '2026-08-06T07:00:00+03:00,Sabah,120,80,100,93.3,130,85,107.5,100,36.6,72,98');
});

test('CRLF satir sonu kullanilir', () => {
  const csv = toCsv([{ ts: 'a', time_period: 'Sabah', pulse: 70 }]);
  assert.ok(csv.includes('\r\n'));
  assert.ok(!csv.replace(/\r\n/g, '').includes('\n'));
});

test('virgul iceren deger tirnaklanir', () => {
  const csv = toCsv([{ ts: '2026,08', time_period: 'Sabah', pulse: 70 }]);
  const lines = csv.slice(1).split('\r\n');
  assert.ok(lines[1].startsWith('"2026,08"'));
});

test('eksik alan bos hucre olur', () => {
  const csv = toCsv([{ ts: 'a', time_period: 'Sabah', pulse: 70 }]);
  const lines = csv.slice(1).split('\r\n');
  const cells = lines[1].split(',');
  assert.equal(cells[2], ''); // right_systolic
});
