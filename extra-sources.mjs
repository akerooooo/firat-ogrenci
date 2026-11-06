import * as cheerio from 'cheerio';
const clean = s => (s || '').replace(/\s+/g, ' ').trim();
export const TRANSIT_SOURCE = 'https://elazigulasim.com/hatlar/';
const MONTHS = ['ocak','subat','mart','nisan','mayis','haziran','temmuz','agustos','eylul','ekim','kasim','aralik'];
export function dormArchiveUrl(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/Istanbul',year:'numeric',month:'numeric'}).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `https://www.kykyurtmenu.com/elazig/arsiv/${MONTHS[Number(values.month)-1]}-${values.year}`;
}
export function parseDormMenu(html) {
  const $ = cheerio.load(html), days = {};
  $('a[href*="?date="]').each((_, a) => {
    const date = $(a).attr('href').match(/date=(\d{4}-\d{2}-\d{2})/)?.[1];
    if (!date) return;
    const card = $(a).parent().parent();
    const meals = {};
    card.find('p').each((_, p) => {
      const label = clean($(p).text());
      const key = label.includes('Kahvaltı') ? 'kahvalti' : label.includes('Akşam') ? 'aksam' : null;
      if (!key) return;
      meals[key] = $(p).parent().find('li').map((_, li) => clean($(li).text())).get().filter(x => x && !/veri yok|menü yok/i.test(x));
    });
    if (meals.kahvalti?.length || meals.aksam?.length) days[date] = meals;
  });
  return days;
}
// Arşiv her yemek sırasının yalnızca ilk seçeneğini gösterir; gün sayfasındaki Next.js verisinde
// "first":"Orman Kebap / Ispanak Yemeği / Şinitzel" gibi tam hâli vardır.
export const dormDetailUrl = (date, meal) => `https://www.kykyurtmenu.com/elazig/${meal}?date=${date}`;
export function parseDormDetail(html, date, meal) {
  const i = html.indexOf(`\\"date\\":\\"${date}\\",\\"mealType\\":${meal === 'kahvalti' ? 0 : 1},`);
  if (i < 0) return null;
  try {
    const item = JSON.parse(html.slice(html.lastIndexOf('{', i), html.indexOf('}', i) + 1).replace(/\\"/g, '"'));
    // Kalori seçenek başına gelir: "140 / 150" (kykyurtmenu) ya da "140,150" (kykyemekliste).
    const list = ['first', 'second', 'third', 'fourth'].map(k => ({ ad: clean(item[k]), kcal: clean(String(item[`${k}Calories`] ?? '')).split(/\s*[\/,]\s*/).filter(Boolean).join(' / ') || null })).filter(x => x.ad);
    return list.length ? list : null;
  } catch { return null; }
}

// Detay yalnızca bugünden itibaren 7 gün için ve arşivdeki özet değiştiyse çekilir; aksi hâlde önceki tam liste korunur.
export async function fillDormDetails({ gunler, prev = {}, now, fetchDetail, pool }) {
  const day = d => d.toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
  const start = day(new Date(now)), end = day(new Date(Date.parse(now) + 6 * 864e5));
  const jobs = [];
  for (const [date, meals] of Object.entries(gunler)) {
    meals.ozet = {};
    for (const meal of ['kahvalti', 'aksam']) {
      if (!meals[meal]?.length) continue;
      const ozet = meals[meal].join(' | '), old = prev[date];
      meals.ozet[meal] = ozet;
      if (old?.ozet?.[meal] === ozet && old[meal]?.some?.(x => x?.kcal)) meals[meal] = old[meal];
      else if (date >= start && date <= end) jobs.push({ date, meal, meals });
    }
  }
  await pool(jobs, 3, async ({ date, meal, meals }) => {
    try { const full = await fetchDetail(date, meal); if (full) meals[meal] = full; }
    catch { meals.ozet[meal] = null; } // Sonraki çalışmada tekrar denensin.
  });
  return gunler;
}
export function parseRoutes(html) {
  const $ = cheerio.load(html), seen = new Set();
  return $('a[href^="/hat/"]').map((_, a) => {
    const href = $(a).attr('href'), numara = clean($(a).find('.route-number').text());
    const ad = clean($(a).find('.route-info strong').text());
    if (!numara || !ad || seen.has(href)) return null;
    seen.add(href);
    return { numara, ad, url: new URL(href, TRANSIT_SOURCE).href, kaynakAdi: 'Elazığ Ulaşım', numaraDogrulandi: true };
  }).get();
}
export function parseSchedule(html) {
  const $ = cheerio.load(html), columns = $('.schedule-columns').children('div');
  if (!columns.length) throw new Error('Sefer tablosu bulunamadı');
  const result = {};
  ['gidis', 'donus'].forEach((key, i) => {
    const col = columns.eq(i);
    const times = col.find('.time-grid time').filter((_, time) => !$(time).closest('.estimated').length).map((_, time) => $(time).attr('datetime') || clean($(time).text())).get().filter(x => /^([01]\d|2[0-3]):[0-5]\d$/.test(x));
    result[key] = { durak: clean(col.find('h3').text()).replace(/^(Gidiş|Dönüş)\s*·\s*/, ''), saatler: [...new Set(times)].sort() };
  });
  result.gidisDuraklar = $('.stop-timeline').first().find('a').map((_, a) => clean($(a).text())).get();
  result.donusDuraklar = $('.stop-timeline.return-line').find('a').map((_, a) => clean($(a).text())).get();
  result.gunLinkleri = $('a[href]').filter((_, a) => ['Hafta içi','Cumartesi','Pazar'].includes(clean($(a).text()))).map((_, a) => $(a).attr('href')).get();
  return result;
}
export function shouldUpdateTransit(lastAttempt, now) {
  const day = value => new Date(value).toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
  return !lastAttempt || !Number.isFinite(Date.parse(lastAttempt)) || day(lastAttempt) !== day(now);
}
// Yedek 1: kykyemekliste.com bir öğünün bütün ayını tek sayfada, aynı Next.js biçiminde verir.
export const KEL_URL = meal => `https://kykyemekliste.com/elazig/${meal}`;
export function parseMonthPage(html, meal) {
  const days = {}, re = new RegExp(String.raw`\\"date\\":\\"(\d{4}-\d{2}-\d{2})\\",\\"mealType\\":${meal === 'kahvalti' ? 0 : 1},`, 'g');
  for (const [, date] of html.matchAll(re)) days[date] ??= parseDormDetail(html, date, meal);
  return Object.fromEntries(Object.entries(days).filter(([, v]) => v));
}
// Yedek 2: KampüsCepte veri.js içindeki elle girilen kykAnaMenu. JS nesnesi olduğu için çalıştırılmaz, metinden okunur.
export const KC_KYK_URL = 'https://kampuscepte.com.tr/veri.js';
export function parseKampusCepteKyk(js) {
  const start = js.indexOf('kykAnaMenu'), end = js.indexOf('kykOzelAralik', start);
  if (start < 0) throw new Error('kykAnaMenu bulunamadı');
  const strings = s => [...s.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map(m => clean(JSON.parse(`"${m[1]}"`))).filter(Boolean);
  const days = {};
  for (const m of js.slice(start, end < 0 ? undefined : end).matchAll(/"(\d{4}-\d{2}-\d{2})":\s*\{\s*kahvalti:\s*\[([^\]]*)\],\s*aksam:\s*\[([^\]]*)\]/g))
    days[m[1]] = { kahvalti: strings(m[2]), aksam: strings(m[3]) };
  return days;
}
const hasKcal = list => list?.some(x => x?.kcal);
// Ana kaynakta boş ya da kalorisiz kalan öğünleri sırayla yedeklerden doldurur; kalorisiz liste yalnızca kalorili bir yedekle değişir.
// Hangi öğünün nereden geldiği gün içinde `kaynaklar`a yazılır.
export function fillFromBackups(gunler, backups) {
  for (const { ad, days } of backups) for (const [date, meals] of Object.entries(days)) {
    const day = gunler[date] ??= {};
    for (const meal of ['kahvalti', 'aksam']) {
      if (!meals[meal]?.length || (day[meal]?.length && (hasKcal(day[meal]) || !hasKcal(meals[meal])))) continue;
      day[meal] = meals[meal];
      (day.kaynaklar ??= {})[meal] = ad;
    }
  }
  return gunler;
}

export async function updateExtras({ getHtml, read, save, report, pool, now, lastTransitAttempt }) {
  const dorm = read('data/kyk.json', { yurtlar: {} });
  const url = dormArchiveUrl(new Date(now)), errors = [];
  let gunler = {};
  try {
    gunler = parseDormMenu(await getHtml(url));
    if (!Object.keys(gunler).length) throw new Error('Yurt menü arşivi boş geldi');
    await fillDormDetails({ gunler, prev: dorm.sehir?.gunler, now, pool,
      fetchDetail: async (date, meal) => parseDormDetail(await getHtml(dormDetailUrl(date, meal)), date, meal) });
  } catch (e) { errors.push(`kykyurtmenu: ${e.message}`); }
  const backups = [];
  try {
    const [k, a] = await Promise.all(['kahvalti', 'aksam'].map(async meal => parseMonthPage(await getHtml(KEL_URL(meal)), meal)));
    const days = {};
    for (const [date, list] of Object.entries(k)) (days[date] ??= {}).kahvalti = list;
    for (const [date, list] of Object.entries(a)) (days[date] ??= {}).aksam = list;
    backups.push({ ad: 'KYK Yemek Listesi', days });
  } catch (e) { errors.push(`kykyemekliste: ${e.message}`); }
  try { backups.push({ ad: 'KampüsCepte', days: parseKampusCepteKyk(await getHtml(KC_KYK_URL)) }); }
  catch (e) { errors.push(`kampuscepte: ${e.message}`); }
  fillFromBackups(gunler, backups);
  if (Object.values(gunler).some(d => d.kahvalti?.length || d.aksam?.length)) {
    dorm.sehir = { ad: 'Elazığ', kaynak: url, kaynakAdi: 'KYK Yurt Menü', tur: 'sehir', guncelleme: now, gunler: { ...(dorm.sehir?.gunler || {}), ...gunler } };
    save('data/kyk.json', dorm); report('kyk', true, errors.length ? `Bazı kaynaklar alınamadı: ${errors.join(' · ')}` : null);
  } else report('kyk', false, errors.join(' · ') || 'Hiçbir kaynakta menü yok');
  const old = read('data/otobus.json', { hatlar: [] });
  if (!shouldUpdateTransit(lastTransitAttempt || old.guncelleme, now)) return;
  try {
    const routes = parseRoutes(await getHtml(TRANSIT_SOURCE));
    if (!routes.length) throw new Error('Hat listesi boş geldi');
    let scheduleErrors = 0;
    await pool(routes, 4, async route => {
      const previous = old.hatlar.find(x => x.url === route.url);
      route.tarifeler = { ...(previous?.tarifeler || {}) };
      route.gidis = previous?.gidis || ''; route.donus = previous?.donus || '';
      route.numaraKontrol = now;
      try {
        const first = parseSchedule(await getHtml(new URL('?gun=0', route.url).href));
        route.gidis = first.gidisDuraklar.join(' → '); route.donus = first.donusDuraklar.join(' → ');
        route.tarifeler['0'] = { gidis: first.gidis, donus: first.donus, guncelleme: now };
        // Day-specific URLs are taken from the source's own navigation.
        for (const [i, label] of [[1, '1'], [2, '2']]) {
          const href = first.gunLinkleri[i];
          if (!href) continue;
          try {
            const result = parseSchedule(await getHtml(new URL(href, route.url).href));
            route.tarifeler[label] = { gidis: result.gidis, donus: result.donus, guncelleme: now };
          } catch { scheduleErrors++; route.tarifeler[label] = { ...route.tarifeler[label], hata: true }; }
        }
      } catch { scheduleErrors++; route.tarifeHata = true; }
    });
    save('data/otobus.json', { kaynak: TRANSIT_SOURCE, kaynakAdi: 'Elazığ Ulaşım', resmiKaynak: 'https://elazigkart.elazig.bel.tr/wheremybus', guncelleme: now, tarifeHatalari: scheduleErrors, hatlar: routes });
    report('otobus', true);
  } catch (e) { report('otobus', false, e.message); }
}
