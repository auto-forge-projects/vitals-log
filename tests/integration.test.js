import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from '../src/server.js';
import { createStore } from '../src/db.js';

function tmpDbPath() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'vitals-int-')), 'test.db');
}

async function withServer(fn) {
  const dbPath = tmpDbPath();
  const server = createServer({ vitalsDb: dbPath, mountPrefix: '', nodeEnv: 'test' });
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  try {
    await fn(`http://127.0.0.1:${port}`, dbPath);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('uctan uca: create -> list -> update -> delete -> export.csv (FR-1..6)', async () => {
  await withServer(async (base) => {
    const created = await (await fetch(`${base}/api/readings`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        right_systolic: 120, right_diastolic: 80,
        left_systolic: 118, left_diastolic: 76,
        fever: 36.6, pulse: 72, oxygen: 98, time_period: 'Sabah',
      }),
    })).json();
    assert.equal(created.right_mean, 100);

    const list1 = await (await fetch(`${base}/api/readings`)).json();
    assert.equal(list1.count, 1);

    const updated = await (await fetch(`${base}/api/readings/${created.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pulse: 85 }),
    })).json();
    assert.equal(updated.pulse, 85);
    assert.equal(updated.right_mean, 100); // korunan alanlar yeniden turetildi

    const csvRes = await fetch(`${base}/api/readings/export.csv`);
    const csv = await csvRes.text();
    assert.ok(csv.includes('85'));

    const del = await fetch(`${base}/api/readings/${created.id}`, { method: 'DELETE' });
    assert.equal(del.status, 204);

    const list2 = await (await fetch(`${base}/api/readings`)).json();
    assert.equal(list2.count, 0);
  });
});

test('NFR-1: 200+ kayitla liste suresi <= 1sn', async () => {
  // Seed DOGRUDAN store uzerinden yapilir (SEC-4 hiz siniri HTTP katmanindadir — burada
  // olcmek istedigimiz "200 satirla GET suresi", 200 ardisik POST'un rate-limit'e carpmasi degil).
  const dbPath = tmpDbPath();
  const seedStore = createStore(dbPath);
  for (let i = 0; i < 200; i++) {
    seedStore.create({ ts: new Date(Date.now() - i * 60_000).toISOString(), time_period: 'Sabah', pulse: 60 + (i % 40) });
  }
  seedStore.close();

  const server = createServer({ vitalsDb: dbPath, mountPrefix: '', nodeEnv: 'test' });
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  try {
    const start = Date.now();
    const res = await fetch(`http://127.0.0.1:${port}/api/readings`);
    const body = await res.json();
    const elapsed = Date.now() - start;
    assert.equal(body.count, 200);
    assert.ok(elapsed <= 1000, `liste suresi ${elapsed}ms > 1000ms`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('SEC-4: IP basina dakikada 120 istek asilinca 429 doner', async () => {
  await withServer(async (base) => {
    let last;
    for (let i = 0; i < 121; i++) {
      last = await fetch(`${base}/api/readings`);
    }
    assert.equal(last.status, 429);
    assert.ok(last.headers.get('retry-after'));
  });
});

test('NFR-4: sunucu yeniden baslatilsa da veri korunur (ayni db dosyasi)', async () => {
  const dbPath = tmpDbPath();
  const s1 = createServer({ vitalsDb: dbPath, mountPrefix: '', nodeEnv: 'test' });
  await new Promise((resolve) => s1.listen(0, resolve));
  const port1 = s1.address().port;
  await fetch(`http://127.0.0.1:${port1}/api/readings`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pulse: 70, time_period: 'Sabah' }),
  });
  await new Promise((resolve) => s1.close(resolve));

  const s2 = createServer({ vitalsDb: dbPath, mountPrefix: '', nodeEnv: 'test' });
  await new Promise((resolve) => s2.listen(0, resolve));
  const port2 = s2.address().port;
  const list = await (await fetch(`http://127.0.0.1:${port2}/api/readings`)).json();
  assert.equal(list.count, 1);
  await new Promise((resolve) => s2.close(resolve));
});

test('capability-URL kapisi: gizli prefix ile tam akis calisir', async () => {
  const prefix = '/v/' + 'a'.repeat(32);
  const dbPath = tmpDbPath();
  const server = createServer({ vitalsDb: dbPath, mountPrefix: prefix, nodeEnv: 'test' });
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  try {
    const base = `http://127.0.0.1:${port}`;
    const wrong = await fetch(`${base}/api/readings`);
    assert.equal(wrong.status, 404);
    const health = await fetch(`${base}/health`);
    assert.equal(health.status, 200);
    const right = await fetch(`${base}${prefix}/api/readings`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pulse: 70, time_period: 'Sabah' }),
    });
    assert.equal(right.status, 201);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('fail-closed: production + kisa MOUNT_PREFIX ile sunucu olusturulamaz (SEC-2)', () => {
  assert.throws(() => createServer({ vitalsDb: tmpDbPath(), mountPrefix: '/x', nodeEnv: 'production' }));
});
