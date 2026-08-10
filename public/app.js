import { mean, map, periodFor } from './js/derive.js';
import { payloadFromForm, formatDateLabel, errorMessage } from './ui-helpers.js';

const form = document.getElementById('reading-form');
const banner = document.getElementById('banner');
const listEl = document.getElementById('list');
const exportBtn = document.getElementById('export-btn');
const cancelBtn = document.getElementById('f-cancel');
const submitBtn = document.getElementById('f-submit');
const formTitle = document.getElementById('form-title');

const fields = {
  time: document.getElementById('f-time'),
  period: document.getElementById('f-period'),
  rs: document.getElementById('f-rs'),
  rd: document.getElementById('f-rd'),
  ls: document.getElementById('f-ls'),
  ld: document.getElementById('f-ld'),
  fever: document.getElementById('f-fever'),
  pulse: document.getElementById('f-pulse'),
  oxygen: document.getElementById('f-oxygen'),
};

let editingId = null;
let readings = [];

function showBanner(message) {
  banner.textContent = '';
  const span = document.createElement('span');
  span.textContent = message;
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = '✕';
  close.addEventListener('click', () => { banner.hidden = true; });
  banner.append(span, close);
  banner.hidden = false;
}
function clearBanner() { banner.hidden = true; }

function updateDerivedLive() {
  const rMean = mean(Number(fields.rs.value) || null, Number(fields.rd.value) || null);
  const rMap = map(Number(fields.rs.value) || null, Number(fields.rd.value) || null);
  document.getElementById('right-derived').textContent =
    `Ort: ${rMean ?? '—'} MAP: ${rMap ?? '—'}`;
  const lMean = mean(Number(fields.ls.value) || null, Number(fields.ld.value) || null);
  const lMap = map(Number(fields.ls.value) || null, Number(fields.ld.value) || null);
  document.getElementById('left-derived').textContent =
    `Ort: ${lMean ?? '—'} MAP: ${lMap ?? '—'}`;
}

function suggestPeriod() {
  const now = new Date();
  const hour = fields.time.value ? Number(fields.time.value.split(':')[0]) : now.getHours();
  fields.period.value = periodFor(hour);
}

function resetForm() {
  form.reset();
  editingId = null;
  formTitle.textContent = 'Yeni Kayıt';
  submitBtn.textContent = 'Kaydet';
  cancelBtn.hidden = true;
  suggestPeriod();
  updateDerivedLive();
  [fields.rs, fields.rd, fields.ls, fields.ld].forEach((el) => el.classList.remove('invalid'));
}

