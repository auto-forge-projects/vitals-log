import { test } from 'node:test';
import assert from 'node:assert/strict';
import { payloadFromForm, formatDateLabel, errorMessage } from '../public/ui-helpers.js';

test('payloadFromForm: bos alanlari null yapar, sayisal alanlari Number cevirir', () => {
  const p = payloadFromForm({
    ts: '', time_period: 'Sabah',
    right_systolic: '120', right_diastolic: '80',
    left_systolic: '', left_diastolic: '',
    fever: '', pulse: '72', oxygen: '',
  });
  assert.equal(p.ts, undefined); // bos -> sunucu now() atasin diye hic gonderilmez
  assert.equal(p.right_systolic, 120);
  assert.equal(p.left_systolic, null);
  assert.equal(p.pulse, 72);
  assert.equal(p.time_period, 'Sabah');
});

test('formatDateLabel: TR yerel gosterim', () => {
  const label = formatDateLabel('2026-08-10T08:15:00+03:00');
  assert.match(label, /10/);
  assert.match(label, /08:15/);
});

test('errorMessage: bilinen hata kodlarina TR mesaj uretir', () => {
  assert.match(errorMessage({ code: 'invalid_field', field: 'right_systolic' }), /Sağ kol büyük tansiyon/);
  assert.match(errorMessage({ code: 'not_found' }), /bulunamadı|mevcut değil/i);
  assert.match(errorMessage(null), /sunucuya ulaşılamadı/i);
});
