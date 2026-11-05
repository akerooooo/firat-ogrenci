import assert from 'node:assert/strict';
import { ayIndex, yilTahmin, tarihVer, parseOkulMenu, parseYeniDuyuru } from './scrape.mjs';

assert.equal(ayIndex('Kas'), 10);
assert.equal(ayIndex('Kasım'), 10);
assert.equal(ayIndex('Ağustos'), 7);
assert.equal(ayIndex('xyz'), -1);

const kasim = new Date(2026, 10, 6);
assert.equal(yilTahmin(10, 3, kasim), 2026);
assert.equal(yilTahmin(11, 28, kasim), 2025); // Aralık sonu, geçen yılın duyurusu
const ocak = new Date(2027, 0, 3);
assert.equal(yilTahmin(11, 30, ocak), 2026);

const menu = parseOkulMenu(`<section class="fm-panel"><div class="fm-heading"><small> 02 Kasım 2026 </small></div>
  <div class="fm-dish"><div class="fm-details"><small>Ana Yemek</small><strong>Etli Patates</strong></div><div class="fm-energy">250 <small>kcal</small></div></div></section>`);
assert.deepEqual(menu, { '2026-11-02': [{ tur: 'Ana Yemek', ad: 'Etli Patates', kcal: 250 }] });

const d = parseYeniDuyuru(`<div class="news-section-card"><a href="https://x/announcements-detail/1">
  <div class="news-section-card-right-title"><p>Başlık</p></div><div class="news-section-card-left-date"><p> Çar
  Kas
   4 </p></div></a></div>`);
assert.deepEqual(tarihVer(d, kasim), [{ baslik: 'Başlık', url: 'https://x/announcements-detail/1', tarih: '2026-11-04' }]);

// Eski sabit duyuru (küçük ID) listede başta olsa da geçen yıla düşer.
const liste = tarihVer([
  { url: 'a/49336', ay: 10, gun: 13 },
  { url: 'a/54342', ay: 10, gun: 5 },
  { url: 'a/54000', ay: 9, gun: 20 },
], kasim);
assert.deepEqual(liste.map((x) => x.tarih), ['2025-11-13', '2026-11-05', '2026-10-20']);

console.log('test ok');
