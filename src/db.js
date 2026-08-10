// SQL YALNIZ BURADA (SEC-6). Yalnız prepared statement/parametre baglama, dize birlestirme yok.
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS readings (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  ts              TEXT    NOT NULL,
  time_period     TEXT    NOT NULL CHECK (time_period IN ('Sabah','Öğle','İkindi','Akşam','Yatsı')),
  right_systolic  INTEGER CHECK (right_systolic  BETWEEN 40 AND 300),
  right_diastolic INTEGER CHECK (right_diastolic BETWEEN 20 AND 200),
  left_systolic   INTEGER CHECK (left_systolic   BETWEEN 40 AND 300),
  left_diastolic  INTEGER CHECK (left_diastolic  BETWEEN 20 AND 200),
  fever           REAL    CHECK (fever   BETWEEN 30 AND 45),
  pulse           INTEGER CHECK (pulse   BETWEEN 20 AND 250),
  oxygen          INTEGER CHECK (oxygen  BETWEEN 50 AND 100),
  created_at      TEXT    NOT NULL,
  updated_at      TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_readings_ts ON readings(ts);
`;

const COLUMNS = [
  'ts', 'time_period',
  'right_systolic', 'right_diastolic',
  'left_systolic', 'left_diastolic',
  'fever', 'pulse', 'oxygen',
];

export function createStore(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA synchronous = FULL;');
  db.exec(SCHEMA);

  const insertStmt = db.prepare(`
    INSERT INTO readings (${COLUMNS.join(', ')}, created_at, updated_at)
    VALUES (${COLUMNS.map(() => '?').join(', ')}, ?, ?)
  `);
  const updateStmt = db.prepare(`
    UPDATE readings SET ${COLUMNS.map((c) => `${c} = ?`).join(', ')}, updated_at = ?
    WHERE id = ?
  `);
  const getStmt = db.prepare('SELECT * FROM readings WHERE id = ?');
  const listStmt = db.prepare('SELECT * FROM readings ORDER BY ts DESC');
  const deleteStmt = db.prepare('DELETE FROM readings WHERE id = ?');

  function rowValues(row) {
    return COLUMNS.map((c) => (row[c] === undefined ? null : row[c]));
  }

  return {
    create(row) {
      const nowIso = new Date().toISOString();
      const info = insertStmt.run(...rowValues(row), nowIso, nowIso);
      return getStmt.get(Number(info.lastInsertRowid));
    },
    get(id) {
      return getStmt.get(id);
    },
    update(id, patch) {
      const existing = getStmt.get(id);
      if (!existing) return undefined;
      const merged = { ...existing, ...patch };
      const nowIso = new Date().toISOString();
      updateStmt.run(...rowValues(merged), nowIso, id);
      return getStmt.get(id);
    },
    remove(id) {
      const info = deleteStmt.run(id);
      return info.changes > 0;
    },
    list() {
      const items = listStmt.all();
      return { count: items.length, items };
    },
    close() {
      db.close();
    },
  };
}
