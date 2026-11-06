import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { shouldUpdateTransit, dormArchiveUrl } from './extra-sources.mjs';
assert.match(dormArchiveUrl(new Date('2026-11-30T21:01:00Z')), /aralik-2026$/);
assert.equal(shouldUpdateTransit('2026-11-05T22:00:00Z', '2026-11-06T20:59:59Z'), false);
assert.equal(shouldUpdateTransit('2026-11-06T20:59:59Z', '2026-11-06T21:00:00Z'), true);
assert.equal(shouldUpdateTransit(undefined, '2026-11-06T10:00:00Z'), true);
import { sanitize, parseDetail, parseDorms, discoverDepartments, pool } from './updater.mjs';
import { safeExternalUrl, turkeyDay, shiftDay, filterAnnouncements, sortRoutes, routeKey, fold } from './model.mjs';

for (const url of ['javascript:alert(1)', 'data:text/html,bad', 'https://user:password@example.com', '//example.com', null]) assert.equal(safeExternalUrl(url), '#');
assert.equal(safeExternalUrl('https://example.com/menu'), 'https://example.com/menu');
const malicious = sanitize('<svg onload="bad()"><script>bad()</script></svg><math><mtext><img src="x" onerror="bad()"></mtext></math><a href="data:text/html,bad">x</a><p style="color:red" id="guncelleme">Safe</p>', 'https://example.com');
assert.ok(!/onload|onerror|<svg|<math|<script|data:text|style=|id=/.test(malicious));

