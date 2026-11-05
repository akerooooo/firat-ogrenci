// Okul menüsünü ve duyuruları çekip data/*.json dosyalarına yazar.
// Bir kaynak hata verirse o kaynağın eski verisi korunur.
import * as cheerio from 'cheerio';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const AYLAR = ['oca', 'şub', 'mar', 'nis', 'may', 'haz', 'tem', 'ağu', 'eyl', 'eki', 'kas', 'ara'];
const pad = (n) => String(n).padStart(2, '0');
const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const temiz = (s) => s.replace(/\s+/g, ' ').trim();

// "Kas", "Kasım" -> 10. Bilinmiyorsa -1.
export function ayIndex(s) {
  return AYLAR.indexOf(s.toLocaleLowerCase('tr').slice(0, 3));
}

// Sitelerde yıl yok: tarih bugünden 7 günden fazla ileri düşüyorsa geçen yıldır.
export function yilTahmin(m, d, now = new Date()) {
  const y = now.getFullYear();
  return new Date(y, m, d) - now > 7 * 864e5 ? y - 1 : y;
}

// Listelerde eski sabit duyurular da var. Duyuru ID'si zamanla artar:
// yeniden eskiye giderken tarih bir öncekinden ileri düşüyorsa yılı bir azalt.
export function tarihVer(items, now = new Date()) {
  const id = (x) => parseInt(x.url.match(/(\d+)\/?$/)?.[1] || '0', 10);
  let onceki = null;
  for (const x of [...items].sort((a, b) => id(b) - id(a))) {
    const { ay: m, gun: d } = x;
    delete x.ay; delete x.gun;
    if (m < 0 || !d) { x.tarih = null; continue; }
    let t = new Date(yilTahmin(m, d, now), m, d);
    while (onceki && t > onceki) t = new Date(t.getFullYear() - 1, m, d);
    onceki = t;
    x.tarih = iso(t.getFullYear(), m, d);
  }
  return items;
}

export async function getHtml(url) {
  let r;
  try { r = await fetch(url, { headers: { 'user-agent': 'firat-ogrenci-sayfasi' }, signal: AbortSignal.timeout(15000) }); }
  catch (error) { throw new Error(`${new URL(url).hostname}: ${error.cause?.code || error.name} · ${error.cause?.message || error.message}`, { cause: error }); }
  if (!r.ok) throw new Error(`${url} -> HTTP ${r.status}`);
  return r.text();
}

export function parseOkulMenu(html) {
  const $ = cheerio.load(html);
  const gunler = {};
  $('.fm-panel').each((_, p) => {
    const [d, ay, y] = temiz($(p).find('.fm-heading small').first().text()).split(' ');
    const m = ayIndex(ay || '');
    if (m < 0) return;
    gunler[iso(+y, m, +d)] = $(p).find('.fm-dish').map((_, x) => ({
      tur: temiz($(x).find('.fm-details small').first().text()),
      ad: temiz($(x).find('.fm-details strong').first().text()),
      kcal: parseInt($(x).find('.fm-energy').text(), 10) || null,
    })).get();
  });
  return gunler;
}

// Ana site (www.firat.edu.tr) eski şablon.
export function parseAnaDuyuru(html) {
  const $ = cheerio.load(html);
  return $('.blog-item').map((_, x) => {
    const a = $(x).find('h3.title a').first();
    const m = ayIndex(temiz($(x).find('.date-block .month').text()));
    const d = parseInt($(x).find('.date-block .day').text(), 10);
    return { baslik: temiz(a.text()), url: a.attr('href'), ay: m, gun: d };
  }).get().filter((x) => x.baslik && x.url);
}

// SKS ve fakülte siteleri yeni şablon. Tarih "Çar Kas 4".
export function parseYeniDuyuru(html) {
  const $ = cheerio.load(html);
  const gorulen = new Set();
  // Kart div'leri bozuk HTML yüzünden iç içe ayrışıyor; her kartın kendi linki üzerinden git.
  return $('a[href*="announcements-detail/"]').filter((_, a) => $(a).find('.news-section-card-right-title').length).map((_, x) => {
    const url = $(x).attr('href');
    const [, ay, gun] = temiz($(x).find('.news-section-card-left-date').text()).split(' ');
    return { baslik: temiz($(x).find('.news-section-card-right-title').text()), url, ay: ayIndex(ay || ''), gun: parseInt(gun, 10) };
  }).get().filter((x) => x.baslik && x.url && !gorulen.has(x.url) && gorulen.add(x.url));
}

export function oku(path, varsayilan) {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return varsayilan; }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  import('./updater.mjs').then(({ update }) => update()).catch(error => {
    console.error(error); process.exitCode = 1;
  });
}
