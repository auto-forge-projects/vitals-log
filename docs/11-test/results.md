# 11 — Test Sonuçları: vitals-log

- Tarih: 2026-08-10 | Koşum: `npm test` (node:test, `--experimental-test-coverage`)

## Özet

- **68/68 test yeşil**, 0 başarısız, 0 atlanmış (`node --test` çıktısı: `pass 68`, `fail 0`).
- **Coverage: %98.05 satır, %92.81 dal, %98.67 fonksiyon** (hedef ≥%70 — aşıldı).
- 10 test dosyası: derive, validate, db, csv, routes-readings, access-gate, security-headers, config, server, integration.

## Dosya bazlı coverage (öne çıkanlar)

| Dosya | Satır % | Dal % | Not |
|-------|---------|-------|-----|
| derive.js, config.js, csv.js, accessGate.js, securityHeaders.js | 100 | 100 | Saf modüller, tam kapsanmış |
| db.js | 100 | 93.33 | Kapsanmayan dal: teorik SQLite hata yolu |
| routes/readings.js | 100 | 91.67 | Kapsanmayan dal: nadir edge-case |
| validate.js | 94.29 | 92.50 | Kapsanmayan satırlar: bazı erken-dönüş dalları (fonksiyonel olarak testlerle dolaylı doğrulanıyor) |
| server.js | 89.17 | 83.64 | Kapsanmayan satırlar: `import.meta.url` giriş noktası bloğu (test ortamında çalışmaz, kasıtlı) + SIGTERM handler |

## NFR-1 ölçümü (200 satır seed, GET /api/readings)

Ölçülen süre testte <100ms (hedef ≤1000ms) — geniş marj. Ortam: dev makine, `node --test`.

## Bilinen sınırlamalar

- `server.js`'in giriş noktası bloğu (`if (import.meta.url === ...)`) ve `SIGTERM` handler'ı process yaşam döngüsüne bağlı olduğundan birim testinde çalıştırılmaz — bu satırlar coverage raporunda düşük çıkar ama fonksiyonel risk taşımaz (yalnız gerçek `node src/server.js` çalıştırmasında devreye girer, Faz 12 Docker healthcheck bunu dolaylı doğrular).

## Kalite kapısı raporu

- "Kritik senaryolar %100" → ✅
- `npm test` exit 0 → ✅ (mekanik, verify-gate Faz 9'da zaten doğrulandı; bu koşum aynı sonucu teyit eder)
