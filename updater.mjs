import * as cheerio from 'cheerio';
import { writeFileSync, renameSync, mkdirSync, unlinkSync } from 'node:fs';
import { getHtml, oku, parseAnaDuyuru, parseYeniDuyuru, parseOkulMenu, tarihVer } from './scrape.mjs';
import { updateExtras } from './extra-sources.mjs';

const clean = s => (s || '').replace(/\s+/g, ' ').trim();
const save = (path, value) => {
  const body = JSON.stringify(value, null, 1) + '\n';
  writeFileSync(`${path}.tmp`, body);
  try { renameSync(`${path}.tmp`, path); }
  catch (error) {
    // OneDrive can temporarily lock replacement renames on Windows.
    if (process.platform !== 'win32' || !['EPERM', 'EACCES'].includes(error.code)) throw error;
    writeFileSync(path, body); unlinkSync(`${path}.tmp`);
  }
};
export const YURT_KAYNAK = 'https://kygm.gsb.gov.tr/Ajax/gettesis.aspx?il=elazig&plaka_kodu=23';
export const BUS_KAYNAK = 'https://elazigkart.elazig.bel.tr/wheremybus';

export async function pool(items, concurrency, task) {
  const result = new Array(items.length); let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) { const i = next++; result[i] = await task(items[i], i); }
  }));
  return result;
}

export function safeUrl(value, base) {
  try { const u = new URL(value, base); return /^https?:$/.test(u.protocol) ? u.href : null; } catch { return null; }
}

// Only a small, explicit HTML vocabulary reaches the local reader.
export function sanitize(html, base) {
  const $ = cheerio.load(html, null, false);
  $('script,style,iframe,object,embed,form,input,button,svg,math,link,meta').remove();
  const tags = new Set('p br div span strong b em i u s ul ol li h2 h3 h4 table thead tbody tr td th blockquote a img hr'.split(' '));
  $('*').each((_, e) => {
    const el = $(e), tag = e.tagName;
    if (!tags.has(tag)) { el.replaceWith(el.contents()); return; }
    const href = el.attr('href'), src = el.attr('src'), alt = el.attr('alt');
    for (const key of Object.keys(e.attribs || {})) el.removeAttr(key);
    if (tag === 'a' && href && safeUrl(href, base)) el.attr({ href: safeUrl(href, base), target: '_blank', rel: 'noopener noreferrer' });
    if (tag === 'img') {
      if (!src || !safeUrl(src, base)) { el.remove(); return; }
      el.attr({ src: safeUrl(src, base), alt: alt || 'Duyuru görseli', loading: 'lazy' });
    }
  });
  return $.html();
}