function fillFormFor(record) {
  editingId = record.id;
  formTitle.textContent = 'Kaydı Düzenle';
  submitBtn.textContent = 'Güncelle';
  cancelBtn.hidden = false;
  fields.time.value = record.ts.slice(11, 16);
  fields.period.value = record.time_period;
  fields.rs.value = record.right_systolic ?? '';
  fields.rd.value = record.right_diastolic ?? '';
  fields.ls.value = record.left_systolic ?? '';
  fields.ld.value = record.left_diastolic ?? '';
  fields.fever.value = record.fever ?? '';
  fields.pulse.value = record.pulse ?? '';
  fields.oxygen.value = record.oxygen ?? '';
  updateDerivedLive();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderList() {
  listEl.replaceChildren();
  exportBtn.disabled = readings.length === 0;
  for (const r of readings) {
    const card = document.createElement('div');
    card.className = 'reading-card';

    const h3 = document.createElement('h3');
    h3.textContent = `${formatDateLabel(r.ts)} ${r.time_period}`;
    card.appendChild(h3);

    const pRight = document.createElement('p');
    pRight.textContent = `Sağ ${r.right_systolic ?? '-'}/${r.right_diastolic ?? '-'} (Ort ${r.right_mean ?? '-'} MAP ${r.right_map ?? '-'})`;
    card.appendChild(pRight);

    const pLeft = document.createElement('p');
    pLeft.textContent = `Sol ${r.left_systolic ?? '-'}/${r.left_diastolic ?? '-'} (Ort ${r.left_mean ?? '-'} MAP ${r.left_map ?? '-'})`;
    card.appendChild(pLeft);

    const pVitals = document.createElement('p');
    pVitals.textContent = `Ateş ${r.fever ?? '-'} Nabız ${r.pulse ?? '-'} O2 ${r.oxygen ?? '-'}`;
    card.appendChild(pVitals);

    const actions = document.createElement('div');
    actions.className = 'actions';
    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.textContent = 'Düzenle';
    editBtn.addEventListener('click', () => fillFormFor(r));
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.textContent = 'Sil';
    delBtn.addEventListener('click', () => onDelete(r.id));
    actions.append(editBtn, delBtn);
    card.appendChild(actions);

    listEl.appendChild(card);
  }
}

async function loadList() {
  const res = await fetch('./api/readings');
  const body = await res.json();
  readings = body.items;
  renderList();
}

async function onSubmit(event) {
  event.preventDefault();
  const raw = {
    ts: fields.time.value ? buildTsFromTime(fields.time.value) : '',
    time_period: fields.period.value,
    right_systolic: fields.rs.value, right_diastolic: fields.rd.value,
    left_systolic: fields.ls.value, left_diastolic: fields.ld.value,
    fever: fields.fever.value, pulse: fields.pulse.value, oxygen: fields.oxygen.value,
  };
  const payload = payloadFromForm(raw);
  const isEdit = editingId !== null;
  const url = isEdit ? `./api/readings/${editingId}` : './api/readings';
  const method = isEdit ? 'PUT' : 'POST';
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    if (!res.ok) {
      showBanner(errorMessage(body.error));
      if (body.error && body.error.field) {
        const el = fieldElementFor(body.error.field);
        if (el) el.classList.add('invalid');
      }
      if (res.status === 404) await loadList();
      return;
    }
    clearBanner();
    if (isEdit) {
      readings = readings.map((r) => (r.id === body.id ? body : r));
    } else {
      readings = [body, ...readings];
    }
    renderList();
    resetForm();
  } catch {
    showBanner(errorMessage(null));
  }
}

function fieldElementFor(field) {
  const map = { right_systolic: fields.rs, right_diastolic: fields.rd, left_systolic: fields.ls, left_diastolic: fields.ld, fever: fields.fever, pulse: fields.pulse, oxygen: fields.oxygen };
  return map[field];
}

function buildTsFromTime(hhmm) {
  const now = new Date();
  const [h, m] = hhmm.split(':');
  now.setHours(Number(h), Number(m), 0, 0);
  const offsetMin = -now.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const pad = (n) => String(Math.abs(n)).padStart(2, '0');
  const offset = `${sign}${pad(Math.floor(Math.abs(offsetMin) / 60))}:${pad(Math.abs(offsetMin) % 60)}`;
  const y = now.getFullYear();
  const mo = pad(now.getMonth() + 1);
  const d = pad(now.getDate());
  return `${y}-${mo}-${d}T${pad(now.getHours())}:${pad(now.getMinutes())}:00${offset}`;
}

async function onDelete(id) {
  if (!window.confirm('Bu kaydı silmek istediğinize emin misiniz?')) return;
  try {
    const res = await fetch(`./api/readings/${id}`, { method: 'DELETE' });
    if (res.status === 204) {
      readings = readings.filter((r) => r.id !== id);
      renderList();
      return;
    }
    const body = await res.json().catch(() => null);
    showBanner(errorMessage(body && body.error));
    await loadList();
  } catch {
    showBanner(errorMessage(null));
  }
}

form.addEventListener('submit', onSubmit);
cancelBtn.addEventListener('click', resetForm);
exportBtn.addEventListener('click', () => { window.location.href = './api/readings/export.csv'; });
[fields.rs, fields.rd, fields.ls, fields.ld].forEach((el) => el.addEventListener('input', () => {
  updateDerivedLive();
  el.classList.remove('invalid');
}));
fields.time.addEventListener('input', suggestPeriod);

resetForm();
loadList().catch(() => showBanner(errorMessage(null)));
