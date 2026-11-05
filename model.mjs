export const HALF_HOUR = 30 * 60 * 1000;
export const fold = value => String(value || '').toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i');
export function turkeyDay(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const values = Object.fromEntries(parts.map(x => [x.type, x.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
export function shiftDay(day, offset) {
  const date = new Date(`${day}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + offset); return date.toISOString().slice(0, 10);
}
export function category(item) {
  const text = fold(item.baslik);
  if (/sinav|vize|butunleme|mazeret/.test(text)) return 'sinav';
  if (/ders|program|odek|kayit/.test(text)) return 'ders';
  if (/etkinlik|konferans|seminer|kongre|soylesi/.test(text)) return 'etkinlik';
  return 'genel';
}
export function filterAnnouncements(items, sources, selection) {
  if (!selection?.kaynak) return [];
  const ids = new Set([selection.kaynak]);
  if (selection.bolum) ids.add(selection.bolum);
  else sources.filter(x => x.fakulte === selection.kaynak).forEach(x => ids.add(x.id));
  if (selection.genelDahil) { ids.add('genel'); ids.add('sks'); }
  const terms = fold(selection.ders).split(/\s+/).filter(Boolean);
  return items.filter(x => ids.has(x.kaynak) && terms.every(term => fold(`${x.baslik} ${x.ozet || ''} ${x.icerik?.replace(/<[^>]*>/g, ' ') || ''}`).includes(term)) && (!selection.konu || category(x) === selection.konu))
    .sort((a, b) => (b.tarih || '').localeCompare(a.tarih || ''));
}
export const routeKey = route => `${route.url || ''}|${route.ad}`;
export const campusScore = route => /üniversite|kampüs/i.test(route.ad) ? 2 : /üniversite|kampüs/i.test(`${route.gidis} ${route.donus}`) ? 1 : 0;
export function sortRoutes(routes, { favorites = [], visits = {}, order = 'kullanim' } = {}) {
  return [...routes].sort((a, b) => {
    const fav = Number(favorites.includes(routeKey(b))) - Number(favorites.includes(routeKey(a)));
    if (fav) return fav;
    if (order === 'kullanim') { const diff = (visits[routeKey(b)] || 0) - (visits[routeKey(a)] || 0); if (diff) return diff; }
    if (order !== 'ad') { const diff = campusScore(b) - campusScore(a); if (diff) return diff; }
    return a.ad.localeCompare(b.ad, 'tr');
  });
}
