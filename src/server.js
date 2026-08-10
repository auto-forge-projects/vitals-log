import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig, } from './config.js';
import { checkAccess, assertProductionPrefix } from './middleware/accessGate.js';
import { securityHeaders } from './middleware/securityHeaders.js';
import { createStore } from './db.js';
import { createReadingsHandler } from './routes/readings.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const MAX_BODY_BYTES = 64 * 1024;
const RATE_LIMIT_PER_MIN = 120;

const STATIC_FILES = {
  '/': { file: 'index.html', type: 'text/html; charset=utf-8' },
  '/app.js': { file: 'app.js', type: 'application/javascript; charset=utf-8' },
  '/styles.css': { file: 'styles.css', type: 'text/css; charset=utf-8' },
};

function redactPath(pathname, mountPrefix) {
  return mountPrefix && pathname.startsWith(mountPrefix) ? pathname.replace(mountPrefix, '/v/***') : pathname;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('payload_too_large'), { code: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function createRateLimiter(limitPerMin) {
  const buckets = new Map(); // ip -> { count, windowStart }
  return function allow(ip) {
    const now = Date.now();
    const windowMs = 60_000;
    const entry = buckets.get(ip);
    if (!entry || now - entry.windowStart >= windowMs) {
      buckets.set(ip, { count: 1, windowStart: now });
      return true;
    }
    entry.count += 1;
    return entry.count <= limitPerMin;
  };
}

export function createServer(overrides = {}) {
  const config = { ...loadConfig(), ...overrides };
  assertProductionPrefix(config);
  const store = createStore(config.vitalsDb);
  const readingsHandler = createReadingsHandler(store);
  const rateLimiterAllow = createRateLimiter(RATE_LIMIT_PER_MIN);
  const deriveJsPath = path.join(__dirname, 'derive.js');

  const server = http.createServer(async (req, res) => {
    const started = Date.now();
    const headers = securityHeaders();
    for (const [key, value] of Object.entries(headers)) res.setHeader(key, value);

    function send(status, body, extraHeaders = {}) {
      for (const [k, v] of Object.entries(extraHeaders)) res.setHeader(k, v);
      const duration = Date.now() - started;
      const redacted = redactPath(url.pathname, config.mountPrefix);
      // SEC-3: yol redakte edilir, govde/query DEGERI asla loglanmaz.
      console.log(JSON.stringify({ method: req.method, path: redacted, status, duration_ms: duration }));
      if (body === null || body === undefined) { res.writeHead(status); res.end(); return; }
      if (typeof body === 'string') { res.writeHead(status); res.end(body); return; }
      res.writeHead(status);
      res.end(JSON.stringify(body));
    }

    let url;
    try {
      url = new URL(req.url, 'http://internal');
    } catch {
      return send(400, { error: { code: 'bad_request', message: 'Geçersiz istek' } }, { 'Content-Type': 'application/json; charset=utf-8' });
    }

    const ip = req.socket.remoteAddress || 'unknown';
    if (url.pathname !== '/health' && !rateLimiterAllow(ip)) {
      return send(429, { error: { code: 'rate_limited', message: 'Çok fazla istek' } }, {
        'Content-Type': 'application/json; charset=utf-8', 'Retry-After': '60',
      });
    }

    const gate = checkAccess({ pathname: url.pathname, mountPrefix: config.mountPrefix });
    if (!gate.allowed) return send(404, { error: { code: 'not_found', message: 'Bulunamadı' } }, { 'Content-Type': 'application/json; charset=utf-8' });

    const innerPath = gate.remainder;

    try {
      if (innerPath === '/health') {
        return send(200, { status: 'ok' }, { 'Content-Type': 'application/json; charset=utf-8' });
      }

      if (innerPath === '/js/derive.js') {
        const content = fs.readFileSync(deriveJsPath, 'utf8');
        return send(200, content, { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-cache' });
      }

      if (STATIC_FILES[innerPath]) {
        const meta = STATIC_FILES[innerPath];
        const filePath = path.join(PUBLIC_DIR, meta.file);
        const content = fs.readFileSync(filePath, 'utf8');
        return send(200, content, { 'Content-Type': meta.type, 'Cache-Control': 'no-cache' });
      }

      if (innerPath.startsWith('/api/readings')) {
        if ((req.method === 'POST' || req.method === 'PUT') && !/^application\/json/.test(req.headers['content-type'] || '')) {
          return send(415, { error: { code: 'unsupported_media_type', message: 'Content-Type: application/json gerekli' } }, { 'Content-Type': 'application/json; charset=utf-8' });
        }
        let body;
        if (req.method === 'POST' || req.method === 'PUT') {
          let raw;
          try { raw = await readBody(req); }
          catch (e) { return send(e.code === 413 ? 413 : 400, { error: { code: 'bad_request', message: 'Gövde okunamadı' } }, { 'Content-Type': 'application/json; charset=utf-8' }); }
          try { body = raw ? JSON.parse(raw) : {}; }
          catch { return send(400, { error: { code: 'invalid_json', message: 'Geçersiz JSON' } }, { 'Content-Type': 'application/json; charset=utf-8' }); }
        }
        const segments = innerPath.replace(/^\/api\/readings\/?/, '').split('/').filter(Boolean);
        const query = Object.fromEntries(url.searchParams);
        const result = readingsHandler({ method: req.method, segments, query, body });
        return send(result.status, result.body, result.headers);
      }

      return send(404, { error: { code: 'not_found', message: 'Bulunamadı' } }, { 'Content-Type': 'application/json; charset=utf-8' });
    } catch (e) {
      // SEC-10: yigin izi / ic hata mesaji ASLA istemciye sizmaz.
      console.error(JSON.stringify({ method: req.method, path: redactPath(url.pathname, config.mountPrefix), error: String(e && e.message) }));
      return send(500, { error: { code: 'internal_error', message: 'Sunucu hatası' } }, { 'Content-Type': 'application/json; charset=utf-8' });
    }
  });

  server.on('close', () => store.close());
  return server;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const config = loadConfig();
  const server = createServer(config);
  server.listen(config.port, () => {
    console.log(JSON.stringify({ event: 'listening', port: config.port, mount_prefix_set: !!config.mountPrefix }));
  });
  process.on('SIGTERM', () => server.close(() => process.exit(0)));
}
