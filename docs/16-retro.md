# 16 — Retrospektif: vitals-log

- Tarih: 2026-08-10 | Mod: AUTOPILOT | Profil: LITE

## Ne iyi gitti

- Faz 4/5/7'nin (architect + security-reviewer subagent devri) ürettiği ayrıntılı kararlar (kapasite-URL erişim modeli, veri modeli, dilim eşikleri) Faz 9'a doğrudan uygulanabilir çıktı verdi — Faz 9'da mimariye dair hiçbir yeniden-tasarım gerekmedi.
- TDD disiplini (her task için red→green ayrı commit) 3 gerçek bug'ı erken yakaladı: `validate.js`'in kendi ürettiği `ts`'in kendi regex'ine uymaması, `PUT` handler'ının DB satırını doğrudan validate'e sızdırması, `formatDateLabel`'in sistem TZ'sine bağımlı olması. Üçü de test yazılırken (implementasyondan hemen sonra) fark edildi, üretime sızmadı.
- Paralel dispatch (Faz 6/7/8 tek koşumda 3 subagent) gerçek zaman kazandırdı; her faz kendi kapanış dörtlüsünü sorunsuz tamamladı.

## Ne zorlaştı / fabrika eksikleri (AUTOFORGE-FEEDBACK.md'ye AF-129/AF-130 olarak işlendi)

- **AF-129:** Paralel devredilen subagent'ların Bash erişimi commit outbox'ı (AF-106) bypass edip kendi `git commit`'lerini attı — üç subagent aynı git working tree'yi paylaşınca commit mesajı↔içerik eşlemesi bir kaç yerde bozuldu (veri kaybı yok, yalnız git geçmişi kozmetik olarak yanlış). Fabrikaya öneri: paralel devir prompt'larına "git komutu çalıştırma" talimatı eklenmeli.
- **AF-130:** `state-update.mjs`'e `--merge`+`--append-history`+`--set-tasks` tek çağrıda verildiğinde yalnız ilki uygulanıyor, diğerleri sessizce yutuluyor — bu oturumda Faz 9'un ilk iş listesi bu yüzden hiç yazılmadı, fark edilip elle düzeltildi.

## Öneri 1 (somut süreç iyileştirmesi — öncelik)

`.claude/agents/*.md` içindeki Bash aracı olan rollere (developer, security-reviewer, devops-engineer, test-engineer) kalıcı bir "git add/commit/push ÇALIŞTIRMA — bu orchestrator'ın işidir (AF-106)" notu eklensin. Bu, paralel devir senaryolarında (AF-127) her seferinde prompt'a tekrar yazma ihtiyacını ortadan kaldırır ve AF-129'un kök nedenini kalıcı olarak kapatır.

## Öneri 2 (ikincil)

`scripts/state-update.mjs` birden fazla ana-işlem flag'i (merge/append-history/set-tasks/vb.) aynı çağrıda verilirse `fail()` ile açıkça reddetsin (AF-130) — sessiz yutma yerine gürültülü hata, "Sessiz park yasak" ilkesiyle (AF-090) tutarlı.

## Metrikler

- 17 faz (0b dahil) tek AUTOPILOT koşumda tamamlandı.
- 73 test, coverage %98.11, çalışma zamanı bağımlılığı sıfır (v0.1.1 — REQ-001 sonrası).
- Faz 10 bilinçli olarak atlandı (LITE, AF-112).

## Yeniden doğrulama + cycle 2 notu (AF-091/AF-096 — REQ-001)

Pipeline tamamlandıktan sonra gelen ilk `↺ Yeni İhtiyaç` (REQ-001: "deploy oldu görünüyor ama erişemiyorum") mekanizmayı uçtan uca doğruladı: `feedback_loops` → Faz 9 delta (DL-09-002) → AF-091 ile 11-16 otomatik geçersiz sayılıp numara sırasıyla yeniden doğrulandı (11: değişiklik yok/test güncellendi; 12: gerçek kod değişikliği — TD-1 kapatıldı, DL-12-002; 13: v0.1.1 PATCH; 14: değişiklik yok; 15: TD-1 çözüldü işaretlendi). Fabrika sürecinde yeni bir eksik YÜZEYE ÇIKMADI — bu, önceki koşumun AF-129/130 bulgularının aksine, delta-işleme hattının (AF-090/091/096) tasarlandığı gibi çalıştığının kanıtı. Ürün tarafında öğrenilen ders DL-15-002'ye kaydedildi (fail-closed varsayımının biçim+uzunluk kontrolünün TAMAMINI kapsaması gerektiği).

## Kalite kapısı raporu

- "≥1 somut süreç iyileştirmesi" → ✅ (Öneri 1, Öneri 2 — önceki koşumdan; bu cycle yeni bir fabrika eksikliği üretmedi, mevcut mekanizmayı doğruladı)
