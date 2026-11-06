# Google bulutundan erişim testi

**Sonuç (2026-11-06):** Test çalıştırıldı. Üç adresin üçü de yaklaşık 50 sn sonra "Adres kullanılamıyor" hatası verdi. Google bulutu da Fırat sunucularına ulaşamıyor; güncellemeler Google'a taşınmayacak. Cloudflare Workers (İstanbul noktası dahil, 522) da aynı sonucu verdi.

`google-access-test.gs` yalnızca üç sabit, herkese açık üniversite sayfasını okur ve HTTP durumunu, beklenen içerik işaretlerini ve süreyi günlüğe yazar. Google Drive/Gmail erişimi, GitHub anahtarı, herkese açık uygulama yayını veya ücretli hizmet gerekmez. Apps Script'in dış bağlantı izni gerekir.

Google hesabıyla Apps Script'te yeni bir proje açıp kodu `Code.gs` içine koyarak `erisimTesti` çalıştırılır. İzin ekranındaki kapsam kontrol edildikten sonra sonuç yürütme günlüğünden alınır. Google'dan erişim doğrulanmadan üretim güncellemesi bu hizmete taşınmamalıdır.

Önceki bağlantı testleri: yerel bağlantıdan üç sayfa HTTP 200; GitHub standart Linux, Windows, ARM Linux ve macOS bulutlarından aynı üç sayfada bağlantı zaman aşımı. Bu sonuç tek başına kasıtlı bir IP engelini kanıtlamaz.
