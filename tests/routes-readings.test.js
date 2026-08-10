import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createStore } from '../src/db.js';
import { createReadingsHandler } from '../src/routes/readings.js';

function freshHandler() {
  const dbPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'vitals-routes-')), 'test.db');
  const store = createStore(dbPath);
  return { store, handle: createReadingsHandler(store) };
}

test('POST /api/readings: gecerli govde 201 + turetilmis alanlar doner', () => {
  const { handle } = freshHandler();
  const res = handle({
    method: 'POST', segments: [], query: {},
    body: { right_systolic: 120, right_diastolic: 80, time_period: 'Sabah', pulse: 70 },
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.right_mean, 100);
  assert.ok(res.body.id);
});

test('POST /api/readings: gecersiz govde 400 + hata zarfi', () => {
  const { handle } = freshHandler();
  const res = handle({ method: 'POST', segments: [], query: {}, body: { right_systolic: 999 } });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.field, 'right_systolic');
  assert.equal(res.body.error.stack, undefined);
});

test('GET /api/readings: liste + count doner', () => {
  const { handle } = freshHandler();
  handle({ method: 'POST', segments: [], query: {}, body: { pulse: 70, time_period: 'Sabah' } });
  const res = handle({ method: 'GET', segments: [], query: {} });
  assert.equal(res.status, 200);
  assert.equal(res.body.count, 1);
  assert.equal(res.body.items.length, 1);
});

test('PUT /api/readings/:id: gunceller, olmayan id 404', () => {
  const { handle } = freshHandler();
  const created = handle({ method: 'POST', segments: [], query: {}, body: { pulse: 70, time_period: 'Sabah' } }).body;
  const updated = handle({ method: 'PUT', segments: [String(created.id)], query: {}, body: { pulse: 80 } });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.pulse, 80);

  const missing = handle({ method: 'PUT', segments: ['999999'], query: {}, body: { pulse: 80 } });
  assert.equal(missing.status, 404);
});

test('DELETE /api/readings/:id: 204, olmayan id 404', () => {
  const { handle } = freshHandler();
  const created = handle({ method: 'POST', segments: [], query: {}, body: { pulse: 70, time_period: 'Sabah' } }).body;
  const res = handle({ method: 'DELETE', segments: [String(created.id)], query: {} });
  assert.equal(res.status, 204);
  const again = handle({ method: 'DELETE', segments: [String(created.id)], query: {} });
  assert.equal(again.status, 404);
});

test('GET /api/readings/export.csv: text/csv doner', () => {
  const { handle } = freshHandler();
  handle({ method: 'POST', segments: [], query: {}, body: { pulse: 70, time_period: 'Sabah' } });
  const res = handle({ method: 'GET', segments: ['export.csv'], query: {} });
  assert.equal(res.status, 200);
  assert.equal(res.headers['Content-Type'], 'text/csv; charset=utf-8');
  assert.ok(res.headers['Content-Disposition'].startsWith('attachment;'));
  assert.ok(res.body.includes('ts,time_period'));
});

test('bilinmeyen metot/yol 404', () => {
  const { handle } = freshHandler();
  const res = handle({ method: 'PATCH', segments: [], query: {} });
  assert.equal(res.status, 404);
});
