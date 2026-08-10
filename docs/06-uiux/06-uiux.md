# 06 — UI/UX: vitals-log

- Tarih: 2026-08-10 | Mod: AUTOPILOT | Profil: LITE
- Girdi: `docs/03-requirements.md`, `docs/05-architecture.md`

## Tasarım sistemi notu

- Tek sayfa (`public/index.html`), inline script yok (CSP — DL-05-004). Framework/grid yok, elde yazılan `styles.css`.
- **Tek sütun, mobil öncelikli:** 360px genişlikte yatay kaydırma yok (NFR-2). Breakpoint yok — form zaten dar; liste 360px altında kart görünümüne döner (satır yerine dikey key-value blok).
- Renk/tipografi: sistem fontu, nötr gri zemin, tek vurgu rengi (kaydet/aksiyon butonları). Form alanları dikey akış: Saat → Zaman dilimi → Sağ kol (büyük/küçük) → Sol kol (büyük/küçük) → Ateş/Nabız/Oksijen → Kaydet.
- Ortalama/MAP değerleri **salt-okunur, gri, küçük font** alt satırda gösterilir — kullanıcı girmez, `derive.js` anlık hesaplar (istemci) ve sunucu yanıtı ile teyit edilir.
- Hata mesajları form üstünde kırmızı tek satır banner; ilgili alan kırmızı kenarlıkla işaretlenir.

## Ana akış

### 1) Ana ekran düzeni
```
┌─────────────────────────┐
│  [Kayıt Formu]           │  ← üstte, her zaman açık (modal değil)
│  Saat: [__:__] (boş=şimdi)│
│  Dilim: [Sabah ▾] (önerilir)│
│  Sağ kol: [büyük][küçük]  │
│    → Ort: xx  MAP: xx     │  (salt okunur, canlı hesap)
│  Sol kol:  [büyük][küçük] │
│    → Ort: xx  MAP: xx     │
│  Ateş:[__] Nabız:[__] O2:[__]│
│  [Kaydet]  [Vazgeç]       │
├─────────────────────────┤
│  [CSV dışa aktar]         │
├─────────────────────────┤
│  Kayıt Listesi (kronolojik, en yeni üstte) │
│  ┌───────────────────┐   │
│  │ 10 Ağu 08:15 Sabah │   │
│  │ Sağ 120/80 (Ort 100 MAP 93)│
│  │ Sol 118/78 ...      │
│  │ Ateş 36.6 Nabız 72 O2 98│
│  │ [Düzenle] [Sil]     │
│  └───────────────────┘   │
│  (diğer kayıtlar...)      │
└─────────────────────────┘
```
- Form her zaman görünür (ekstra tık gerektirmez — KPI-1: kayıt ≤30sn).
- Liste `GET /api/readings` ile açılışta çekilir, `ORDER BY ts DESC` sırası aynen render edilir (sunucu sıralar, istemci yeniden sıralamaz).

### 2) Kayıt ekleme (uçtan uca)
1. Kullanıcı sayfayı açar → form boş, tüm alanlar boş/varsayılan.
2. Saat alanını boş bırakır veya elle girer.
3. Sağ/sol kol büyük+küçük tansiyon değerlerini girer → `app.js` her `input` olayında `derive.js`'in `mean()`/`map()` fonksiyonlarını çağırıp ortalama+MAP'i **anında** (sunucuya gitmeden) alt satırda gösterir.
4. Saat girildiğinde (veya boşsa `now()` anında) `derive.periodFor(hour)` ile zaman dilimi önerilir; kullanıcı dropdown'dan değiştirebilir.
5. Ateş/nabız/oksijen (opsiyonel) doldurulur.
6. "Kaydet" tıklanır → `POST ./api/readings` (JSON body).
   - Başarılı (`201`): form temizlenir, dönen kayıt (türetilmiş alanlarla) listenin **en üstüne** eklenir, kısa bir "Kaydedildi" bildirimi gösterilir.
   - Hata (`400`): form banner'ında hata mesajı gösterilir (bkz. "Hata durumları"), form verisi KORUNUR (kullanıcı yeniden yazmaz).

