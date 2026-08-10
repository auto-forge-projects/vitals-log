# 03 — Requirement Analizi: vitals-log

- Tarih: 2026-08-10 | Mod: AUTOPILOT | Profil: LITE

## Fonksiyonel gereksinimler

### FR-1: Kayıt ekleme
- **User story:** Kullanıcı olarak, tek bir formla vital bulgularımı kaydetmek istiyorum, böylece takip defteri tutmam.
- **Kabul kriterleri (zorunlu):**
  - Given form açık, when saat alanı boş bırakılıp kaydedilirse, then kayıt anındaki saat otomatik atanır.
  - Given form açık, when saat elle girilirse, then girilen saat kaydedilir.
  - Given saat bilgisi (girilen veya otomatik), when kaydedilirse, then sistem zaman dilimini (Sabah/Öğle/İkindi/Akşam/Yatsı) önerir; kullanıcı isterse değiştirir.
  - Given sağ/sol kol büyük+küçük tansiyon girildi, when kaydedilirse, then her kol için aritmetik ortalama ((büyük+küçük)/2) VE MAP (küçük+(büyük-küçük)/3) otomatik hesaplanıp gösterilir.
  - Given ateş/nabız/oksijen alanları, when doldurulursa, then kayıtla birlikte saklanır.
- **Öncelik:** Must

### FR-2: Kayıt listeleme
- **User story:** Kullanıcı olarak, girdiğim kayıtları kronolojik sırada görmek istiyorum, böylece geçmiş ölçümlerimi takip edebilirim.
- **Kabul kriterleri (zorunlu):**
  - Given birden fazla kayıt var, when liste açılırsa, then kayıtlar tarih/saate göre kronolojik sırayla gösterilir.
  - Given aynı zaman diliminde birden fazla kayıt var, when listelenirse, then hepsi ayrı satır olarak görünür (sınır yok).
- **Öncelik:** Must

### FR-3: Kayıt düzenleme
- **User story:** Kullanıcı olarak, yanlış girdiğim bir kaydı düzeltmek istiyorum, böylece verim doğru kalır.
- **Kabul kriterleri (zorunlu):**
  - Given mevcut bir kayıt, when düzenlenip kaydedilirse, then ortalamalar (aritmetik+MAP) yeniden hesaplanır ve liste güncellenir.
- **Öncelik:** Must

### FR-4: Kayıt silme
- **User story:** Kullanıcı olarak, hatalı/mükerrer bir kaydı silmek istiyorum, böylece liste temiz kalır.
- **Kabul kriterleri (zorunlu):**
  - Given mevcut bir kayıt, when silinirse, then listeden ve depodan kalıcı olarak kaldırılır.
- **Öncelik:** Must

### FR-5: CSV dışa aktarma
- **User story:** Kullanıcı olarak, kayıtlarımı CSV olarak indirmek istiyorum, böylece doktoruma gösterebilir/yedekleyebilirim.
- **Kabul kriterleri (zorunlu):**
  - Given ≥1 kayıt var, when "CSV dışa aktar" tıklanırsa, then tüm alanlar (zaman, zaman dilimi, sağ/sol kol büyük/küçük+ortalamalar, ateş, nabız, oksijen) eksiksiz içeren bir .csv dosyası indirilir.
- **Öncelik:** Must

### FR-6: Çok cihazlı erişim
- **User story:** Kullanıcı olarak, farklı cihazlardan (telefon/bilgisayar) aynı kayıtlara erişmek istiyorum, böylece nerede olursam olayım veri girebilirim.
- **Kabul kriterleri (zorunlu):**
  - Given kayıt sunucu tarafı DB'de saklanıyor, when farklı bir cihazdan aynı adrese girilirse, then aynı kayıt seti görünür.
- **Öncelik:** Must

## Fonksiyonel olmayan gereksinimler (kalite kapısı: ölçülebilir)
| ID | Kategori | Gereksinim | Ölçüt / Hedef |
|----|----------|------------|----------------|
| NFR-1 | Performans | Kayıt listesi yüklenme süresi | ≤ 1 sn (30 günlük, günde ≥4 kayıt = ~120+ satır) |
| NFR-2 | Kullanılabilirlik | Mobil ekranda kullanılabilirlik | 360px genişlikte form/liste yatay kaydırma gerektirmeden kullanılabilir |
| NFR-3 | Güvenlik | Girişsiz erişim riski azaltımı | Tahmin edilemez route/erişim anahtarı (Faz 7'de detaylandırılır) |
| NFR-4 | Kalıcılık | Veri kaybı toleransı | Kayıtlar sunucu tarafı DB'de saklanır, süreç yeniden başlasa da veri kaybolmaz |

## İzlenebilirlik
| FR | Karşıladığı KPI / iş hedefi |
|----|------------------------------|
| FR-1 | KPI-1 (kayıt ≤30sn), KPI-2 (otomatik ortalama) |
| FR-2 | KPI-3 (liste ≤1sn, günde ≥4 kayıt/30gün) |
| FR-3, FR-4 | Brief Q6 (düzenle+sil) |
| FR-5 | KPI-4 (CSV export) |
| FR-6 | Brief Q4 (çok cihazlı erişim) |

## Kalite kapısı raporu
- "Her FR'nin kabul kriteri var" → ✅ (FR-1..6 hepsinde Given/When/Then)
- "NFR'ler ölçülebilir" → ✅ (NFR-1..4 sayısal/somut ölçüt içeriyor)
