# Fırat Öğrenci

Varsayılan koyu turuncu tema; kalıcı açık/koyu tema seçimi, mobil düzen, Elazığ geneli KYK menüsü, bölüm/ders filtreleri ve site içinde duyuru okuma.

## Kaynaklar

- Üniversite menüsü: https://unievi.firat.edu.tr/tr
- Duyurular: Fırat Üniversitesi, SKS, fakülte ve bölüm sayfaları.
- Yurt listesi: GSB Elazığ tesis listesi; 7 KYK yurdu.
- Yurt menüleri: https://www.kykyurtmenu.com/elazig/arsiv/kasim-2026 — ay bağlantısı otomatik hesaplanır. Elazığ geneli menü, yurt seçimi gerektirmeden açık etiketle gösterilir. Bu kaynak resmî GSB kaynağı değildir; öğün yayımlanmamışsa boş durum gösterilir.
- Otobüs numaraları, güzergâhlar ve hafta içi/Cumartesi/Pazar tarifeleri: https://elazigulasim.com/hatlar/ . Tahmini seferler alınmaz; yalnızca kayıtlı başlangıç durağı kalkışları gösterilir. Canlı araç takibi değildir. Resmî kontrol: https://elazigkart.elazig.bel.tr/wheremybus

## Güncelleme

GitHub Actions her saatin 07 ve 37. dakikasında kaynakları kontrol edip siteyi yayımlar. GitHub zamanlamasında gecikmeler olabilir. Açık sayfa 30 dakikada bir kayıtları tekrar okur. Elle yenileme düğmesi yoktur.

Üniversite kaynaklarına yerelden erişiliyor; GitHub sunucusundaki ilk denemede erişim başarısız oldu. Bu nedenle üniversite duyuruları/menüsü için kesintisiz otomatik tazelik henüz doğrulanmış değildir. Hatalarda kayıtlar korunur, kaynak başına son başarı ve hata durumu `data/durum.json` içinde ve arayüzde gösterilir. Yurt/ulaşım kaynakları da aynı zamanlayıcıya dahildir.


## Geliştirme

```sh
npm ci
npm test
npm run scrape
npm run build
npm run dev
```

Önizleme: http://127.0.0.1:4173 . Yayın klasörü `dist`; değişiklikten sonra yeniden build gerekir. Yayın ayarı GitHub Pages → GitHub Actions. Tasarım ve script dosyaları sürüm özetiyle yüklenerek eski önbellek karışması önlenir.
