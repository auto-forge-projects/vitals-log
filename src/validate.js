// Saf dogrulama — sunucu OTORİTEDİR, istemci kontrolu yalnız UX (SEC-5, docs/07-security.md).
const ALLOWED_KEYS = new Set([
  'ts', 'time_period',
  'right_systolic', 'right_diastolic',
  'left_systolic', 'left_diastolic',
  'fever', 'pulse', 'oxygen',
]);
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const TIME_PERIODS = new Set(['Sabah', 'Öğle', 'İkindi', 'Akşam', 'Yatsı']);
const TS_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?([+-]\d{2}:\d{2}|Z)$/;

const RANGES = {
  right_systolic: [40, 300], right_diastolic: [20, 200],
  left_systolic: [40, 300], left_diastolic: [20, 200],
  fever: [30, 45], pulse: [20, 250], oxygen: [50, 100],
};

function fail(code, message, field) {
  return { error: { code, message, field } };
}

function inRange(value, [min, max]) {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

export function validate(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return fail('invalid_field', 'Geçersiz istek gövdesi', null);
  }
  for (const key of Object.keys(input)) {
    if (DANGEROUS_KEYS.has(key)) return fail('invalid_field', 'İzin verilmeyen alan', key);
    if (!ALLOWED_KEYS.has(key)) return fail('invalid_field', `Bilinmeyen alan: ${key}`, key);
  }

  const value = {};
  for (const [field, range] of Object.entries(RANGES)) {
    const raw = input[field];
    if (raw === undefined || raw === null || raw === '') { value[field] = null; continue; }
    const num = Number(raw);
    if (!inRange(num, range)) return fail('invalid_field', `${field} aralık dışı (${range[0]}-${range[1]})`, field);
    value[field] = num;
  }

  const hasMeasurement = ['right_systolic', 'right_diastolic', 'left_systolic', 'left_diastolic', 'fever', 'pulse', 'oxygen']
    .some((f) => value[f] !== null);
  if (!hasMeasurement) return fail('invalid_field', 'En az bir ölçüm alanı gerekli', null);

  if (value.right_systolic !== null && value.right_diastolic !== null && value.right_diastolic >= value.right_systolic) {
    return fail('invalid_field', 'right_diastolic, right_systolic\'ten küçük olmalı', 'right_diastolic');
  }
  if (value.left_systolic !== null && value.left_diastolic !== null && value.left_diastolic >= value.left_systolic) {
    return fail('invalid_field', 'left_diastolic, left_systolic\'ten küçük olmalı', 'left_diastolic');
  }

  const period = input.time_period;
  if (period === undefined || period === null) return fail('invalid_field', 'time_period zorunlu', 'time_period');
  if (!TIME_PERIODS.has(period)) return fail('invalid_field', 'Geçersiz zaman dilimi', 'time_period');
  value.time_period = period;

  if (input.ts !== undefined && input.ts !== null && input.ts !== '') {
    if (typeof input.ts !== 'string' || !TS_RE.test(input.ts)) {
      return fail('invalid_field', 'Geçersiz ts biçimi (ISO-8601 + ofset)', 'ts');
    }
    value.ts = input.ts;
  } else {
    value.ts = new Date().toISOString();
  }

  return { value };
}
