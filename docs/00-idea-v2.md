# 00 — Yeni İhtiyaç (v2) — REQ-001

## Talep (birebir)
"Uygulama deploy edilmiş görünüyor ama linkten erişilemiyor."

## Sınıflandırma
**patch** — davranış/FR değişmiyor; deploy OTOMASYONU eksik tamamlanıyor (kod/tasarım hatası değil, CI/CD zincirinde eksik bir bağlantı).

## Kök neden analizi (kanıt: `gh run view`, `deploy/remote-deploy.sh`, `Dockerfile`, `docs/07-security.md`)
- `deploy.json.enabled:true`, deploy workflow HER push'ta koşuyor ve GHCR'a imaj push ediyor (`gh run list` → `CI` yeşil).
- SSH-deploy adımı imajı sunucuya çekip başlatıyor ama container **her seferinde crash-loop** ediyor:
  ```
  Error: MOUNT_PREFIX eksik/kisa (>=22 karakter gerekli). Fail-closed: production baslamiyor.
  ```
  Bu, Faz 7'nin KASITLI güvenlik tasarımı (SEC-2, `docs/07-security.md:36`, `src/middleware/accessGate.js:assertProductionPrefix`) — kapasite-URL sırrı yoksa üretim ASLA açık başlamaz.
  → `health_ok` asla geçmiyor → `remote-deploy.sh` nginx bloğunu YAZMIYOR (satır 75: "ROLLBACK YOK ... nginx yazılmadı") → **hiçbir zaman `https://vitals-log.apps.sametemek.com` için bir nginx server bloğu var olmadı** → link zaten mevcut değil (deploy "başarılı görünüyor" değil, workflow adımı `failure` ile bitiyor — `gh run list` kanıtı).
- Zaten `docs/15-maintenance.md` TD-1 (P1) bu boşluğu ÖNCEDEN tespit etmişti: `MOUNT_PREFIX` deploy secret provizyonu eksik. Bu talep TD-1'in canlı belirtisidir.
- **Eksik #1 (deploy zinciri, Faz 12):** `deploy.json.secret_names` yalnız SSH secret'larını taşıyor; `.github/workflows/deploy-image.yml` ve `deploy/remote-deploy.sh` `MOUNT_PREFIX`'i HİÇ bilmiyor/geçirmiyor — kullanıcı token'ı üretip GitHub Secrets'a eklese bile şu ANKI deploy zinciri onu container'a **iletemez**.
- **Eksik #2 (ikinci, daha ciddi bir kök neden — Faz 9 kod hatası, ilk taramada kaçmıştı):** `package.json`'daki `gen-token` scripti (`crypto.randomBytes(24).toString('base64url')`) **`/v/` önekini üretmiyor** — oysa `accessGate.js` yorumundaki üretim komutu ve `docs/07-security.md:31` sözleşmesi `MOUNT_PREFIX=/v/<token>` formatını şart koşuyor. `src/config.js:loadConfig` `MOUNT_PREFIX` değerini OLDUĞU GİBİ (önek eklemeden) `mountPrefix`'e atıyor ve `accessGate.js:checkAccess` bunu `pathname.slice(0, prefix.length)` ile birebir karşılaştırıyor — gerçek bir HTTP yolu her zaman `/` ile başladığından, önekinde `/` OLMAYAN bir `MOUNT_PREFIX` **hiçbir gerçek isteğe asla eşleşemez**. `assertProductionPrefix` yalnız UZUNLUĞU (`>=22`) kontrol ediyor, önek biçimini DEĞİL — yani `gen-token` çıktısı (32 karakter) fail-closed kontrolünü GEÇER, sunucu "başarıyla" açılır, ama **`/health` dışındaki HER yol kalıcı olarak 404 döner.** Sonuç: Eksik #1 çözülüp secret doğru şekilde taşınsa bile, kullanıcı dokümantasyondaki `npm run gen-token` komutunu izlerse yine erişemez — bu, TALEBİN gerçek kök nedeni (Eksik #1 olmadan hiç deploy olmuyordu zaten; ama Eksik #1 tek başına düzeltilse "görünüyor ama erişilemiyor" belirtisi AYNEN sürerdi).

## Hedef faz
**Faz 9 (Development)** — en erken etkilenen faz (kod hatası: `package.json` gen-token + `accessGate.js` fail-closed önek doğrulaması). Faz 12 (CI/CD) deploy-zinciri düzeltmesi bu fazın DOWNSTREAM'i olduğu için AF-091 `invalidPhases` onu otomatik geçersiz sayar ve aynı delta içinde (numara sırasıyla) yeniden işlenir — orada Eksik #1 (secret taşıma) ayrıca düzeltilir.
Türetilenler (mevcut motor): 10 (LITE'ta atlanır), 11 (regresyon), 12 (deploy zinciri — Eksik #1), 13 (Release — patch sürüm + release notes), 14/15/16 downstream re-validation (AF-091 `invalidPhases`).

## Varsayım (kural 8, AUTOPILOT)
- GitHub Secret adı proje-repo-özel (`MOUNT_PREFIX`) — bu repo tek başına bir ürünü barındırdığı için (repo-per-project) sunucu-bazlı `_SUFFIX` desenine (DEPLOY_HOST gibi) gerek yok; secret bu repoya özeldir.
- **Bu delta secret'ın DEĞERİNİ üretmez/GitHub'a YAZMAZ** — orchestrator kod-otomasyonunu tamamlar; token üretimi (`npm run gen-token`) + GitHub Secret'a elle ekleme + gerçek `/pipeline-deploy` tetiklemesi KULLANICI onayı/eylemi gerektirir (credential provisioning + canlı deploy tetikleme, EXTERNAL_PUBLISH kapsamına yakın bir risk profili taşır — kural 8/9 istisnası değil, açıkça kullanıcıya bırakılır).