### 3) Kayıt düzenleme (uçtan uca)
1. Kullanıcı listede bir satırın "Düzenle" butonuna tıklar.
2. O satırın tüm alanları forma taşınır (form üstteki aynı form — ayrı ekran/modal yok), form başlığı "Kaydı Düzenle"ye döner, "Kaydet" → "Güncelle" olur, ayrıca "Vazgeç" belirir.
3. Kullanıcı değerleri değiştirir; ortalama/MAP anında yeniden hesaplanır (adım 2'deki gibi client-side).
4. "Güncelle" tıklanır → `PUT ./api/readings/:id`.
   - Başarılı (`200`): dönen kayıt listede yerinde güncellenir (sıralama `ts` değiştiyse yeniden konumlanır), form sıfırlanır ("Kaydet" moduna döner).
   - Hata (`400`/`404`): banner ile hata gösterilir; `404` durumunda (kayıt bu sırada silinmişse) liste yeniden çekilir ve kullanıcıya "kayıt artık mevcut değil" bilgisi verilir.
5. "Vazgeç" tıklanırsa form sıfırlanır, hiçbir istek gönderilmez.

### 4) Kayıt silme (uçtan uca)
1. Kullanıcı listede bir satırın "Sil" butonuna tıklar.
2. Tarayıcı native `confirm()` ile onay istemi gösterilir ("Bu kaydı silmek istediğinize emin misiniz?").
3. Onaylanırsa → `DELETE ./api/readings/:id`.
   - Başarılı (`204`): satır listeden kaldırılır (DOM'dan çıkarılır), kısa "Silindi" bildirimi.
   - Hata (`404`): banner'da hata gösterilir, liste yeniden çekilir (senkron dışı kalmasın diye).
4. Onay reddedilirse (İptal) hiçbir istek gönderilmez, liste değişmez.

### 5) CSV dışa aktarma (uçtan uca)
1. Kullanıcı "CSV dışa aktar" butonuna tıklar.
2. Tarayıcı `GET ./api/readings/export.csv`'a doğrudan navigasyon yapar (`<a download>` veya `window.location`), sunucu `Content-Disposition: attachment` ile dosya indirmesini tetikler.
3. Kayıt yoksa buton devre dışı bırakılır (0 kayıt state'inde disabled) — sunucuya boş istek gitmez.
4. İndirilen dosya adı `vitals-YYYYMMDD.csv`, tüm alanlar + ortalama/MAP kolonlarını içerir (mimari CSV kolon listesiyle birebir).

### 6) Hata durumları
- **Eksik zorunlu alan:** Hiçbir ölçüm alanı girilmeden "Kaydet" tıklanırsa (tüm alanlar boş) → sunucu `400 { error: { code:"EMPTY_READING", message } }` döner, form banner'ında "Hata: en az bir ölçüm alanı doldurulmalı" gösterilir; ayrıca istemci bu durumu **sunucuya gitmeden** de yakalayıp aynı hatayı gösterebilir (erken geri bildirim, sunucu yine de son karar mercii).
- **Geçersiz sayısal değer:** Tansiyon/ateş/nabız/oksijen aralık dışıysa (ör. sistolik 500) veya sayısal olmayan karakter girilirse → `400 { error: { code:"OUT_OF_RANGE"|"INVALID_TYPE", field, message } }`; banner "Hata: {alan adı} geçerli bir değer değil (izin verilen aralık: ...)" gösterir ve ilgili input kırmızı kenarlıkla işaretlenir.
- **Sistolik/diyastolik tutarsızlığı:** Büyük tansiyon küçükten küçük/eşitse → `400 { error: { code:"BP_MISMATCH", field, message } }`; banner "Hata: büyük tansiyon küçükten büyük olmalı".
- **Ağ/sunucu hatası (5xx):** Banner "Hata: sunucuya ulaşılamadı, tekrar deneyin"; form verisi kaybolmaz, kullanıcı tekrar "Kaydet"e basabilir.
- Tüm hata banner'ları 1 satır Türkçe metin + kapatma (x) ikonu; bir sonraki başarılı istekte otomatik temizlenir.

## Kabul kriteri eşlemesi

| Akış | Karşıladığı FR |
|------|-----------------|
| Kayıt ekleme | FR-1 |
| Kayıt listeleme | FR-2 |
| Kayıt düzenleme | FR-3 |
| Kayıt silme | FR-4 |
| CSV dışa aktarma | FR-5 |
| Tüm akışlar sunucu-tarafı DB üzerinden | FR-6 |

## Kalite kapısı raporu

- "Ana akışlar uçtan uca" → ✅ (ekleme, listeleme, düzenleme, silme, CSV export, hata durumları uçtan uca tarif edildi ve FR-1..6 ile eşlendi)