assert.equal(turkeyDay(new Date('2026-11-05T22:15:00Z')), '2026-11-06');
assert.equal(shiftDay('2026-12-31', 1), '2027-01-01');
assert.equal(shiftDay('2028-03-01', -1), '2028-02-29');
assert.equal(fold('ÇAYDAÇIRA'), 'caydacira');
const cleaned = sanitize('<script>alert(1)</script><p onclick="bad()">Duyuru<img src="/a.png" onerror="bad()"><a href="javascript:alert(1)">Kötü</a><a href="/file/1">Ek</a></p>', 'https://test.firat.edu.tr/a');
assert.ok(!/script|onclick|onerror|javascript/.test(cleaned));
assert.ok(cleaned.includes('https://test.firat.edu.tr/a.png'));
assert.ok(cleaned.includes('https://test.firat.edu.tr/file/1'));
const detail = parseDetail('<div class="index-content-info"><div class="new-section-detail-title">Sınav</div><div class="new-section-detail-date">4 . 11 . 2026</div><p>Matematik sınavı</p><iframe src="/exam.pdf"></iframe></div><aside>İlgisiz</aside>', 'https://test.firat.edu.tr/a');
assert.equal(detail.tarih, '2026-11-04'); assert.ok(detail.icerik.includes('exam.pdf')); assert.ok(!detail.icerik.includes('İlgisiz'));
assert.throws(() => parseDetail('<html>hata sayfası</html>', 'https://test.firat.edu.tr'), /bulunamadı/);
const departments = discoverDepartments('<li><a>Bölümlerimiz</a><ul><li><a href="https://bilgisayarmf.firat.edu.tr/">Bilgisayar</a></li><li><a href="https://fake.example/">Harici</a></li></ul></li>', {id:'muhendislikf',url:'https://muhendislikf.firat.edu.tr'});
assert.equal(departments.length, 1); assert.equal(departments[0].fakulte, 'muhendislikf');
assert.equal(parseDorms('<div class="tesisler"><div class="border"><span class="style1">HARPUT ÖĞRENCİ YURDU</span><a href="javascript:tesispopac(\'023129803,elazig\')"></a></div></div>')[0].id, '023129803');
const sources = [{id:'faculty'}, {id:'computer',fakulte:'faculty'}, {id:'electric',fakulte:'faculty'}];
const items = [
 {kaynak:'faculty',baslik:'ODEK sınavı',tarih:'2026-11-01'},
 {kaynak:'computer',baslik:'MATEMATİK sınavı',tarih:'2026-11-05'},
 {kaynak:'electric',baslik:'Fizik dersi',tarih:'2026-11-04'},
 {kaynak:'genel',baslik:'Genel toplantı',tarih:'2026-11-06'},
];
assert.equal(filterAnnouncements(items,sources,{}).length,0);
assert.equal(filterAnnouncements(items,sources,{kaynak:'faculty',bolum:'computer'}).length,2);
assert.equal(filterAnnouncements(items,sources,{kaynak:'faculty'}).length,3);
assert.equal(filterAnnouncements(items,sources,{kaynak:'faculty',genelDahil:true}).length,4);
assert.equal(filterAnnouncements(items,sources,{kaynak:'faculty',ders:'matematik',konu:'sinav'})[0].kaynak,'computer');
assert.equal(filterAnnouncements(items,sources,{kaynak:'faculty',ders:'bulunmayan'}).length,0);
const routes = [{ad:'Üniversite'},{ad:'Zafran'},{ad:'Abdullahpaşa'}];
assert.equal(sortRoutes(routes,{visits:{[routeKey(routes[1])]:3}})[0].ad,'Zafran');
assert.equal(sortRoutes(routes,{favorites:[routeKey(routes[2])],visits:{[routeKey(routes[1])]:3}})[0].ad,'Abdullahpaşa');
assert.deepEqual(await pool([1,2,3],2,async x=>x*2),[2,4,6]);
const current = JSON.parse(readFileSync('data/duyurular.json','utf8'));
assert.ok(current.items.length > 0);
assert.ok(current.items.every(x => x.baslik && x.url && x.kaynak));
// KYK gün sayfası: Next.js verisindeki seçmeli yemekler (kaçışlı JSON).
const { parseDormDetail, fillDormDetails } = await import('./extra-sources.mjs');
const flight = String.raw`x{\"id\":1,\"date\":\"2026-11-06\",\"mealType\":1,\"cityId\":23,\"first\":\"Mercimek Çorba / Ayran Aşı Çorba\",\"firstCalories\":\"140 / 150\",\"second\":\"Orman Kebap / Ispanak Yemeği / Şinitzel\",\"third\":\"Nohutlu Pirinç Pilavı\",\"fourth\":\"Cacık\",\"totalCalories\":870}y`;
assert.deepEqual(parseDormDetail(flight, '2026-11-06', 'aksam'), [
  { ad: 'Mercimek Çorba / Ayran Aşı Çorba', kcal: '140 / 150' }, { ad: 'Orman Kebap / Ispanak Yemeği / Şinitzel', kcal: null },
  { ad: 'Nohutlu Pirinç Pilavı', kcal: null }, { ad: 'Cacık', kcal: null }]);
