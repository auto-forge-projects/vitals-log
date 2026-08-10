# 04 — Çözüm Analizi: vitals-log

- Tarih: 2026-08-10 | Mod: AUTOPILOT | Profil: LITE

## Karar problemi
FR-1..6 (kayıt ekle/listele/düzenle/sil + CSV export + çok cihazlı erişim) için **veri saklama**,
**istemci teslim biçimi**, **türetilmiş değerlerin (aritmetik ort. + MAP) hesap yeri** ve **CSV üretim yeri** seçilecek.
Belirleyici NFR'ler: NFR-1 liste ≤1 sn (~120+ satır), NFR-2 360px mobilde yatay kaydırmasız, NFR-3 girişsiz erişim azaltımı (Faz 7), NFR-4 süreç yeniden başlasa da veri kaybı yok.
Kısıtlar: LITE (tek geliştirici, 1 günden az geliştirme), tek süreçli Node servisi + tek Docker container, sıfır dış bağımlılık hedefi, mevcut SSH-push deploy akışı.

## Karar 1 — Veri saklama (NFR-4/NFR-1 belirleyici)

- **A — Gömülü `node:sqlite` (stdlib, Node ≥22.5).** Tek dosya DB (volume'da), `readings` tablosu, SQL + index; dış paket yok.
- **B — `better-sqlite3` (npm paketi).** Aynı SQLite motoru, olgun/stabil API; native derleme (prebuild) gerektirir.
- **C — Düz JSON dosya deposu.** Tüm kayıtlar bellekte dizi; her mutasyonda `data.json`'a atomik (tmp+rename) tam yazım.

### Trade-off matrisi
| Kriter | A: node:sqlite | B: better-sqlite3 | C: düz JSON dosya |
|--------|----------------|-------------------|-------------------|
| NFR-4 (yeniden başlatmada kayıp yok) | ✅ transaction commit = kalıcı | ✅ aynı | ⚠️ tmp+rename doğru yazılırsa ✅; fsync/atomiklik **elle** doğru kurgulanmalı |
| NFR-1 (liste ≤1 sn, ~120–200 satır) | ✅ index'li `ORDER BY ts` (<5 ms) | ✅ aynı | ✅ bellekten sıralama (<5 ms) — bu ölçekte fark yok |
| FR-3/FR-4 (tekil güncelle/sil) | ✅ `WHERE id=?` — satır düzeyinde | ✅ aynı | ⚠️ dizi indeks arama + **tüm dosyanın** yeniden yazımı |
| Eşzamanlı yazım (çok cihaz, FR-6) | ✅ tek yazar + transaction | ✅ aynı | ❌ iki isteğin oku-değiştir-yaz'ı **kayıp güncelleme** üretebilir |
| Veri bütünlüğü zorlaması | ✅ NOT NULL/CHECK **depo düzeyinde** | ✅ aynı | ❌ yalnız uygulama kodu |
| Dış bağımlılık | Yok (stdlib) | ❌ npm + native derleme (Alpine/musl riski) | Yok |
| Karmaşıklık (LITE) | Düşük (~60 LOC adaptör + SQL) | Düşük (~55 LOC) | En düşük (~40 LOC) ama atomiklik/kilit kodu ekleyince ~90 LOC |
| Test edilebilirlik | ✅ `:memory:` DB ile izole | ✅ `:memory:` | ⚠️ tmp dosya fixture'ı |
| Docker paketleme | ✅ ek katman yok, `node:22+` imajı | ⚠️ build-base/python gerekebilir | ✅ |
| Ölçek başlığı (30 gün sonrası büyüme) | ✅ sınırsız | ✅ | ⚠️ her yazımda O(n) tam dosya |
| Geri alınabilirlik | **Yüksek** — `ReadingStore` arayüzü; migrasyon `SELECT *` → JSON | Yüksek | Yüksek |
| Olgunluk riski | ⚠️ `node:sqlite` Node 22'de deneysel (ExperimentalWarning); Node 24'te stabilleşti | ✅ olgun | ✅ |

### Seçim: **A — gömülü `node:sqlite`**
**Gerekçe:**
- **C elendi:** FR-6 açıkça çok cihazlı erişim ister; iki cihazdan neredeyse eşzamanlı iki kayıt, tam-dosya oku-değiştir-yaz deseninde sessizce birbirini ezebilir (kayıp güncelleme). NFR-4'ün "veri kaybolmaz" ifadesi yalnız yeniden başlatmayı değil bu sınıf kaybı da kapsar. Ayrıca FR-3/FR-4 tekil mutasyonları için tüm dosyayı yeniden yazmak, "en basit görünen" seçeneği atomiklik + kilit koduyla en kırılgan hale getirir.
- **B elendi:** A ile aynı garantileri verir ama native derlemeli bir npm bağımlılığı ekler — sıfır-bağımlılık hedefi, Alpine/musl uyumu ve tek-container imaj sadeliği bedelini LITE profilinde karşılamaz. Kazanç yalnız "deneysel uyarı yok".
- **A seçildi:** Kalıcılık ve bütünlük **depo düzeyinde** (transaction, NOT NULL/CHECK, `WHERE id=?`) zorlanır; ek paket yok; `:memory:` DB ile Faz 11 testleri izole ve hızlı. Emsal: url-shortener aynı seçimi kanıtladı.
- **Kilitlenme riski düşük:** erişim `ReadingStore { list, create, update, remove }` arayüzünden geçer, SQL tek adaptör dosyasında kalır. Deneysel API sorun çıkarırsa adaptör B'ye ~1 saatte döner (aynı SQL), veri dosyası aynen kullanılır.

## Karar 2 — İstemci teslim biçimi (NFR-2/NFR-1 belirleyici)

- **D — Sunucu içi inline HTML + vanilla JS, JSON API'ye `fetch`.** Tek statik sayfa; CRUD `/api/readings` üzerinden.
- **E — Sunucu tarafı HTML form + POST/redirect (JS'siz).** Her işlem tam sayfa yenilemesi.
- **F — Frontend framework + bundle (React/Vite).** Ayrı build zinciri, imaja kopyalanan çıktı.

| Kriter | D: inline HTML + vanilla JS | E: SSR form + redirect | F: framework + bundle |
|--------|-----------------------------|------------------------|------------------------|
| FR-1 (ortalamaları **girerken** göster) | ✅ anlık istemci hesabı, kayıttan önce | ❌ ancak kaydettikten sonra görünür | ✅ |
| NFR-2 (360px mobil) | ✅ elde yazılan responsive CSS, tam kontrol | ✅ | ✅ ama CSS framework cazibesi + ağırlık |
| NFR-1 (≤1 sn) | ✅ tek JSON isteği, ~120 satır | ⚠️ her işlemde tam sayfa render | ⚠️ bundle indirme (mobil ilk açılış) |
| Karmaşıklık (LITE bütçesi) | Düşük (1 sayfa modülü + 1 API modülü) | Düşük | Yüksek (toolchain, ayrı build/test/CI adımı) |
| Dış bağımlılık | Yok | Yok | ❌ npm ağacı (A06 tedarik zinciri) |
| Faz 12 paketleme | ✅ tek container, ek build yok | ✅ | ❌ ek build aşaması |
| Test edilebilirlik | ✅ saf modüller `node:test` ile import edilir | ✅ | ⚠️ ayrı koşucu |
| Geri alınabilirlik | Yüksek (tek modül + route) | Yüksek | Düşük (build/CI/imaj kalıcı değişir) |

### Seçim: **D — inline HTML + vanilla JS + JSON API**
**Gerekçe:** FR-1 kabul kriteri ortalamaların **kayıt anında hesaplanıp gösterilmesini** ister; E bunu ancak kayıttan sonra yapabilir (kullanıcı yanlış değeri kaydetmeden göremez, KPI-1 "≤30 sn" akışını da bozar). F, tek formluk bir üründe tüm yapı zincirini kalıcı olarak değiştirir — kilitlenme riski en yüksek, geri alınabilirliği en düşük seçenek. D, sıfır bağımlılıkla her iki gereksinimi de karşılar.

## Karar 3 — Türetilmiş değerlerin (aritmetik ort. + MAP) hesap yeri

- **G — Türetilmiş, saklanmaz.** Saf `derive(sys,dia)` modülü; sunucu okuma/CSV'de hesaplar, istemci **aynı modülü** canlı önizleme için kullanır.
- **H — Kayıt anında hesaplanıp DB'ye kolon olarak yazılır.**

| Kriter | G: türetilmiş (saklanmaz) | H: DB'de saklanan kolon |
|--------|---------------------------|-------------------------|
| FR-3 (düzenlemede yeniden hesap) | ✅ tanımı gereği hep güncel | ⚠️ update'te yeniden yazılmazsa **bayat değer** |
| Tek gerçek kaynak | ✅ tek saf fonksiyon | ❌ formül iki yerde (istemci + yazım yolu) tekrarlanır |
| NFR-1 | ✅ 4 aritmetik işlem/satır (~ihmal edilebilir) | ✅ |
| Formül değişirse (ör. MAP yuvarlama) | ✅ kod değişir, geçmiş kayıtlar kendiliğinden düzelir | ❌ geriye dönük migrasyon gerekir |
| Karmaşıklık | Düşük | Düşük ama şema + migrasyon yükü |
| Geri alınabilirlik | Yüksek (kolon eklemek her an mümkün) | Orta (yazılmış veriyi temizlemek gerekir) |

**Seçim: G.** H, FR-3'ün "ortalamalar yeniden hesaplanır" kriterini bir kod-disiplinine (update yolunda unutmama) bağlar; G bunu yapısal olarak imkânsız kılar. Saf modül hem sunucuda hem istemcide paylaşıldığı için formül **tek yerde** yaşar ve Faz 9'da birim testiyle kilitlenir.

## Karar 4 — CSV üretim yeri (FR-5)

- **I — Sunucuda endpoint (`GET /api/readings.csv`, `Content-Disposition: attachment`).** Aynı `derive` modülünü kullanır.
- **J — İstemcide Blob üretimi (JS ile CSV birleştirip indirtme).**

| Kriter | I: sunucu endpoint | J: istemci Blob |
|--------|--------------------|-----------------|
| FR-5 "tüm alanlar eksiksiz" testi | ✅ Faz 11'de HTTP testiyle doğrudan doğrulanır | ❌ tarayıcı gerekir (headless test yükü) |
| Tek gerçek kaynak (derive) | ✅ sunucu modülü | ⚠️ istemci kopyası kayabilir |
| Mobil tarayıcı uyumu | ✅ standart indirme | ⚠️ iOS Safari Blob indirme davranışı değişken |
| Karmaşıklık | Düşük (~25 LOC + kaçış kuralları) | Düşük |
| Geri alınabilirlik | Yüksek (tek route) | Yüksek |

**Seçim: I.** FR-5'in kabul kriteri otomatik testle kanıtlanabilir olmalı; sunucu endpoint'i bunu tarayıcı olmadan mümkün kılar ve CSV alanları ile liste alanları aynı türetim kaynağından gelir.

## NFR ↔ çözüm ön-eşlemesi (Faz 5'te detaylandırılacak)
| NFR | Bu kararların karşılığı |
|-----|--------------------------|
| NFR-1 (liste ≤1 sn) | Index'li tek `SELECT ... ORDER BY ts`; tek JSON isteği; bundle indirme yok (Karar 1+2) |
| NFR-2 (360px mobil) | Elde yazılan responsive tek sayfa; framework/grid ağırlığı yok (Karar 2) |
| NFR-3 (girişsiz erişim riski) | **Açık:** mekanizma Faz 7'nin; mimari, tüm route'ların ÖNÜNDE tek erişim kapısı (middleware) yerleştirir — kararın sonradan kod yayılımı olmadan takılabilmesi için (Karar 2'nin tek giriş noktası) |
| NFR-4 (kalıcılık) | SQLite transaction + volume'daki tek dosya DB; süreç yeniden başlasa veri korunur (Karar 1) |

## Açık sorular (Faz 5/7'ye devredilir)
- NFR-3'ün somut mekanizması (tahmin edilemez route öneki mi, erişim anahtarı + cookie mi) — **Faz 7 karar verir**; Faz 5 yalnız tek kapı noktasını konumlandırır.
- DB dosyasının volume/yedek yolu ve `deploy.json` host_port ayrıntısı — Faz 5/12.
- Zaman dilimi (Sabah/Öğle/…) eşik saatleri — Faz 5 veri modelinde sabitlenecek.

## Kalite kapısı raporu
- "En az 2 alternatif karşılaştırıldı" → ✅ (Karar 1: 3 alt × 12 kriter, Karar 2: 3 alt × 8, Karar 3: 2 alt × 6, Karar 4: 2 alt × 5 — hepsi satır satır)
- "Seçim NFR'lere bağlandı" → ✅ (NFR-1..4 hem matrislerde hem eşleme tablosunda)
- Decision Log → ✅ DL-04-001 (depolama), DL-04-002 (istemci teslimi), DL-04-003 (türetilmiş değerler), DL-04-004 (CSV üretim yeri)