export function parseDetail(html, url) {
  const $ = cheerio.load(html);
  let root = $('.index-content-info').first();
  const modern = root.length > 0;
  if (!modern) root = $('article.post .entry-wrapper').first();
  if (!root.length) throw new Error('Duyuru içerik alanı bulunamadı');
  const dateText = clean(root.find('.new-section-detail-date, .item-meta').text());
  const match = dateText.match(/(\d{1,2})\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*(20\d{2})/);
  const title = clean(root.find('.new-section-detail-title, .post-content h2.title').text());
  root.find('iframe[src],embed[src],object[data]').each((_, node) => {
    const urlValue = $(node).attr('src') || $(node).attr('data');
    const link = safeUrl(urlValue, url);
    if (link) $(node).replaceWith($('<a>').attr('href', link).text('Duyurunun ek belgesini görüntüle'));
  });
  root.find('.new-section-detail-date,.new-section-detail-title,.social-list,.content-pad,h2.title').remove();
  const content = sanitize(root.html() || '', url);
  const plain = clean(cheerio.load(content).text());
  if (!plain && !/<img\b/.test(content)) throw new Error('Duyuru içeriği boş');
  const result = { icerik: content, ozet: plain.slice(0, 200), icerikGuncelleme: new Date().toISOString() };
  if (title) result.baslik = title;
  if (match) result.tarih = `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  return result;
}

export function discoverDepartments(html, faculty) {
  const $ = cheerio.load(html), out = new Map();
  $('a').filter((_, a) => /^bölümler/i.test(clean($(a).text()).toLocaleLowerCase('tr'))).each((_, a) => {
    $(a).parent().find('a[href]').each((_, child) => {
      const url = safeUrl(clean($(child).attr('href')), faculty.url);
      if (!url) return;
      const u = new URL(url), ad = clean($(child).text());
      if (!u.hostname.endsWith('.firat.edu.tr') || !/^\/?$/.test(u.pathname) || u.hostname === new URL(faculty.url).hostname || ad.length < 3) return;
      const id = u.hostname.split('.')[0];
      out.set(id, { id, ad, fakulte: faculty.id, tur: 'bolum', url: `${u.origin}/announcements-all` });
    });
  });
  return [...out.values()];
}

export function parseDorms(html) {
  const $ = cheerio.load(html);
  return $('.tesisler .border').map((_, node) => {
    const el = $(node), ad = clean(el.find('.style1').first().text());
    const id = el.find('a[href*="tesispopac"]').attr('href')?.match(/'(\d+),/)?.[1];
    if (!id || !ad) return null;
    return { id, ad: ad.toLocaleLowerCase('tr').replace(/(^|[\s-])\S/g, s => s.toLocaleUpperCase('tr')), kaynak: YURT_KAYNAK };
  }).get();
}

export const KC_KAYNAK = 'https://kampuscepte.com.tr/veri.js';

// KampüsCepte (GitHub Pages) Üniversite Evi menüsünü veri.js içinde `uniEviMenuleri = { "YYYY-MM-DD": [..] }` olarak tutuyor.
// Fırat sunucuları bulut IP'lerini kestiği için GitHub Actions'ta yedek kaynak budur. Kalori/tür bilgisi yok.
export function parseKampusCepte(js) {
  const start = js.indexOf('{', js.indexOf('uniEviMenuleri'));
  const end = js.indexOf('}', start);
  if (js.indexOf('uniEviMenuleri') < 0 || start < 0 || end < 0) throw new Error('uniEviMenuleri bulunamadı');
  // Dosya elle düzenleniyor: satır başı // yorumlarını ve sondaki virgülleri tolere et.
  const raw = JSON.parse(js.slice(start, end + 1).replace(/^\s*\/\/.*$/gm, '').replace(/,(\s*[\]}])/g, '$1'));
  const gunler = {};
  for (const [gun, yemekler] of Object.entries(raw)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(gun) || !Array.isArray(yemekler)) continue;
    const list = yemekler.filter(x => typeof x === 'string' && clean(x)).map(x => ({ tur: '', ad: clean(x), kcal: null, kaynak: 'KampüsCepte' }));
    if (list.length) gunler[gun] = list;
  }
  return gunler;
}

export async function update() {
  mkdirSync('data', { recursive: true });
  const now = new Date().toISOString();
  const status = oku('data/durum.json', { kaynaklar: {} });
  const reports = { ...status.kaynaklar };
  let successes = 0, failures = 0;
  const report = (id, ok, error) => {
    reports[id] = { ...reports[id], sonDeneme: now, durum: ok ? 'ok' : 'hata', hata: error || null };
    if (ok) { reports[id].sonBasari = now; successes++; } else failures++;
  };
  await Promise.all([
    (async () => {
      try {
        const gunler = parseOkulMenu(await getHtml('https://unievi.firat.edu.tr/tr'));
        if (!Object.keys(gunler).length) throw new Error('Menü boş');
        save('data/okul.json', { guncelleme: now, kaynak: 'https://unievi.firat.edu.tr/tr', gunler }); report('okul', true);
      } catch (e) {
        try {
          const yedek = parseKampusCepte(await getHtml(KC_KAYNAK));
          if (!Object.keys(yedek).length) throw new Error('KampüsCepte menüsü boş');
          // Resmî kaynaktan gelmiş günler (kalorili) korunur; yalnızca eksik günler yedekten eklenir.
          const eski = oku('data/okul.json', {}).gunler || {};
          save('data/okul.json', { guncelleme: now, kaynak: KC_KAYNAK, gunler: { ...yedek, ...eski } });
          report('okul', true);
          reports.okul.hata = `Resmî site erişilemedi (${e.message}); eksik günler KampüsCepte'den alındı.`;
        } catch (e2) { report('okul', false, `${e.message} · Yedek: ${e2.message}`); }
      }
    })(),
    (async () => {
      try {
        const yurtlar = parseDorms(await getHtml(YURT_KAYNAK));
        if (!yurtlar.length) throw new Error('Yurt listesi boş');
        save('data/yurtlar.json', { guncelleme: now, kaynak: YURT_KAYNAK, yurtlar }); report('yurtlar', true);
      } catch (e) { report('yurtlar', false, e.message); }
    })(),
  ]);
  await updateExtras({ getHtml, read: oku, save, report, pool, now, lastTransitAttempt: reports.otobus?.sonDeneme });
  save('data/durum.json', { sonDeneme: now, kaynaklar: Object.fromEntries(Object.entries(reports).filter(([id]) => ['okul','kyk','otobus','yurtlar'].includes(id))) });
  console.log(`Başarılı: ${successes}, başarısız: ${failures}`);
  if (!successes) process.exitCode = 1;
}
