import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createStore } from '../src/db.js';

function tmpDbPath() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'vitals-')), 'test.db');
}

test('create + list: yeni kayit olusturur ve ORDER BY ts DESC doner', () => {
  const store = createStore(tmpDbPath());
  store.create({ ts: '2026-08-06T07:00:00+03:00', time_period: 'Sabah', pulse: 70 });
  store.create({ ts: '2026-08-06T13:00:00+03:00', time_period: 'Öğle', pulse: 75 });
  const { items, count } = store.list();
  assert.equal(count, 2);
  assert.equal(items[0].ts, '2026-08-06T13:00:00+03:00'); // en yeni once (DESC)
  store.close();
});

test('get: id ile tek kayit doner, yoksa undefined', () => {
  const store = createStore(tmpDbPath());
  const created = store.create({ ts: '2026-08-06T07:00:00+03:00', time_period: 'Sabah', pulse: 70 });
  assert.equal(store.get(created.id).pulse, 70);
  assert.equal(store.get(999999), undefined);
  store.close();
});

test('update: alanlari gunceller ve updated_at degisir', () => {
  const store = createStore(tmpDbPath());
  const created = store.create({ ts: '2026-08-06T07:00:00+03:00', time_period: 'Sabah', pulse: 70 });
  const updated = store.update(created.id, { pulse: 80 });
  assert.equal(updated.pulse, 80);
  assert.notEqual(updated.updated_at, created.updated_at);
  store.close();
});

test('remove: kaydi kalici siler', () => {
  const store = createStore(tmpDbPath());
  const created = store.create({ ts: '2026-08-06T07:00:00+03:00', time_period: 'Sabah', pulse: 70 });
  assert.equal(store.remove(created.id), true);
  assert.equal(store.get(created.id), undefined);
  assert.equal(store.remove(created.id), false);
  store.close();
});

test('kalicilik: yeniden acilan store ayni dosyadaki veriyi gorur (NFR-4)', () => {
  const dbPath = tmpDbPath();
  const s1 = createStore(dbPath);
  s1.create({ ts: '2026-08-06T07:00:00+03:00', time_period: 'Sabah', pulse: 70 });
  s1.close();
  const s2 = createStore(dbPath);
  assert.equal(s2.list().count, 1);
  s2.close();
});

test('acilista dizin yoksa olusturur', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vitals-nested-'));
  const nested = path.join(dir, 'sub', 'vitals.db');
  const store = createStore(nested);
  assert.ok(fs.existsSync(nested));
  store.close();
});
