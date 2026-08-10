# 15 — Bakım: vitals-log

- Tarih: 2026-08-10 | Mod: AUTOPILOT | Profil: LITE

## Teknik borç listesi (önceliklendirilmiş)

| ID | Öncelik | Konu | Not |
|----|---------|------|-----|
| TD-1 | ~~P1~~ **ÇÖZÜLDÜ** | `MOUNT_PREFIX` deploy secret provizyonu eksik | **REQ-001 (cycle 2, DL-12-002) ile çözüldü:** `deploy.json.secret_names.mount_prefix` eklendi, workflow+`remote-deploy.sh` artık secret'ı otomatik + fail-loud olarak container'a iletiyor. Kalan (kasıtlı) manuel adım: secret'ın kendisinin `npm run gen-token` ile bir kez üretilip GitHub Secrets'a eklenmesi — bu SEC-2'nin güvenli varsayılanıdır, otomatik rotasyon kapsam dışı. |
| TD-2 | P2 | Disk üzerinde şifresiz veri (RISK-2, DL-07-002) | SQLite dosyası VPS volume'unda düz metin; host-disk şifreleme veya şifreli yedek eklenebilir. RISK-1'in (girişsiz erişim, kullanıcı kabul etti) türevi — bağımsız bir yeni risk açmıyor. |
| TD-3 | P2 | Rate limiter süreç-içi bellekte | Container yeniden başlarsa sayaç sıfırlanır; tek kullanıcılı LITE'ta pratik etkisi yok, çok-instance/ölçeklenme senaryosunda paylaşılan bir depoya (Redis vb.) taşınmalı. |
| TD-4 | P3 | DOM/E2E testi yok | `public/app.js`'in DOM-bağımlı kısmı (fetch/event wiring) otomatik test kapsamı dışında; saf mantık (`ui-helpers.js`) test edildi. Headless tarayıcı bağımlılığı eklemeden mümkün değil (zero-dep hedefiyle çelişir). |
| TD-5 | P3 | `npm audit` N/A | Çalışma zamanı/geliştirme bağımlılığı sıfır olduğu için `npm audit` anlamlı bir çıktı üretmiyor; CI adımı yine de gelecekte bağımlılık eklenirse hazır bulunsun diye eklenebilir. |
| TD-6 | P3 | Yedekleme otomasyonu yok | `/app/data/vitals.db` için otomatik cron yedek/`docker cp` scripti tanımlı değil (mimaride "Faz 14'ün konusudur" denmişti, LITE kapsamında elle bırakıldı). |

## Öncelik dağılımı

- P1: 0 (TD-1 çözüldü — REQ-001/cycle 2)
- P2: 2 (TD-2, TD-3)
- P3: 3 (TD-4, TD-5, TD-6)
- Çözüldü: 1 (TD-1)

## Yeniden doğrulama (AF-091 — REQ-001 delta, cycle 2)

TD-1 yukarıda "ÇÖZÜLDÜ" olarak işaretlendi (bkz. DL-12-002). TD-2 — TD-6 bu delta'dan etkilenmedi (kapsam yalnız MOUNT_PREFIX üretim/iletim zinciriydi); listede değişiklik gerekmedi.

## Kalite kapısı raporu

- "Teknik borç önceliklendirilmiş" → ✅ (6 kalem, P1/P2/P3 dağılımıyla yukarıda; TD-1 bu cycle'da çözüldü)
