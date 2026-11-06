/**
 * Google Apps Script erişim testi.
 * Yalnızca aşağıdaki üç herkese açık üniversite adresini okur.
 * Drive, Gmail, dosyalar, GitHub anahtarları veya ücretli hizmet kullanmaz.
 * Editörde erisimTesti işlevini çalıştır; sonucu yürütme günlüğünden oku.
 */
function erisimTesti() {
  const kaynaklar = [
    { ad: 'Üniversite duyuruları', url: 'https://www.firat.edu.tr/tr/page/announcement', isaret: /announcement|duyuru/i },
    { ad: 'Üniversite yemek menüsü', url: 'https://unievi.firat.edu.tr/tr', isaret: /fm-panel/ },
    { ad: 'Bilgisayar Mühendisliği duyuruları', url: 'https://bilgisayarmf.firat.edu.tr/announcements-all', isaret: /announcements-detail/ }
  ];
  const sonuclar = kaynaklar.map(function (kaynak) {
    const baslangic = Date.now();
    try {
      const yanit = UrlFetchApp.fetch(kaynak.url, {
        method: 'get',
        followRedirects: true,
        validateHttpsCertificates: true,
        muteHttpExceptions: true
      });
      const kod = yanit.getResponseCode();
      const html = yanit.getContentText();
      return { kaynak: kaynak.ad, adres: kaynak.url, http: kod,
        beklenenIcerikVar: kod === 200 && kaynak.isaret.test(html),
        karakter: html.length, sureMs: Date.now() - baslangic };
    } catch (hata) {
      return { kaynak: kaynak.ad, adres: kaynak.url, hata: String(hata.message || hata), sureMs: Date.now() - baslangic };
    }
  });
  console.log(JSON.stringify({ zaman: new Date().toISOString(), sonuclar: sonuclar }, null, 2));
  return sonuclar;
}
