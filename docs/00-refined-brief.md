# 00 — Rafine Proje Brief'i: vitals-log

> **Faz 0b çıktısı.** Ham fikir, kullanılabilen en iyi modelle yapılandırılmış brief'e dönüştürülür.
> Bu brief kullanıcıya HAM FİKİRLE YAN YANA sunulur; **onaylanmadan Faz 0 (00-idea.md) üretilmez.**
> Onay sonrası bu brief, Faz 0 ve sonraki tüm fazların girdisidir.

- Tarih: 2026-08-10 | Rafine eden model: sonnet (hızlı) | Onay durumu: **Onaylandı** (dashboard, 2026-08-10)

## Ham fikir (kullanıcının girdisi — değiştirilmez)
> Veri girişi yapabileceğim bir tabloya ihtiyacım var. Bu tabloya en az bir aylık giriş yapacagim. 06.08.2026 dan itibaren.
>
> Saat girersem girdiğim saati, saat gitmezsen o an ki saati otomatik olarak girsin.
> Ayrıca Günde en az 4 ve üzeri değer girebileyim. Tabloyu ona göre ayarlarsin. Sabah öğle ikindi akşam yatsı vs. Gibi tabi girdigim saat değeri önemli.
>
> Tabloya gireceğim bilgiler.
> Sag Kol Büyük Tansiyon
> Sağ Kol Küçük Tansiyon
> Bunun ortalamasını hesaplayacaksin ve yanına da o değeri verecek
>
> Aynı şekilde
>
> Sol Kol Büyük Tansiyon
> Sol Kol Küçük Tansiyon
> Bunun ortalamasını hesaplayacaksin ve yanına da o değeri verecek
>
> Ateş
> Nabız
> Ve
> Oksijen de diğer girmem gereken değerler .

## Rafine problem (tek cümle)
Kullanıcının 06.08.2026'dan başlayarak en az bir ay boyunca günde ≥4 kez (sabah/öğle/ikindi/akşam/yatsı gibi zaman dilimlerinde) girdiği vital bulguları (sağ/sol kol tansiyonu + ortalamaları, ateş, nabız, oksijen) zaman damgalı bir tabloya kaydedebileceği bir veri girişi aracına ihtiyacı var.

## Hedef kitle
Kendi (veya bir yakınının) günlük vital bulgularını takip eden tek bir kişi — kişisel sağlık takibi, muhtemelen doktor kontrolü için düzenli ölçüm kaydı tutuluyor.

## Kısıtlar & varsayımlar (AF-001 kapanışı)
- Platform/runtime: Mobil öncelikli web uygulaması (telefon ekranına göre tasarlanır, masaüstü tarayıcıda da çalışır) — native mobil uygulama değil.
- Erişim/kimlik doğrulama: Tek kullanıcı, girişsiz (kimlik doğrulama YOK) — kişisel/yerel kullanım.
- Veri konumu: Sunucu tarafı veritabanı (yalnız tarayıcı-yerel depolama değil) — kullanıcı farklı cihazlardan (ör. telefon + bilgisayar) aynı veriye erişebilir. **Kabul edilen risk:** girişsiz + çok-cihazlı erişim, URL/adresi bilen herkesin veriye ulaşabileceği anlamına gelir; kullanıcı bunu bilinçli tercih etti (Q1+Q4 birlikte), Faz 7 (Güvenlik) bu kabulü değerlendirip en az bir hafifletme (ör. tahmin edilemez URL/route, opsiyonel basit erişim anahtarı) önerecek.
- Zaman dilimi etiketi: Sistem saate göre bir zaman dilimi (Sabah/Öğle/İkindi/Akşam/Yatsı) ÖNERİR, kullanıcı isterse değiştirir (tam otomatik değil, tam manuel de değil).
- "Büyük Tansiyon" = sistolik, "Küçük Tansiyon" = diyastolik olarak yorumlandı.
- Tansiyon ortalaması: HER İKİ yöntem de gösterilir — basit aritmetik ortalama ((büyük+küçük)/2) VE tıbbi MAP formülü (Diyastolik + (Sistolik-Diyastolik)/3), yan yana etiketli.
- Aynı zaman diliminde günde birden fazla kayıt serbesttir (sınır yok); "günde ≥4 kayıt" toplam kayıt sayısına bakar, zaman dilimi başına değil.
- Zaman/kota bütçesi: LITE profil, hızlı teslim; karmaşık analiz/grafik istenmiyor.

## Başarı kriterleri (ölçülebilir)
1. Kullanıcı en az 30 gün boyunca günde ≥4 kayıt girebiliyor (toplam, zaman dilimi başına sınır yok); saat alanı boş bırakılırsa o anki saat, doldurulursa girilen saat kullanılıyor; zaman dilimi sistemce önerilip elle değiştirilebiliyor.
2. Sağ kol ve sol kol için hem basit aritmetik ortalama hem MAP değeri her kayıtta otomatik hesaplanıp gösteriliyor.
3. Ateş, nabız, oksijen alanları her kayıtta girilebiliyor; kayıtlar 06.08.2026'dan itibaren kronolojik sırayla listeleniyor.
4. Kayıtlar düzenlenebiliyor, silinebiliyor ve CSV olarak dışa aktarılabiliyor.
5. Veri sunucu tarafında saklanıyor; kullanıcı farklı cihazlardan aynı kayıtlara erişebiliyor.

## Kapsam sınırı (v1'de yapılmayacaklar)
- Trend grafiği / görsel analiz (v1'de yalnız tablo + ortalama değerler).
- Doktorla otomatik paylaşım / bildirim / hatırlatma sistemi.
- Çoklu kullanıcı hesap yönetimi (tek kullanıcı, girişsiz kabul edildi).
- Native mobil uygulama (yalnız mobil öncelikli web arayüzü).

## Netleştirilen sorular
- [x] **Q1** 🔴 Bu tabloya kim erişecek — kimlik doğrulama gerekiyor mu? → **Tek kullanıcı, girişsiz (yerel/kişisel kullanım)**
- [x] **Q2** 🔴 Tablo hangi platformda çalışacak? → **Mobil öncelikli (telefon ekranına göre tasarım)**
- [x] **Q3** 🔴 Zaman dilimi etiketi nasıl belirlenecek? → **Sistem öneri versin, kullanıcı isterse değiştirsin**
- [x] **Q4** 🔴 Veri nerede saklanacak? → **Sunucu tarafı veritabanı (farklı cihazlardan erişilebilir)**
- [x] **Q5** ⚪ Tansiyon ortalaması hangi yöntemle hesaplanmalı? → **İkisini de göster (aritmetik ortalama + MAP)**
- [x] **Q6** ⚪ Düzenleme/silme/dışa aktarma gerekiyor mu? → **Evet, düzenle + sil + CSV dışa aktarma**
- [x] **Q7** ⚪ Aynı zaman diliminde günde birden fazla kayıt girilebilsin mi? → **Sınırsız, aynı dilimde birden fazla kayda izin ver**

## Önerilen profil ve ilk mod
- Profil: LITE · Gerekçe: Tek kullanıcılı, veri girişi + basit hesaplama odaklı küçük ölçekli bir araç; kurumsal derinlik/adversarial güvenlik gerektirmiyor.

---
## Onay kaydı
- 2026-08-10 — Beklemede
