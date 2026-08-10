# 07 — Güvenlik Tasarımı: vitals-log

- Tarih: 2026-08-10 | Mod: AUTOPILOT | Profil: LITE
- Girdi: `docs/03-requirements.md` (NFR-3), `docs/05-architecture.md` (`accessGate` kancası)
- Bağlam: girişsiz (auth yok), tek kullanıcılı, sunucu tarafı DB'de **sağlık verisi**. Girişsizlik riski kullanıcı tarafından brief'te (Q1+Q4) bilinçli kabul edildi; bu faz o riski **ortadan kaldırmaz, ölçülebilir biçimde daraltır**.

## Varlıklar ve veri sınıflandırma

| Veri | Sınıf | Nerede duruyor | Koruma |
|------|-------|----------------|--------|
| Vital ölçümler (tansiyon, ateş, nabız, oksijen, zaman) | **PII — özel nitelikli sağlık verisi** (KVKK m.6 / GDPR Art.9) | `/app/data/vitals.db` (Docker volume, VPS); istemcide geçici bellek | TLS+HSTS, kapasite-URL kapısı, `Cache-Control: no-store`, loglanmaz |
| Erişim tokeni (`MOUNT_PREFIX` yol segmenti) | **Secret / credential** (tek kimlik unsuru) | Sunucu env (deploy secret); kullanıcının yer imi + tarayıcı geçmişi | CSPRNG ≥128 bit, timing-safe karşılaştırma, log redaksiyonu, `no-referrer`, `noindex`, rotasyon |
| CSV dışa aktarım (FR-5) | PII (aynı sınıf) | Kullanıcının cihazındaki indirilenler klasörü | `attachment` + `no-store`; cihaz güvenliği kullanıcı sorumluluğunda |
| Uygulama logları | Internal | Container stdout (`docker logs`) | Ölçüm **değeri yok**, yol token'ı redakte, yalnız method/durum/süre |
| `/health` yanıtı | Public | HTTP (kapı muafı) | Yalnız `{status:"ok"}` — sayaç/sürüm/veri **yok** |
| Kaynak kod + şema | Public | GitHub reposu | Sır yok; `env_ref` yalnız işaretçi |

## Threat model (STRIDE)

| Bileşen | Spoofing | Tampering | Repudiation | Info Disclosure | DoS | Elevation | Önlemler |
|---------|----------|-----------|-------------|-----------------|-----|-----------|----------|
| Edge (nginx + TLS) | Sahte origin / downgrade | MITM enjeksiyonu | Erişim logu | Şifresiz trafik | Bağlantı seli | 80/443 dışı yüzey | TLS 1.2+, HSTS, yalnız 443 dışa açık, app `127.0.0.1:5009`'a bağlı |
| `accessGate` (kapasite URL) | Token'ı bilen = sahip sayılır (tasarım gereği) | Kodlanmış `..`/çift-encode ile prefix atlatma | Reddedilen istek sayacı | Token log/Referer/geçmişte sızabilir | Token tahmini (2^128 — infeasible) + istek seli | Router'dan **önce** çalışır, `/health` dışında muafiyet yok | Yol normalize edilip karşılaştırılır, `timingSafeEqual`, log redaksiyonu, `Referrer-Policy: no-referrer`, IP başına hız sınırı |
| `routes/readings` + `validate.js` | — (kimlik yok) | Aralık dışı/tip karmaşası, `__proto__` anahtarı | `created_at`/`updated_at` damgası | Hata zarfı sızıntısı | Dev gövde / `limit=999999` | Method+yol allowlist (5 uç) | Alan allowlist + aralık doğrulama (400), gövde ≤64 KB, `limit` tavanı 1000, `{error:{code,message,field}}` — yığın izi yok |
| `db.js` + SQLite dosyası | — | SQL injection | WAL journal | Disk üzerinde **şifresiz** (kalıntı risk) | Disk dolması | SQL yalnız bu modülde | Yalnız prepared statement, tablo CHECK'leri ikinci hat, volume yalnız container kullanıcısına açık |
| Statik istemci (tarayıcı) | — | XSS ile DOM/veri manipülasyonu | — | Token tarayıcı geçmişi/ekran görüntüsünde | — | Clickjacking ile tıklama çalma | CSP `script-src 'self'`, inline script yok, `textContent` (asla `innerHTML`), `frame-ancestors 'none'`, `base-uri 'none'` |
| CSV export + loglar | — | Formül enjeksiyonu (alanlar sayısal/enum → geçersiz) | Log = tek denetim izi | Değer/token loglanmaz | Log seli disk doldurur | Container non-root | `Content-Disposition: attachment`, enum whitelist, redakte log, hız sınırı |

