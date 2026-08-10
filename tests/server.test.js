import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from '../src/server.js';

function tmpDbPath() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'vitals-srv-')), 'test.db');
}

async function withServer(opts, fn) {
  const server = createServer({ vitalsDb: tmpDbPath(), mountPrefix: '', nodeEnv: 'test', ...opts });
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('/health prefix olmadan da 200 doner ve yalniz status tasir', async () => {
  await withServer({ mountPrefix: '/v/gizli-token-01234567890123456789' }, async (base) => {
    const res = await fetch(`${base}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body, { status: 'ok' });
  });
});

test('prefix varken prefixsiz /api istegi 404 doner', async () => {
  await withServer({ mountPrefix: '/v/gizli-token-01234567890123456789' }, async (base) => {
    const res = await fetch(`${base}/api/readings`);
    assert.equal(res.status, 404);
  });
});

test('dogru prefix ile /api/readings erisilebilir', async () => {
  const prefix = '/v/gizli-token-01234567890123456789';
  await withServer({ mountPrefix: prefix }, async (base) => {
    const res = await fetch(`${base}${prefix}/api/readings`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.count, 0);
  });
});

test('tum yanitlarda guvenlik basliklari var (404 dahil)', async () => {
  await withServer({}, async (base) => {
    const res = await fetch(`${base}/olmayan-yol`);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('referrer-policy'), 'no-referrer');
  });
});

test('Content-Type olmadan POST 415 doner', async () => {
  await withServer({}, async (base) => {
    const res = await fetch(`${base}/api/readings`, { method: 'POST', body: JSON.stringify({ pulse: 70, time_period: 'Sabah' }) });
    assert.equal(res.status, 415);
  });
});

test('gecerli POST 201 doner ve GET listede gorunur', async () => {
  await withServer({}, async (base) => {
    const post = await fetch(`${base}/api/readings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pulse: 70, time_period: 'Sabah' }),
    });
    assert.equal(post.status, 201);
    const list = await (await fetch(`${base}/api/readings`)).json();
    assert.equal(list.count, 1);
  });
});

test('statik index.html servis edilir', async () => {
  await withServer({}, async (base) => {
    const res = await fetch(`${base}/`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /text\/html/);
  });
});

test('path traversal denemesi 404 doner', async () => {
  await withServer({}, async (base) => {
    const res = await fetch(`${base}/../../etc/passwd`);
    assert.ok(res.status === 404 || res.status === 400);
  });
});

test('/js/derive.js istemciye servis edilir', async () => {
  await withServer({}, async (base) => {
    const res = await fetch(`${base}/js/derive.js`);
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.match(text, /export function mean/);
  });
});
