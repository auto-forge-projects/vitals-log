# 13 — Release Notes: vitals-log v0.1.0

- Tarih: 2026-08-10 | Mod: AUTOPILOT | Profil: LITE

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
- 68 test, coverage %98.05.
- Docker imajı: `node:22-alpine`, non-root, `/app/data` volume.

## Dağıtım

- `state.product`: `type=web`, `docker_image` build komutu `docker build -t vitals-log .`.
- `deploy.json`: `enabled:true`, `host_port:5009`, `healthcheck:/health`.
- **Deploy öncesi zorunlu adım:** `MOUNT_PREFIX` env değişkeni üretilip (`npm run gen-token`) sunucu/secret'a eklenmeli — yoksa `NODE_ENV=production`'da sunucu fail-closed başlamaz (SEC-2, DL-07-001).

## Rollback planı

Container durumsuzdur (state SQLite dosyasında, kod imajda). Rollback = önceki SHA-etiketli imajla `docker run` (GHCR'daki bir önceki tag). Adımlar:
1. `docker pull ghcr.io/auto-forge-projects/vitals-log:<önceki-sha>`
2. Mevcut container'ı durdur, aynı `/app/data` volume'unu bağlayarak önceki imajla yeniden başlat (veri korunur — DB şeması bu sürümde değişmedi).
3. `/health` ile doğrula.
Veri kaybı riski yok (rollback yalnız kod imajını değiştirir, DB dosyasına dokunmaz).

## Bilinen sınırlamalar (v0.2'ye aday)

- Trend grafiği yok (v1 kapsam dışı, brief'te kabul edildi).
- `MOUNT_PREFIX` deploy secret'ı henüz otomatik provizyon edilmiyor (elle eklenmeli — Faz 15 teknik borcu).

## Kalite kapısı raporu

- "Rollback tanımlı" → ✅ (yukarıda, SHA-etiketli imaj + durumsuz container)
