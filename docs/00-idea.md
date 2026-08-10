# 00 — Fikir (Intake)

## Problem (tek cümle)
Kullanıcının 06.08.2026'dan başlayarak en az bir ay boyunca günde ≥4 kez girdiği vital bulguları (kol tansiyonları + ortalamaları, ateş, nabız, oksijen) zaman damgalı, sunucu tarafında saklanan, çok cihazdan erişilebilir bir tabloya kaydedebileceği bir web aracı yok.

## Kim için
Kendi (veya bir yakınının) günlük vital bulgularını takip eden tek bir kişi — girişsiz, kişisel/yerel kullanım; telefon ve bilgisayardan aynı verilere erişir.

## Kapsam (v1)
- Mobil öncelikli web formu: saat (boşsa o anki saat), zaman dilimi (sistem önerir, kullanıcı değiştirebilir — Sabah/Öğle/İkindi/Akşam/Yatsı)
- Alanlar: Sağ Kol Büyük/Küçük Tansiyon (+ortalama: aritmetik VE MAP), Sol Kol Büyük/Küçük Tansiyon (+ortalama: aritmetik VE MAP), Ateş, Nabız, Oksijen
- Kayıtlar kronolojik listelenir, düzenlenebilir, silinebilir, CSV dışa aktarılabilir
- Sunucu tarafı veritabanı (tek kullanıcı, girişsiz; çok cihazlı erişim — kabul edilen risk Faz 7'de değerlendirilir)
- Aynı zaman diliminde sınırsız kayıt serbest; "günde ≥4" toplam kayıt sayısına bakar

## Kapsam dışı (v1)
- Trend grafiği / görsel analiz
- Doktorla otomatik paylaşım / bildirim / hatırlatma
- Çoklu kullanıcı hesap yönetimi
- Native mobil uygulama

## Kaynak
Onaylı brief: `docs/00-refined-brief.md` (Q1–Q7 netleştirme turu uygulanmış, 4 kritik + 3 opsiyonel yanıtlandı)

## Kalite kapısı raporu
Problem tek cümlede tanımlı ✅ (yukarıda)
