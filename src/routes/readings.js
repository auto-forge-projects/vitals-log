import { validate } from '../validate.js';
import { enrich } from '../derive.js';
import { toCsv } from '../csv.js';

function json(status, body) {
  return { status, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body };
}
function errBody(code, message, field) {
  return { error: { code, message, ...(field !== undefined ? { field } : {}) } };
}

const EDITABLE_FIELDS = [
  'ts', 'time_period',
  'right_systolic', 'right_diastolic',
  'left_systolic', 'left_diastolic',
  'fever', 'pulse', 'oxygen',
];
function pickEditable(row) {
  const out = {};
  for (const key of EDITABLE_FIELDS) out[key] = row[key] ?? null;
  return out;
}

// req: { method, segments, query, body } — segments = '/api/readings' SONRASI yol parcalari.
// Saf HTTP<->domain cevirisi: node:http'e bagli degil, kolay birim testi icin.
export function createReadingsHandler(store) {
  return function handle(req) {
    const { method, segments = [], query = {}, body } = req;

    if (method === 'GET' && segments.length === 0) {
      const limit = query.limit !== undefined ? Math.min(1000, Math.max(1, Number(query.limit) || 1000)) : undefined;
      const { items, count } = store.list();
      const enriched = items.map(enrich);
      const sliced = limit ? enriched.slice(0, limit) : enriched;
      return json(200, { count, items: sliced });
    }

    if (method === 'GET' && segments.length === 1 && segments[0] === 'export.csv') {
      const { items } = store.list();
      return {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="vitals-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.csv"`,
          'Cache-Control': 'no-store',
        },
        body: toCsv(items),
      };
    }

    if (method === 'POST' && segments.length === 0) {
      const { error, value } = validate(body);
      if (error) return json(400, errBody(error.code, error.message, error.field));
      const created = store.create(value);
      return json(201, enrich(created));
    }

    if (method === 'PUT' && segments.length === 1) {
      const id = Number(segments[0]);
      const existing = store.get(id);
      if (!existing) return json(404, errBody('not_found', 'Kayıt bulunamadı'));
      const merged = { ...pickEditable(existing), ...body };
      const { error, value } = validate(merged);
      if (error) return json(400, errBody(error.code, error.message, error.field));
      const updated = store.update(id, value);
      return json(200, enrich(updated));
    }

    if (method === 'DELETE' && segments.length === 1) {
      const id = Number(segments[0]);
      const removed = store.remove(id);
      if (!removed) return json(404, errBody('not_found', 'Kayıt bulunamadı'));
      return { status: 204, headers: {}, body: null };
    }

    return json(404, errBody('not_found', 'Bilinmeyen uç'));
  };
}
