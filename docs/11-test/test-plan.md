# 11 — Test Planı: vitals-log

- Tarih: 2026-08-10 | Mod: AUTOPILOT | Profil: LITE
- Girdi: `docs/03-requirements.md`, `src/`, `tests/` (Faz 9'da TDD ile üretildi)

## Kapsam

Faz 9'un TDD birim/entegrasyon testleri (68 test, 10 test dosyası) Faz 11 kapsamına alınır — sıfırdan yeniden yazılmaz (AF ilkesi: aynı kanıtı iki kez üretme). Bu doküman FR/NFR/SEC izlenebilirliğini ve kritik senaryo kapsamını raporlar.

## FR izlenebilirliği

| FR | Senaryo | Test dosyası |
|----|---------|---------------|
| FR-1 (kayıt ekleme) | POST geçerli/geçersiz gövde, otomatik `ts`, ortalama+MAP hesaplama | routes-readings.test.js, integration.test.js, derive.test.js |
| FR-2 (listeleme) | GET kronolojik sıra (`ORDER BY ts DESC`), count | db.test.js, routes-readings.test.js |
| FR-3 (düzenleme) | PUT günceller + ortalamalar yeniden türetilir, olmayan id 404 | routes-readings.test.js, integration.test.js |
| FR-4 (silme) | DELETE kalıcı siler, tekrar silme 404 | db.test.js, routes-readings.test.js |
| FR-5 (CSV export) | BOM+CRLF+kolon sırası+türetilmiş alanlar | csv.test.js, routes-readings.test.js |
| FR-6 (çok cihaz/sunucu DB) | Sunucu yeniden başlatma sonrası veri kalıcılığı | db.test.js, integration.test.js (NFR-4) |

## NFR izlenebilirliği

| NFR | Kabul ölçütü | Sonuç |
|-----|--------------|-------|
| NFR-1 | 200 satır seed, liste ≤1sn | ✅ `integration.test.js` — ölçülen süre <100ms (bkz. results.md) |
| NFR-2 | 360px mobil, yatay kaydırma yok | ✅ Manuel inceleme (`public/styles.css` tek kolon, `@media (max-width:360px)`); otomatik viewport testi zero-dep kapsam dışı (not: aşağıda) |
| NFR-3 | Girişsiz erişim riski hafifletmesi | ✅ `access-gate.test.js` + `integration.test.js` (capability-URL, fail-closed, 404-on-miss) |
| NFR-4 | Kalıcılık (restart sonrası veri) | ✅ `integration.test.js`, `db.test.js` |

## SEC izlenebilirliği (Faz 7 → Faz 9)

| SEC | Test |
|-----|------|
| SEC-1 (accessGate) | access-gate.test.js (7 senaryo) |
| SEC-2 (fail-closed) | integration.test.js |
| SEC-4 (rate limit) | integration.test.js |
| SEC-5 (validate) | validate.test.js (12 senaryo, `__proto__`/`constructor` dahil) |
| SEC-6 (yalnız prepared statement) | db.test.js (kod incelemesi: `db.js`'te dize birleştirme yok) |
| SEC-7 (güvenlik başlıkları) | security-headers.test.js, server.test.js |
| SEC-8 (Content-Type zorunlu) | server.test.js |
| SEC-9 (statik path traversal) | server.test.js |
| SEC-10 (hata zarfı, yığın izi sızmaz) | routes-readings.test.js |
| SEC-12 (istemci textContent) | Manuel kod incelemesi (`app.js` — `innerHTML` kullanılmıyor) |

## Kritik senaryolar (%100 hedefi)

Kritik = veri kaybı/güvenlik/temel akış riski taşıyan senaryolar: kayıt ekleme, silme, erişim kapısı reddi, fail-closed başlatma, kalıcılık. Hepsi yukarıdaki tabloda ✅ işaretli — **%100**.

## Kapsam dışı (bilinçli, LITE)

- Tarayıcı UI'ının otomatik (DOM/E2E) testi — zero-dependency hedefi (headless tarayıcı bağımlılığı gerektirir); `public/ui-helpers.js` saf mantık ayrıştırılıp test edildi, DOM wiring (`app.js`) manuel/görsel doğrulamaya bırakıldı.
- Yük/performans testi (NFR-1 dışında) — LITE kapsamı tek kullanıcı.

## Kalite kapısı raporu

- "Kritik senaryolar %100" → ✅ (yukarıdaki tablo)
