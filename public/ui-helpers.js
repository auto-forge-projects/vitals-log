// Saf yardimcilar — app.js'in DOM-bagimli kismindan ayrildi ki node:test ile dogrulanabilsin.
const NUMERIC_FIELDS = [
  'right_systolic', 'right_diastolic', 'left_systolic', 'left_diastolic',
  'fever', 'pulse', 'oxygen',
];

export function payloadFromForm(fields) {
  const out = {};
  if (fields.ts) out.ts = fields.ts;
  if (fields.time_period) out.time_period = fields.time_period;
  for (const key of NUMERIC_FIELDS) {
    const raw = fields[key];
    out[key] = raw === '' || raw === undefined || raw === null ? null : Number(raw);
  }
  return out;
}

const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
// ts kendi ofsetini tasir (mimari: sabit +03:00) — Date/local TZ'ye guvenmek yerine
// dizeden dogrudan okunur, boylece sunucu/tarayici/test TZ'sinden bagimsiz gosterilir.
const TS_PARTS_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/;

export function formatDateLabel(ts) {
  const m = TS_PARTS_RE.exec(ts);
  if (!m) return ts;
  const [, , month, day, hh, mm] = m;
  return `${day} ${MONTHS[Number(month) - 1]} ${hh}:${mm}`;
}

const FIELD_LABELS = {
  right_systolic: 'Sağ kol büyük tansiyon', right_diastolic: 'Sağ kol küçük tansiyon',
  left_systolic: 'Sol kol büyük tansiyon', left_diastolic: 'Sol kol küçük tansiyon',
  fever: 'Ateş', pulse: 'Nabız', oxygen: 'Oksijen', time_period: 'Zaman dilimi', ts: 'Saat',
};

export function errorMessage(err) {
  if (!err) return 'Hata: sunucuya ulaşılamadı, tekrar deneyin.';
  const field = err.field ? (FIELD_LABELS[err.field] || err.field) : null;
  switch (err.code) {
    case 'invalid_field':
      return field ? `Hata: ${field} geçerli bir değer değil.` : `Hata: ${err.message || 'geçersiz alan'}.`;
    case 'not_found':
      return 'Hata: kayıt bulunamadı veya artık mevcut değil.';
    case 'unsupported_media_type':
      return 'Hata: istek biçimi desteklenmiyor.';
    case 'rate_limited':
      return 'Hata: çok fazla istek, biraz sonra tekrar deneyin.';
    default:
      return `Hata: ${err.message || 'beklenmeyen bir sorun oluştu'}.`;
  }
}