// kykyemekliste virgülle ayırır.
assert.equal(parseDormDetail(String.raw`{\"date\":\"2026-11-06\",\"mealType\":0,\"first\":\"Yumurta\",\"firstCalories\":\"70,80\"}`, '2026-11-06', 'kahvalti')[0].kcal, '70 / 80');
assert.equal(parseDormDetail(flight, '2026-11-06', 'kahvalti'), null);
// Pencere içi ve özeti değişen gün çekilir; özeti aynı gün önceki tam listeyi korur; pencere dışı gün çekilmez.
const fetched = [];
const days = await fillDormDetails({
  now: '2026-11-06T09:00:00Z', pool,
  prev: { '2026-11-07': { aksam: [{ ad: 'Şehriye Çorba / Yayla Çorba', kcal: '120' }], ozet: { aksam: 'Şehriye Çorba' } } },
  gunler: { '2026-11-06': { aksam: ['Mercimek Çorba'] }, '2026-11-07': { aksam: ['Şehriye Çorba'] }, '2026-11-20': { aksam: ['Tarhana Çorba'] } },
  fetchDetail: async (date, meal) => { fetched.push(`${date}/${meal}`); return ['Mercimek Çorba / Ayran Aşı Çorba']; },
});
assert.deepEqual(fetched, ['2026-11-06/aksam']);
assert.deepEqual(days['2026-11-06'].aksam, ['Mercimek Çorba / Ayran Aşı Çorba']);
assert.deepEqual(days['2026-11-07'].aksam, [{ ad: 'Şehriye Çorba / Yayla Çorba', kcal: '120' }]);
assert.deepEqual(days['2026-11-20'].aksam, ['Tarhana Çorba']);
// KYK yedekleri: aylık sayfa, KampüsCepte metni ve doldurma sırası.
const { parseMonthPage, parseKampusCepteKyk, fillFromBackups } = await import('./extra-sources.mjs');
const month = flight + String.raw`{\"id\":2,\"date\":\"2026-11-07\",\"mealType\":1,\"cityId\":23,\"first\":\"Şehriye Çorba\",\"second\":\"Tavuk Fajita\",\"third\":\"Fırın Makarna\",\"fourth\":\"Browni\"}`;
assert.deepEqual(Object.keys(parseMonthPage(month, 'aksam')), ['2026-11-06', '2026-11-07']);
assert.deepEqual(parseMonthPage(month, 'kahvalti'), {});
const kcJs = `const uniEviMenuleri = { "2026-11-02": ["X"] };
const kykAnaMenu = {
  kahvaltiNotu: "Al götür",
  "2026-11-12": { kahvalti: ["Haşlanmış yumurta", "Çay"],
                  aksam: ["Mercimek çorbası / Yayla çorbası", "Tavuk \\"şiş\\""] },
};
const kykOzelAralik = { "ahmet-kabakli": ["2026-11-08", "2026-11-20"] };`;
assert.deepEqual(parseKampusCepteKyk(kcJs), { '2026-11-12': { kahvalti: ['Haşlanmış yumurta', 'Çay'], aksam: ['Mercimek çorbası / Yayla çorbası', 'Tavuk "şiş"'] } });
assert.throws(() => parseKampusCepteKyk('const a = 1;'));
const filled = fillFromBackups(
  { '2026-11-12': { kahvalti: ['Ana kaynak'], aksam: [] } },
  [{ ad: 'B1', days: { '2026-11-13': { kahvalti: ['b1'] } } }, { ad: 'B2', days: { '2026-11-12': { kahvalti: ['b2'], aksam: ['b2 akşam'] }, '2026-11-13': { kahvalti: ['b2'], aksam: ['b2 a'] } } }]);
assert.deepEqual(filled, {
  '2026-11-12': { kahvalti: ['Ana kaynak'], aksam: ['b2 akşam'], kaynaklar: { aksam: 'B2' } },
  '2026-11-13': { kahvalti: ['b1'], aksam: ['b2 a'], kaynaklar: { kahvalti: 'B1', aksam: 'B2' } },
});
// Kalorisiz ana liste kalorili yedekle değişir; kalorili ana liste korunur; kalorisiz yedek kalorisiz listeye dokunmaz.
const upgraded = fillFromBackups(
  { a: { aksam: ['Mercimek Çorba'] }, b: { aksam: [{ ad: 'Ana', kcal: '100' }] }, c: { aksam: ['Düz'] } },
  [{ ad: 'KEL', days: { a: { aksam: [{ ad: 'Mercimek Çorba / Yayla', kcal: '140 / 118' }] }, b: { aksam: [{ ad: 'Yedek', kcal: '1' }] } } },
   { ad: 'KC', days: { c: { aksam: ['Düz yedek'] } } }]);
assert.deepEqual(upgraded.a, { aksam: [{ ad: 'Mercimek Çorba / Yayla', kcal: '140 / 118' }], kaynaklar: { aksam: 'KEL' } });
assert.deepEqual(upgraded.b, { aksam: [{ ad: 'Ana', kcal: '100' }] });
assert.deepEqual(upgraded.c, { aksam: ['Düz'] });
console.log('Özellik testleri başarılı: Türkiye saati, filtreler, güvenli okuyucu, bölüm/yurt ayrıştırma, hat sıralaması, KYK seçmeli yemekler, yedek kaynaklar ve kaloriler.');