## Auth / Authz stratejisi

**Model: kapasite URL (capability URL) — "bilmek = yetki".** Kimlik (kullanıcı adı/parola/oturum) **yoktur**; kullanıcının açık isteğidir. Yetkilendirme tek bir sırrın ispatına indirgenir: uygulamanın tamamı `MOUNT_PREFIX=/v/<32 karakter base64url token>` altına bağlanır ve `accessGate` router'dan önce şunu uygular:

- Yol prefix ile başlamıyorsa → **404** (403 değil: 403 "doğru adres ama yanlış anahtar" bilgisi sızdıran bir oracle olur; 404 ile mevcut olmayan yol ayırt edilemez).
- Karşılaştırma **normalize edilmiş yol** üzerinde ve `crypto.timingSafeEqual` ile yapılır.
- `/health` tek muaftır ve **hiçbir veri döndürmez** (`{status:"ok"}`).
- **Fail-closed:** `NODE_ENV=production` iken `MOUNT_PREFIX` boş/kısa (<22 karakter) ise sunucu **başlamaz** ve nedenini yazar. Kancanın "şimdilik geçirgen" hâliyle canlıya çıkmak böylece kod düzeyinde imkânsızdır.
- **Rotasyon = iptal:** URL sızarsa kullanıcı env'deki token'ı değiştirip yeniden başlatır; eski adres anında 404 olur. Parola sıfırlamanın karşılığıdır.

Oturum yönetimi yoktur (çerez/token/JWT yok) → oturum çalma, sabitleme, CSRF-token yönetimi ve parola saklama sınıfı riskler **kapsam dışına** çıkar; bedeli, tek sırrın tüm yetkiyi taşımasıdır.

