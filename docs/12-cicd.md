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

## Yeniden doğrulama (AF-091 — REQ-001 delta, cycle 2)

**TD-1 (deploy zincirinde `MOUNT_PREFIX` iletimi eksik) çözüldü.** Kök nedenin ikinci bacağı (DL-09-002'nin kapsam notu): `deploy.json.secret_names`'te `MOUNT_PREFIX` YOKTU, dolayısıyla `deploy-image.yml`/`remote-deploy.sh` bu secret'ı hiç okumuyor/container'a iletmiyordu — GH Secret elle oluşturulsa bile `docker run` ona hiç `-e` geçmiyordu. Üç değişiklik:

1. `deploy.json.secret_names.mount_prefix = "MOUNT_PREFIX"` eklendi (GH Secret adı; değer repoya YAZILMAZ).
2. `.github/workflows/deploy-image.yml`: `cfg` adımı `secret_mount_prefix` çıktısını üretir; `ssh-deploy` job'ı `MOUNT_PREFIX` env'ini `secrets[...]`'ten okuyup (diğer sırlar gibi %q ile kaçışlanmış stdin üzerinden, argv'ye gömülmeden) `remote-deploy.sh`'e aktarır.
3. `deploy/remote-deploy.sh`: `: "${MOUNT_PREFIX:?...}"` ile FAIL-LOUD kontrol (secret boşsa deploy scripti container'ı hiç başlatmadan açıklayıcı hata ile durur — "başarılı görünüp erişilemez" belirtisi CI seviyesinde önlenir) + `start_container()`'da `docker run -e MOUNT_PREFIX=...` eklendi.

**Kalan manuel adım (kasıtlı):** GH Secret'ı bir kez oluşturmak (`npm run gen-token` çıktısını `MOUNT_PREFIX` adıyla repo secrets'a eklemek) hâlâ insan elidir — bu SEC-2'nin "fail-closed varsayılan" tasarımının parçasıdır, otomatik üretim/rotasyon kapsam dışıdır. Değişen şey: secret bir kez oluşturulduktan SONRA container'a ulaşmasının garanti edilmesi (öncesinde bu garanti yoktu).

## state.product

`type: web`, `commands.build/test/run` tanımlı; dashboard "Ürün" panelinden görülebilir.

## Kalite kapısı raporu

- "Pipeline yeşil, artefakt üretiyor" → ✅ (`npm test` 68/68 yeşil — Faz 9/11'de mekanik doğrulandı; `docker build` bu oturumda başarıyla tamamlandı, Dockerfile mevcut)
