# 13 — Release Notes: vitals-log v0.1.1

- Tarih: 2026-08-10 | Mod: AUTOPILOT | Profil: LITE

## v0.1.1 — REQ-001 düzeltmesi (deploy erişilemezliği)

**Belirti:** "Uygulama deploy oldu görünüyor fakat erişemiyorum." **Kök neden (iki katmanlı, DL-09-002/DL-12-002):**
1. `gen-token` `/v/` önekini üretmiyordu ve `assertProductionPrefix` yalnız uzunluğu doğruluyordu — önneksiz bir token uzunluk kontrolünü geçip sunucuyu "başarıyla" açıyor ama `checkAccess` hiçbir gerçek yola eşleşmediğinden `/health` dışındaki HER yol sessizce 404 dönüyordu.
2. Deploy zinciri (`deploy.json`/workflow/`remote-deploy.sh`) `MOUNT_PREFIX` secret'ını container'a hiç iletmiyordu (TD-1) — secret elle oluşturulsa bile ulaşmıyordu.

**Düzeltme:** `gen-token` artık `/v/` önekini üretiyor; `assertProductionPrefix` önek biçimini de doğruluyor (fail-closed güçlendirildi); deploy zinciri `MOUNT_PREFIX`'i otomatik + fail-loud olarak container'a iletiyor. Testler 68→73 (5 yeni regresyon testi), coverage %98.05→%98.11.

## v0.1.0 — İlk sürüm

Mobil öncelikli, girişsiz, sunucu tarafı DB'de tutulan vital bulgu takip aracı.

### Özellikler
- Kayıt ekleme/düzenleme/silme; saat opsiyonel (boşsa anlık saat), zaman dilimi önerisi (Sabah/Öğle/İkindi/Akşam/Yatsı).
- Sağ/sol kol tansiyon + otomatik aritmetik ortalama + MAP hesaplama.
- Ateş, nabız, oksijen alanları.
- CSV dışa aktarma.
- Kapasite-URL erişim modeli (girişsiz, tahmin edilemez token).

### Teknik
- `node:http` + `node:sqlite` — çalışma zamanı bağımlılığı sıfır.
- 73 test, coverage %98.11 (v0.1.1 — bkz. yukarıdaki düzeltme).
- Docker imajı: `node:22-alpine`, non-root, `/app/data` volume.

## Dağıtım

- `state.product`: `type=web`, `docker_image` build komutu `docker build -t vitals-log .`.
- `deploy.json`: `enabled:true`, `host_port:5009`, `healthcheck:/health`, `secret_names.mount_prefix:"MOUNT_PREFIX"` (v0.1.1'den beri wiring otomatik — DL-12-002).
- **Deploy öncesi zorunlu tek-seferlik adım:** `MOUNT_PREFIX` env değişkeni üretilip (`npm run gen-token`) GitHub Secrets'a **`MOUNT_PREFIX`** adıyla eklenmeli — yoksa `remote-deploy.sh` container'ı hiç başlatmadan fail-loud durur (v0.1.1'den önce bu kontrol yoktu, sunucu sessizce erişilemez kalıyordu).

## Rollback planı

Container durumsuzdur (state SQLite dosyasında, kod imajda). Rollback = önceki SHA-etiketli imajla `docker run` (GHCR'daki bir önceki tag). Adımlar:
1. `docker pull ghcr.io/auto-forge-projects/vitals-log:<önceki-sha>`
2. Mevcut container'ı durdur, aynı `/app/data` volume'unu bağlayarak önceki imajla yeniden başlat (veri korunur — DB şeması bu sürümde değişmedi).
3. `/health` ile doğrula.
Veri kaybı riski yok (rollback yalnız kod imajını değiştirir, DB dosyasına dokunmaz).

## Bilinen sınırlamalar (v0.2'ye aday)

- Trend grafiği yok (v1 kapsam dışı, brief'te kabul edildi).
- `MOUNT_PREFIX` secret'ının kendisi hâlâ elle (bir kez) oluşturulmalı — kasıtlı, otomatik üretim/rotasyon kapsam dışı (bkz. DL-12-002). v0.1.1'den beri değişen: secret oluşturulduktan SONRA container'a ulaşması garanti (öncesinde bu garanti yoktu).

## Kalite kapısı raporu

- "Rollback tanımlı" → ✅ (yukarıda, SHA-etiketli imaj + durumsuz container)
