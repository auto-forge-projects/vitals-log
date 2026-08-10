import { enrich } from './derive.js';

const HEADER = [
  'ts', 'time_period',
  'right_systolic', 'right_diastolic', 'right_mean', 'right_map',
  'left_systolic', 'left_diastolic', 'left_mean', 'left_map',
  'fever', 'pulse', 'oxygen',
];

function cell(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Enum/sayisal alanlar oldugundan formul enjeksiyonu olusamaz (SEC: OWASP A03 notu);
  // yine de virgul/tirnak/newline icin standart CSV kacisi uygulanir.
  if (/[",\r\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function toCsv(rows) {
  const lines = [HEADER.join(',')];
  for (const row of rows) {
    const enriched = enrich(row);
    lines.push(HEADER.map((key) => cell(enriched[key])).join(','));
  }
  return '﻿' + lines.join('\r\n');
}
