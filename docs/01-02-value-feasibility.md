# 01-02 — Değer & Fizibilite (LITE birleşik faz): vitals-log

> LITE profil: yarım sayfa hedefi, paydaş analizi yok.

- Tarih: 2026-08-10 | Mod: AUTOPILOT | Profil: LITE

## Değer önerisi
Kullanıcının günlük vital bulgularını (tansiyon, ateş, nabız, oksijen) hızlıca kaydedip zaman içinde takip edebileceği, girişsiz, mobil öncelikli, sunucu tarafında saklanan bir veri girişi tablosu — kağıt takip defterinin yerini alır, ortalama tansiyon hesaplarını otomatikleştirir.

## KPI'lar (kalite kapısı: en az 3, ölçülebilir)
1. Bir kayıt girme süresi (form açılışından kayda kadar) ≤ 30 sn (manuel ölçüm).
2. Sağ/sol kol tansiyon ortalamaları (aritmetik + MAP) kayıt anında otomatik hesaplanıp gösterilir, 0 manuel hesaplama gerekir (otomatik test).
3. Kullanıcı 30 gün boyunca günde ≥4 kayıt girebiliyor; kayıt listesi kronolojik sırayla ≤ 1 sn içinde yüklenir (otomatik test).
4. CSV dışa aktarma tüm alanları (zaman, kol tansiyonları+ortalamalar, ateş, nabız, oksijen) eksiksiz içerir (otomatik test).

## Fizibilite
- Teknik: Basit CRUD form + sunucu tarafı DB (SQLite) + hesaplama fonksiyonları — düşük risk, url-shortener/calculator emsali. ✅
- Ekonomik: Sıfır ek altyapı maliyeti (statik+API tek servis, mevcut SSH-push deploy akışı yeterli). ✅
- Zaman: LITE MVP kapsamı (tek kullanıcı, girişsiz, tek tablo) 1 günden az geliştirme gerektirir. ✅

## GO / NO-GO önerisi: **GO**
Gerekçe: Teknik risk yok (standart form+DB+hesaplama, calculator/url-shortener'da kanıtlanmış desenler), maliyet sıfıra yakın, kapsam brief'in Q1–Q7 netleştirmesiyle net. Dört ölçülebilir KPI ile ilerlemek uygun.

## Kalite kapısı raporu
- "En az 3 ölçülebilir KPI" → ✅ (yukarıda 4 KPI, hedef + ölçüm yöntemiyle)
- "GO/NO-GO kararı gerekçeli" → ✅ (GO, teknik/ekonomik/zaman gerekçesiyle)
