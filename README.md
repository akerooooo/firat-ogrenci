# Fırat Öğrenci

Fırat Üniversitesi öğrencileri için mobil uyumlu yemekhane, yurt, bölüm duyuruları ve ulaşım rehberi.

## Neler var?

- En üstte üniversitenin öğle menüsü; gün değiştirme ve kalori bilgisi.
- Resmî GSB tesis listesindeki Elazığ KYK yurtlarının tamamı için seçim ve cihazda hatırlama.
- Önce fakülte/bölüm seçimi, isteğe bağlı ders adı veya kodu araması. Üniversite genel duyuruları ayrıca dahil edilebilir.
- Altışarlı duyuru kartları, konu filtresi, sayfalama ve siteden ayrılmadan içerik okuma. Duyuru ekleri ve kaynak bağlantıları ayrıca açılır.
- Favori hatlar ve bu cihazda sık görüntülenen hatlar önce; kampüs bağlantıları ve ada göre sıralama.
- Kaynak başına son başarılı kontrol ve erişim hatası. Hata sırasında önceki kayıtlar korunur.

## Otomatik güncelleme

`.github/workflows/scrape.yml` her saatin **07 ve 37. dakikasında** çalışır. GitHub Actions sunucuda verileri toplar, kayıtları depoya yazar ve GitHub Pages'i yayımlar; ziyaretçinin bilgisayarının veya sayfanın açık olması gerekmez. Açık sayfa da her 30 dakikada yeni JSON dosyalarını okur. "Şimdi kontrol et" yayımlanmış veriyi tekrar okur; sunucudaki toplayıcıyı tetiklemez.

GitHub zamanlayıcısı tam dakika garantisi vermez; yoğunlukta gecikmeler olabilir. Hiç etkinlik olmayan public depolarda 60 gün sonra zamanlanmış iş akışları devre dışı kalabilir. Son başarılı kontrol zamanları bu yüzden gösterilir. Kaynak: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule

Yayın ayarı: **Settings > Pages > Source: GitHub Actions**. İlk yayın ve kod güncellemeleri `deploy.yml`, veri güncellemeleri `scrape.yml` içindeki yayın işiyle yapılır. Her iki iş akışı aynı yayın kuyruğunu paylaşır.

## Veri kaynakları ve mevcut sınırlar

| Veri | Kaynak / durum |
| --- | --- |
| Üniversite menüsü | https://unievi.firat.edu.tr/tr — her 30 dakikada okunur. |
| Duyurular | Fırat ana sitesi, SKS, `fakulteler.json` ve fakültelerin kendi menülerinden keşfedilen bölüm siteleri. Her kaynağın son 12 duyurusu ve içerikleri yenilenir. Bölüm dizini günde bir keşfedilir. |
| Yurt listesi | https://kygm.gsb.gov.tr/Ajax/gettesis.aspx?il=elazig&plaka_kodu=23 — GSB'nin Elazığ KYK listesi. Özel yurtlar bu resmî listede yer almıyor. |
| Yurt menüleri | Yurt bazında doğrulanmış günlük kaynak henüz yok. Seçim çalışır; veri olmayan günlerde açıkça belirtilir. |
| Otobüs | https://elazigkart.elazig.bel.tr/wheremybus — güncel servis otomatik erişime 403 veriyor; başka sitelerde gömülmeyi de engelliyor. Mevcut 2020–2021 kayıtları sadece **arşiv güzergâhı** olarak gösterilir. Eski saatlerden sonraki sefer hesaplanmaz. Doğrulanmamış hat numarası uydurulmaz. |

Belediyeden kullanılabilir bir açık veri akışı veya yetkili API erişimi edinilince otobüsler aynı toplama işine bağlanabilir. Şehir genelindeki yolcu yoğunluğu verisi olmadığı için "sık kullanılan" sıralaması kullanıcının bu cihazdaki görüntülemelerine dayanır.

Ders adı/kodu filtresi başlık ve içerikte metin arar; üniversite yapısal ders etiketleri sağlamadığı için kesin ders kaydı eşleşmesi iddia edilmez. Bazı bölüm siteleri boş veya ulaşılamaz olabilir; arayüz bunu bildirir.

## Yurt menüsü ekleme

`data/kyk.json` içinde her yurdun GSB kimliği altında bağımsız menü saklanır. Kimlikler `data/yurtlar.json` içindedir. Doğrulanmış menüyü şu yapıda ekleyin:

```json
{
  "yurtlar": {
    "023129806": {
      "kaynak": "Yurdun gerçek menü bağlantısı",
      "guncelleme": "2026-11-06T08:00:00+03:00",
      "gunler": {
        "2026-11-06": {
          "kahvalti": ["Yurdun doğrulanmış kahvaltı yemekleri"],
          "aksam": ["Yurdun doğrulanmış akşam yemekleri"]
        }
      }
    }
  }
}
```

Bu örnek canlı menü değildir. Yurtlara özgü düzenli kaynak sağlandığında o kaynağın ayrıştırıcısı eklenmelidir. Eski `gunler` yapısı yalnızca önceki projenin Ahmet Kabaklı yurduyla uyumluluk için okunur; diğer yurtlara uygulanmaz.

## Yerelde çalıştırma

```sh
npm ci
npm test
npm run scrape
npm run build
npm run dev
```

Önizleme: http://127.0.0.1:4173 . Değişikliklerden sonra `npm run build` çalıştırıp sayfayı yenileyin. Yayın klasörü `dist` yalnızca site dosyalarını ve verileri içerir.

Testler: Türkiye saat dilimi ve gün geçişleri, fakülte/bölüm/ders filtreleri, HTML güvenliği, duyuru içeriği ve ekleri, yurt/bölüm ayrıştırma, favori/kullanım sıralaması.