**Neden ikinci bir paylaşılan anahtar (header/query) eklenmedi:** tarayıcı düz gezinmede özel header gönderemez; anahtarın istemciye ulaşması için ya kullanıcı elle girecek (= giriş ekranı, Q1'de reddedildi) ya da aynı gizli URL altında servis edilen HTML'e gömülecektir — ikinci durumda anahtar URL'i bilen herkese zaten açıktır, yani **sıfır ek güvence, artı karmaşıklık**. Query param (`?k=`) ise sırrı log/Referer/analitik yüzeyine taşır: yol segmentinden **daha kötüdür**. Ayrıntı ve alternatifler: `decisions/DL-07-001.md`.

## OWASP Top 10 değerlendirmesi (kalite kapısı: HER madde)

| # | Risk | Uygulanabilir mi | Önlem / Neden uygulanamaz |
|---|------|------------------|----------------------------|
| A01 | Broken Access Control | **Evet — birincil risk** | Kapasite-URL kapısı router'dan önce (SEC-1), fail-closed başlatma (SEC-2), tek kiracı olduğu için IDOR yok (tüm `id`'ler aynı sahibin), statik sunucuda path traversal koruması: normalize + `public/` dışına çıkan yol 404 (SEC-9) |
| A02 | Cryptographic Failures | **Evet — kısmen** | Aktarımda TLS + HSTS (nginx), `no-store` (paylaşılan cache'te sağlık verisi kalmasın), token CSPRNG (`crypto.randomBytes`) + timing-safe karşılaştırma. **Diskte şifreleme yok** — kalıntı kabul edilen risk (aşağıda) |
| A03 | Injection | **Evet** | SQL yalnız `db.js`'te prepared statement (dize birleştirme yasak, SEC-6); XSS'e karşı CSP `script-src 'self'` + `textContent` (SEC-7); JSON ayrıştırmada alan allowlist + `__proto__`/`constructor` reddi (prototype pollution, SEC-5); shell çağrısı yok; CSV alanları sayısal/enum olduğu için formül enjeksiyonu **oluşamaz** (enum whitelist bunu garanti eder) |
| A04 | Insecure Design | **Evet** | Tasarımdaki bilinçli açık (auth yok) STRIDE ile modellendi ve telafi kontrolleriyle (kapasite URL + rotasyon + veri minimizasyonu + tek kiracı) sınırlandı; veri minimum (isim/kimlik/konum/cihaz kimliği toplanmaz); yıkıcı uç yalnız `DELETE /api/readings/:id` (toplu silme ucu **yok**) |
| A05 | Security Misconfiguration | **Evet** | Tüm yanıtlarda (404 ve statik dâhil) güvenlik başlıkları (SEC-7); dizin listeleme yok; yığın izi/sürüm bilgisi sızmaz; container **non-root**, app `127.0.0.1`'e bağlı (yalnız nginx erişir); `.env`/sır imaja **girmez**; fail-closed başlatma yanlışlıkla açık deploy'u engeller (SEC-2) |
| A06 | Vulnerable & Outdated Components | **Evet — düşük** | Çalışma zamanı bağımlılığı **sıfır** (`node:http`, `node:sqlite`, `node:test` — hepsi yerleşik) → saldırı yüzeyi Node runtime'ı ile sınırlı; `node:22-alpine` taban imajı sabitlenir ve düzenli yeniden build edilir; CI'da `npm audit` (SEC-11) |
| A07 | Identification & Authentication Failures | **Evet — tasarım gereği yok** | Kimlik doğrulama bilinçli olarak yoktur (kullanıcı kararı); bu nedenle tek "kimlik bilgisi" olan yol token'ı **credential gibi** korunur: ≥128 bit entropi, loglanmaz, sabit-zaman karşılaştırma, tahmin oracle'ı yok (tekdüze 404), rotasyonla iptal edilebilir. Parola/oturum/MFA sınıfı kontroller uygulanamaz (kimlik yok) |
| A08 | Software & Data Integrity Failures | **Evet — düşük** | Dış CDN/üçüncü parti script **yok** (CSP `self`); otomatik güncelleme/deserialization yok; imaj CI'da sabitlenmiş tabandan build edilip SHA etiketiyle push edilir; deploy SSH ile yalnız kendi projesine dokunur; `JSON.parse` yalnız boyut sınırlı gövdede + alan allowlist |
| A09 | Security Logging & Monitoring Failures | **Evet** | Yapılandırılmış istek logu (method, durum, süre, **redakte yol**) — ölçüm değeri ve token asla; kapı reddi olayları sayaçla loglanır (sızıntı erken görünür); `/health` uptime probu; alert/retention Faz 14'e devredilir (SEC-10) |
| A10 | SSRF | **Hayır — uygulanamaz** | Sunucu **hiçbir giden istek yapmaz** (HTTP istemcisi, webhook, URL/dosya-getirme alanı, proxy ucu yok); kullanıcı girdisi yalnız sayı/enum/ISO-zaman. Yeni bir dış çağrı eklenirse bu satır yeniden değerlendirilmelidir |

## Diğer somut riskler ve kararlar

**Girdi doğrulama (sunucu otoritedir; istemci kontrolü yalnız UX).** `validate.js` tip + aralık + tutarlılık kontrolü yapar, ihlalde `400 {error:{code:"invalid_field",field}}`:

| Alan | Kural |
|------|-------|
| `right/left_systolic` | tamsayı, 40–300 |
| `right/left_diastolic` | tamsayı, 20–200; **`diastolic < systolic`** (aynı kol için) |
| `fever` | sayı, 30–45 (1 ondalık) |
| `pulse` | tamsayı, 20–250 |
| `oxygen` | tamsayı, 50–100 (aralık: mimari DDL ile birebir; 0–49 fizyolojik olarak ölçüm değil, veri hatasıdır) |
| `ts` | ISO-8601 + `+03:00` ofset, katı regex; gelecekte >24 sa **red** |
| `time_period` | enum: Sabah / Öğle / İkindi / Akşam / Yatsı |
| gövde / query | ≤64 KB; bilinmeyen alan **red**; `limit` 1–1000, `from`/`to` ISO |

En az bir ölçüm zorunlu (DDL CHECK ikinci hat). Doğrulama sınırları **DDL CHECK ile aynı** olmalı — Faz 11'de sınır testleri bunu doğrular.

**CSP ve tarayıcı başlıkları.** Mimarideki başlık seti aynen uygulanır: `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'` + `Referrer-Policy: no-referrer` + `X-Content-Type-Options: nosniff` + `X-Robots-Tag: noindex, nofollow` + `Strict-Transport-Security` + `Cache-Control: no-store` (HTML/API/CSV). Inline script/style **yok** (mimari zaten `app.js`'i ayrı dosya yapıyor) → nonce/hash yönetimine gerek kalmaz.

**CSRF.** Çerez/oturum olmadığı için klasik CSRF yüzeyi yoktur; yine de bir "cross-site basit POST" senaryosunu kapatmak için yazma uçları **`Content-Type: application/json` zorunlu** kılar (aksi hâlde 415). Bu, tarayıcıyı preflight'a zorlar; CORS başlığı hiç gönderilmediği için preflight başarısız olur.

**Hız sınırlama (LITE'ta gerekli mi?).** Sır tahmini için **gereksiz** (2^128 arama uzayı); ancak kimliksiz ve herkese açık bir uç olduğundan log/disk selini ve SQLite yazma yükünü sınırlamak için **20 satırlık, bağımlılıksız, süreç-içi sabit pencere sayacı yeterlidir**: IP başına 120 istek/dk → `429` + `Retry-After`. Tam teşekküllü (dağıtık/kalıcı) bir limiter tek kullanıcılı bir araç için aşırıdır ve **eklenmez**.

## Kabul edilen riskler

| Risk | Durum |
|------|-------|
| **RISK-1: Kimlik doğrulama yok — URL'i bilen herkes tüm sağlık verisini okuyabilir/silebilir.** | **Kullanıcı brief'te (Q1 + Q4) açıkça kabul etti.** Faz 7 riski kaldırmaz; tahmin edilemez kapasite URL + iptal/rotasyon + sızıntı yüzeylerinin kapatılmasıyla (no-referrer, noindex, log redaksiyonu, no-store) **pratik erişilebilirliği ihmal edilebilir düzeye** indirir. Kalan gerçek sızıntı yolu insanidir: URL'in paylaşılması/ekran görüntüsü. |
| **RISK-2: Veri diskte şifresiz (SQLite dosyası, VPS volume) + CSV kullanıcının cihazında korumasız.** | RISK-1'in **türevi/kalıntısı** — kullanıcı zaten "adresi bilen okuyabilir" riskini kabul ettiği için at-rest şifreleme tek başına anlamlı bir eşik eklemez (uygulama anahtarı aynı sunucuda durur). Faz 15'e teknik borç olarak yazılır (host disk şifreleme / şifreli yedek). |

Bu iki kalem yeni bir insan kararı **açmaz**; gerekçe ve alternatifler `decisions/DL-07-002.md`'de kayıtlıdır.

## AI tedarik zinciri & fabrika tehditleri

| Tehdit | Uygulanabilir? | Önlem / Neden uygulanamaz |
|--------|----------------|----------------------------|
| Prompt injection | Hayır | Üründe LLM/ajan çalışmaz; girdiler sayı/enum/tarih |
| Repo/artefakt prompt poisoning | Evet (fabrika tarafı) | Faz 9 yalnız bu repodaki artefaktları okur; dış içerik çekilmez |
| Dependency confusion | Hayır | Çalışma zamanı bağımlılığı sıfır; özel paket adı yok |
| Malicious package scripts | Hayır–düşük | `npm ci --omit=dev --ignore-scripts`; bağımlılık yok |
| Shell komut güvenliği | Hayır | Kullanıcı içeriği hiçbir kabuk/`child_process` çağrısına geçmez (yok) |
| Workspace / path & symlink escape | Evet | Statik sunucu yolu normalize eder, `public/` kökü dışına çıkanı 404 (SEC-9); symlink takip edilmez |
| Secret leakage | Evet | Token yalnız env'de; log redaksiyonu; `.env`/`deploy.json` sırrı repoya girmez (`env_ref`) |
| Docker build izolasyonu | Evet | Sabit taban imaj, non-root user, build-arg ile sır geçirilmez, `.dockerignore` |
| Üretilen CI güvenliği | Evet | Workflow yalnız `GITHUB_TOKEN` + deploy secret'ları; PR'dan gelen kodla secret paylaşılmaz |
| MCP/tool izinleri | Hayır | Ürün çalışma zamanında araç yüzeyi yok |

## Faz 9'a güvenlik gereksinimleri

- [ ] **SEC-1:** `accessGate.js` — normalize edilmiş yol `MOUNT_PREFIX` ile başlamıyorsa `404` + boş/minimal gövde; karşılaştırma `crypto.timingSafeEqual`; `/health` tek muaf; router'dan **önce** çalışır.
- [ ] **SEC-2 (fail-closed):** `NODE_ENV=production` ve `MOUNT_PREFIX` boş/22 karakterden kısaysa sunucu **başlamaz** (açıklayıcı hata + çıkış kodu 1). Geliştirmede boş prefix serbest ama uyarı basar. Token üretimi için `npm run gen-token` (`crypto.randomBytes(24).toString('base64url')`).
- [ ] **SEC-3:** `logger.js` yol içindeki prefix token'ını `/v/***` olarak redakte eder; ölçüm değeri, gövde ve query değerleri **asla** loglanmaz; kapı reddi `gate_denied` olayı olarak sayılır.
- [ ] **SEC-4:** Hız sınırı — IP başına 120 istek/dk sabit pencere (bağımlılıksız, süreç-içi), aşımda `429` + `Retry-After`; `/health` muaf.
- [ ] **SEC-5:** `validate.js` — yukarıdaki tablo birebir: tip + aralık + `diastolic < systolic` + `ts` regex + `time_period` enum + bilinmeyen alan reddi + `__proto__`/`constructor` anahtarı reddi; gövde ≤64 KB; `limit` 1–1000.
- [ ] **SEC-6:** `db.js` — **yalnız** prepared statement/parametre bağlama; hiçbir yerde SQL dize birleştirme yok; SQL bu modülün dışına çıkmaz.
- [ ] **SEC-7:** `securityHeaders.js` — CSP + `Referrer-Policy: no-referrer` + `nosniff` + `X-Robots-Tag: noindex, nofollow` + `Strict-Transport-Security` + `Cache-Control: no-store`; başlıklar **404/hata/statik dâhil tüm** yanıtlarda; `robots.txt` → `Disallow: /`.
- [ ] **SEC-8:** Yazma uçları (`POST`/`PUT`) `Content-Type: application/json` istemezse `415`; CORS başlığı **hiç** gönderilmez.
- [ ] **SEC-9:** Statik sunucu — yol normalize edilir, `public/` kökü dışına çıkan istek `404`; dizin listeleme yok; sadece bilinen uzantılar servis edilir.
- [ ] **SEC-10:** `errorHandler.js` — `{error:{code,message,field?}}`; yığın izi/SQL mesajı/dosya yolu **sızmaz**; beklenmeyen hata `500 internal_error` (jenerik) + sunucu tarafında tam log.
- [ ] **SEC-11:** Dockerfile — sabit `node:22-alpine` tabanı, **non-root** kullanıcı, `/app/data` dışında yazılabilir yol yok, `.dockerignore` ile `.env`/`data/` hariç; CI'da `npm audit`.
- [ ] **SEC-12:** İstemci — kullanıcı verisi DOM'a **yalnız** `textContent` ile yazılır (`innerHTML` yasak); CSV indirme `attachment`; `app.js` içinde gizli değer/sır gömülü değildir.

## Kalite kapısı raporu

- "OWASP Top 10 değerlendirildi" → ✅ (A01–A10 tamamı; A10 gerekçeli "uygulanamaz", diğerleri somut önlemle eşlendi)
- "STRIDE threat model var" → ✅ (6 bileşen × 6 kategori tablosu)
- "Hassas veri sınıflandırması eksiksiz" → ✅ (6 varlık; sağlık verisi özel nitelikli PII olarak işaretlendi, saklandığı yer + koruma yazıldı)
- "NFR-3 için somut hafifletme kararı var" → ✅ (kapasite URL + fail-closed + rotasyon — DL-07-001)
- "Faz 9'a SEC gereksinimleri devredildi" → ✅ (SEC-1 … SEC-12, hepsi tek dosyaya inen uygulanabilir madde)
- Decision Log → ✅ DL-07-001, DL-07-002
