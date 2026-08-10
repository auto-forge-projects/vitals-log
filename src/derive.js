// Saf turetim fonksiyonlari — DB'ye/HTTP'ye bagimliligi yok. Sunucu import eder,
// tarayiciya /js/derive.js olarak AYNI dosya servis edilir (tek kaynak — DL-04-003, DL-05-004).

const PERIOD_THRESHOLDS = [
  { start: 5, end: 10, label: 'Sabah' },
  { start: 11, end: 14, label: 'Öğle' },
  { start: 15, end: 17, label: 'İkindi' },
  { start: 18, end: 20, label: 'Akşam' },
];

function round1(n) {
  return Math.round(n * 10) / 10;
}

export function mean(systolic, diastolic) {
  if (systolic == null || diastolic == null) return null;
  return round1((systolic + diastolic) / 2);
}

export function map(systolic, diastolic) {
  if (systolic == null || diastolic == null) return null;
  return round1(diastolic + (systolic - diastolic) / 3);
}

// hour: 0-23 (yerel saat, parametre olarak alinir -> TZ'den bagimsiz test edilebilir).
export function periodFor(hour) {
  const match = PERIOD_THRESHOLDS.find((p) => hour >= p.start && hour <= p.end);
  return match ? match.label : 'Yatsı'; // 21-04 arasi (gece yarisini sarar)
}

export function enrich(row) {
  return {
    ...row,
    right_mean: mean(row.right_systolic, row.right_diastolic),
    right_map: map(row.right_systolic, row.right_diastolic),
    left_mean: mean(row.left_systolic, row.left_diastolic),
    left_map: map(row.left_systolic, row.left_diastolic),
  };
}
