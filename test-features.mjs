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
console.log('Özellik testleri başarılı: Türkiye saati, filtreler, güvenli okuyucu, bölüm/yurt ayrıştırma, hat sıralaması.');
