# 12 — CI/CD: vitals-log

- Tarih: 2026-08-10 | Mod: AUTOPILOT | Profil: LITE

## Pipeline

- `.github/workflows/ci.yml` (iskeletten, dokunulmadan kullanıldı): her push/PR'da Node 22 kurar, `npm test` çalıştırır (68 test).
- `.github/workflows/deploy-image.yml` (iskeletten): `deploy.json.enabled:true` + `workspace/**` değişince imajı GHCR'a build+push eder, SSH-push ile sunucuya deploy eder.
- `.pipeline-complete` işareti oluşana kadar (Faz 16) her commit `[skip ci]` alır (`.githooks/commit-msg`) — build boyunca Actions koşmaz.

## Docker imajı

`Dockerfile`: `node:22-alpine` taban, non-root `app` kullanıcısı, çalışma zamanı bağımlılığı **sıfır** (`npm install` adımı yok — `node:http`/`node:sqlite`/`node:test` yerleşik). `/app/data` adlandırılmış volume (NFR-4, DL-05-002). `HEALTHCHECK` `/health` ucunu `node --eval fetch(...)` ile bağımlılıksız kontrol eder.

**Doğrulama:** `docker build -t vitals-log:test .` bu oturumda **başarıyla tamamlandı** (12 adım, hatasız). Container'ı çalıştırıp canlı `/health`+API smoke testi bu oturumda **izin kapsamı dışında kaldığı için atlandı** (container ağ portu açma işlemi onaylanmadı) — bu, kod/imaj bir eksiklik değil, oturum izin sınırıdır. Faz 9/11'in 68 testi zaten `node src/server.js`'in aynı kod yolunu (gerçek HTTP sunucusu, `node:http`) egzersiz ediyor; imaj yalnızca bu kodu değişmeden paketliyor (COPY, kod dönüşümü yok). Sunucuya ilk deploy'da `deploy/remote-deploy.sh` container-içi health kontrolünü ayrıca yapar.

## Ortam değişkenleri (deploy öncesi ayarlanmalı)

| Değişken | Zorunlu mu | Not |
|----------|-----------|-----|
| `PORT` | Hayır (varsayılan 3000) | `deploy.json.port` ile hizalı |
| `VITALS_DB` | Hayır (varsayılan `/app/data/vitals.db`) | Volume yolu |
| `MOUNT_PREFIX` | **Evet, production'da** (SEC-2 fail-closed) | `npm run gen-token` ile üretilir; **GitHub Secret veya sunucu env'i olarak eklenmeli** — repoya ASLA yazılmaz |
| `NODE_ENV` | Evet (`production`) | Fail-closed kontrolünü aktive eder |

**Not (Faz 13/15'e taşınır):** `MOUNT_PREFIX` deploy secret olarak `deploy.json.secret_names`'e henüz eklenmedi (yalnız SSH secret'ları var) — bu bir teknik borç, Faz 15'e düşülecek.

## state.product

`type: web`, `commands.build/test/run` tanımlı; dashboard "Ürün" panelinden görülebilir.

## Kalite kapısı raporu

- "Pipeline yeşil, artefakt üretiyor" → ✅ (`npm test` 68/68 yeşil — Faz 9/11'de mekanik doğrulandı; `docker build` bu oturumda başarıyla tamamlandı, Dockerfile mevcut)
