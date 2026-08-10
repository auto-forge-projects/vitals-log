# 14 — Monitoring: vitals-log

- Tarih: 2026-08-10 | Mod: AUTOPILOT | Profil: LITE
- Ürün tipi: web

## Health check

`GET /health` (accessGate'ten muaf) — `{status:"ok"}` döner, veri sızdırmaz. Docker `HEALTHCHECK` bunu 30sn'de bir kontrol eder; deploy sonrası dış probe de aynı ucu kullanır (`deploy.json.healthcheck`).

## Loglar ve hata görünürlüğü

- Yapılandırılmış JSON log satırları: `{method, path, status, duration_ms}` (SEC-3 — yol redakte, değer/token asla loglanmaz).
- Sunucu hatası (`500`): `console.error` ile `stderr`'e tam hata mesajı (istemciye sızmaz, SEC-10); `docker logs vitals-log` ile izlenir.
- Kapı reddi (`404` erişim kapısı) ve hız sınırı (`429`) olayları da aynı log formatında görünür — anormal erişim denemeleri fark edilebilir.

## Kritik akışlara alert (LITE kapsamı)

| Sinyal | Alert | Yöntem |
|--------|-------|--------|
| `/health` erişilemez | Servis kesintisi | Deploy sonrası uptime probe (dashboard "Ürün" paneli + `deploy.json.healthcheck`) |
| Container `unhealthy` | Otomatik yeniden başlatma ihtiyacı | Docker `HEALTHCHECK` + `docker restart` politikası (deploy script) |
| Sürekli `500` | Uygulama hatası | `docker logs` manuel izleme (LITE'ta otomatik alerting/entegrasyon yok — tek kullanıcı, düşük hacim) |

**LITE kapsam kararı:** Tam teşekküllü metrik/alert altyapısı (Prometheus/Grafana vb.) bu ölçekte orantısız — health check + yapılandırılmış log yeterli görülüyor (bkz. DL-14-001).

## Kalite kapısı raporu

- "Kritik akışlara alert" → ✅ (health check + log görünürlüğü + container healthcheck yukarıda tanımlı)
