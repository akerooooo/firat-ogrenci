import { HALF_HOUR, mealDayLabel, fold, turkeyDay, shiftDay, category, filterAnnouncements, routeKey, sortRoutes, campusScore } from './model.mjs';
const $ = id => document.getElementById(id);
const el = (tag, text, className) => { const node = document.createElement(tag); if (text !== undefined) { node.textContent = String(text).replace(/ ↗$/, ''); if (String(text).endsWith(' ↗')) node.insertAdjacentHTML('beforeend', window.siteIcon('external')); } if (className) node.className = className; return node; };
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(`firat:${key}`)) ?? fallback; } catch { return fallback; } };
const store = (key, value) => { try { localStorage.setItem(`firat:${key}`, JSON.stringify(value)); } catch { /* Private browsing can disable storage. */ } };
const dateText = (value, full = false) => value ? new Date(value.length === 10 ? `${value}T12:00:00+03:00` : value).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', day: 'numeric', month: full ? 'long' : 'short', ...(full ? { hour: '2-digit', minute: '2-digit' } : { year: 'numeric' }) }) : 'Tarih belirtilmemiş';
const empty = (parent, message, tag = 'li') => parent.replaceChildren(el(tag, message, 'empty'));
let data = {}, selectedDay = turkeyDay(), selection = read('duyuru', null), page = 1, busLimit = 6, busy = false, lastCheck = 0;
let favorites = read('favoriler', []), visits = read('ziyaretler', {});
if (!Array.isArray(favorites)) favorites = [];
if (!visits || typeof visits !== 'object') visits = {};
if (!selection || typeof selection !== 'object') selection = null;
if (selection) delete selection.ders;
const sources = () => data.duyurular?.kaynaklar || [];
const sourceName = id => sources().find(s => s.id === id)?.ad || id;
const sourceStatus = id => data.durum?.kaynaklar?.[id];
function freshText(timestamp) { return timestamp ? `Son başarılı kontrol: ${dateText(timestamp, true)}${Date.now() - Date.parse(timestamp) > 2 * HALF_HOUR ? ' · Güncelleme gecikmiş olabilir' : ''}` : 'Kaynak henüz doğrulanmadı'; }

function renderMeals() {
  $('yemek-title').textContent = mealDayLabel(selectedDay);
  $('buguneDon').hidden = selectedDay === turkeyDay();
  $('gunAd').textContent = new Date(`${selectedDay}T12:00:00+03:00`).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'long', weekday: 'short' });
  const dishes = data.okul?.gunler?.[selectedDay] || [];
  $('okul').replaceChildren(...dishes.map((dish, i) => {
    const row = el('li'), name = el('div', undefined, 'dish-name');
    name.append(el('span', dish.ad), el('span', `${dish.tur || 'Günün yemeği'}${dish.kcal ? ` · ${dish.kcal} kcal` : ''}`, 'dish-type'));
    row.append(el('span', String(i + 1).padStart(2, '0'), 'dish-num'), name); return row;
  }));
  if (!dishes.length) empty($('okul'), 'Bu tarih için üniversite menüsü yayımlanmamış. Başka bir güne bakabilirsin.');
  $('kalori').textContent = dishes.length && dishes.every(x => x.kcal > 0) ? `Toplam ${dishes.reduce((sum, x) => sum + x.kcal, 0)} kcal` : '';
  $('okulDurum').textContent = `${freshText(data.okul?.guncelleme)}${sourceStatus('okul')?.durum === 'hata' ? ' · Son kontrol başarısız; kayıtlı menü gösteriliyor.' : ''}`;
  const menu = data.kyk?.sehir?.gunler?.[selectedDay] || {};
  for (const meal of ['kahvalti', 'aksam']) {
    const rows = (menu[meal] || []).map(x => el('li', typeof x === 'string' ? x : x.ad));
    $(meal).replaceChildren(...rows);
    if (!rows.length) empty($(meal), 'Seçilen tarih ve öğün için kaynakta menü yayımlanmamış.');
  }
  $('yurtDurum').replaceChildren(el('span', 'Elazığ geneli menüdür; yurtlarda değişiklik olabilir. '));
  if (data.kyk?.sehir?.kaynak) {
    const source = el('a', 'Menü kaynağı ↗'); source.href=data.kyk.sehir.kaynak; source.target='_blank'; source.rel='noopener';
    $('yurtDurum').append(source,el('span',' · '+freshText(data.kyk.sehir.guncelleme)));
  }

}
function fillDepartments(value = '') {
  const departments = sources().filter(s => s.fakulte === $('kaynak').value);
  $('bolum').replaceChildren(new Option(departments.length ? 'Fakülte ve tüm bölümleri' : 'Fakülte / kaynak duyuruları', ''), ...departments.map(d => new Option(d.ad, d.id)));
  $('bolum').disabled = !departments.length;
  if (departments.some(x => x.id === value)) $('bolum').value = value;
}
function fillSelections() {
  const source = $('kaynak').value || selection?.kaynak || '';
  const department = $('bolum').value || selection?.bolum || '';
  $('kaynak').replaceChildren(new Option('Önce fakülteni seç', ''), ...sources().filter(s => s.tur !== 'bolum').map(s => new Option(s.ad, s.id)));
  if (sources().some(s => s.id === source)) $('kaynak').value = source;
  fillDepartments(department);
}
const labels = { sinav: 'Sınav', ders: 'Ders & program', etkinlik: 'Etkinlik', genel: 'Duyuru' };
function renderAnnouncements() {
  const ready = Boolean(selection?.kaynak);
  $('duyuruBaslangic').hidden = ready; $('duyuruSonuc').hidden = !ready;
  if (!ready) return;
  const rows = filterAnnouncements(data.duyurular?.items || [], sources(), { ...selection, konu: $('konu').value });
  const pages = Math.max(1, Math.ceil(rows.length / 6)); page = Math.min(page, pages);
  $('sonucSayisi').textContent = `${rows.length} duyuru · ${sourceName(selection.bolum || selection.kaynak)}`;
  const relevantSources = sources().filter(s => s.id === selection.kaynak || s.id === selection.bolum || (!selection.bolum && s.fakulte === selection.kaynak) || (selection.genelDahil && ['genel', 'sks'].includes(s.id)));
  const failed = relevantSources.filter(s => sourceStatus(s.id)?.durum === 'hata');
  const selectedStatus = sourceStatus(selection.bolum || selection.kaynak);
  $('duyuruDurum').textContent = `${freshText(selectedStatus?.sonBasari || data.duyurular?.guncelleme)}${failed.length ? ` · ${failed.map(s => s.ad).join(', ')} kaynağına son kontrolde ulaşılamadı; kayıtlı duyurular korunuyor.` : ''}`;
  $('duyurular').replaceChildren(...rows.slice((page - 1) * 6, page * 6).map(item => {
    const card = el('article', undefined, 'announcement-card'), button = el('button', undefined, 'announcement-open'); button.type = 'button';
    const top = el('div', undefined, 'announcement-top'); top.append(el('span', labels[category(item)], 'tag'), el('span', dateText(item.tarih)));
    const bottom = el('div', undefined, 'announcement-bottom'); bottom.append(el('span', sourceName(item.kaynak)), el('span', 'Duyuruyu oku ↗'));
    button.append(top, el('h3', item.baslik), el('p', item.ozet || 'Duyurunun ayrıntılarını ve varsa eklerini görüntüle.'), bottom);
    button.onclick = () => openAnnouncement(item); card.append(button); return card;
  }));
  if (!rows.length) empty($('duyurular'), 'Seçimine uygun duyuru bulunamadı. Bölüm veya konu filtresini değiştirebilirsin.', 'p');
  $('oncekiSayfa').disabled = page <= 1; $('sonrakiSayfa').disabled = page >= pages; $('sayfaBilgi').textContent = `${page} / ${pages}`;
}
function openAnnouncement(item) {
  $('modalBaslik').textContent = item.baslik;
  $('modalMeta').textContent = `${sourceName(item.kaynak)} · ${dateText(item.tarih)}`;
  // A second allowlist protects the browser even if a data file is edited by hand.
  const allowed = new Set('P BR DIV SPAN STRONG B EM I U S UL OL LI H2 H3 H4 TABLE THEAD TBODY TR TD TH BLOCKQUOTE A IMG HR'.split(' '));
  const template = document.createElement('template'); template.innerHTML = item.icerik || '';
  for (const node of template.content.querySelectorAll('*')) {
    if (!allowed.has(node.tagName)) { node.remove(); continue; }
    const href = node.getAttribute('href'), src = node.getAttribute('src'), alt = node.getAttribute('alt');
    for (const attr of [...node.attributes]) node.removeAttribute(attr.name);
    if (node.tagName === 'A' && /^https?:\/\//i.test(href || '')) { node.href = href; node.target = '_blank'; node.rel = 'noopener noreferrer'; }
    if (node.tagName === 'IMG' && /^https?:\/\//i.test(src || '')) { node.src = src; node.alt = alt || 'Duyuru görseli'; node.loading = 'lazy'; }
  }
  $('modalIcerik').replaceChildren(template.content);
  if (!item.icerik) $('modalIcerik').append(el('p', 'Bu duyurunun içeriği henüz alınamadı. Sonraki güncellemede tekrar denenecek.'));
  $('modalDurum').textContent = `${item.icerikHata ? 'Son denemede içerik alınamadı. Kayıtlı içerik varsa korunmuştur. ' : ''}${item.icerikGuncelleme ? freshText(item.icerikGuncelleme) : ''}`;
  $('modalKaynak').href = /^https?:\/\//i.test(item.url) ? item.url : '#';
  $('duyuruModal').showModal(); $('duyuruModal').scrollTop = 0;
}
function renderBuses() {
  const openRoutes = new Set([...$('hatlar').querySelectorAll('details[open]')].map(d=>d.dataset.route));
  const q = fold($('ara').value);
  const filtered = sortRoutes(data.otobus?.hatlar || [], { favorites, visits, order: $('hatSiralama').value }).filter(h => (!q || fold(`${h.numara || ''} ${h.ad} ${h.gidis} ${h.donus}`).includes(q)) && (!$('favoriler').checked || favorites.includes(routeKey(h))));
  $('hatSayisi').textContent = `${filtered.length} hat · Kullanım sıralaması bu cihaza özeldir; şehir genelindeki yolcu yoğunluğunu göstermez.`;
  $('hatlar').replaceChildren(...filtered.slice(0, busLimit).map(h => {
    const key = routeKey(h), card = el('article', undefined, 'bus-card'), top = el('div', undefined, 'bus-card-top');
    const number = el('span', h.numaraDogrulandi ? h.numara : '—', 'bus-number'); number.title = h.numaraDogrulandi ? 'Doğrulanmış hat numarası' : 'Hat numarası doğrulanmadı';
    const title = el('div'); title.append(el('h3', h.ad), el('small', campusScore(h) ? 'Kampüs bağlantısı' : 'Elazığ Ulaşım'));
    const favorite = el('button', undefined, 'favorite'); favorite.innerHTML = window.siteIcon('star'); favorite.setAttribute('aria-label', `${h.ad} favori`); favorite.setAttribute('aria-pressed', favorites.includes(key));
    favorite.onclick = () => { favorites = favorites.includes(key) ? favorites.filter(x => x !== key) : [...favorites, key]; store('favoriler', favorites); renderBuses(); const replacement = [...$('hatlar').querySelectorAll('button.favorite')].find(b => b.getAttribute('aria-label') === `${h.ad} favori`); replacement?.focus(); };
    top.append(number, title, favorite);
    const detail = el('details'); detail.dataset.route=key; detail.open=openRoutes.has(key); detail.append(el('summary', 'Saatleri ve güzergâhı görüntüle'));
    const schedule = h.tarifeler?.[$('seferGunu').value];
    for (const [key,label] of [['gidis','Gidiş'],['donus','Dönüş']]) { const trip=schedule?.[key]; detail.append(el('p',label+' · '+(trip?.durak||'Başlangıç durağı'))); const times=el('div',undefined,'time-grid'); for(const time of trip?.saatler||[]) times.append(el('span',time,'time-chip')); if(!trip?.saatler?.length) times.append(el('p','Kaynakta kayıtlı tarife yok.')); detail.append(times); }
    if(schedule?.guncelleme) detail.append(el('p',freshText(schedule.guncelleme)));
    if(schedule?.hata || h.tarifeHata) detail.append(el('p','Son tarife kontrolü başarısız; varsa önceki kayıt gösteriliyor.'));
    const sourceLink=el('a','Tarife kaynağı: Elazığ Ulaşım ↗'); sourceLink.href=h.url; sourceLink.target='_blank'; sourceLink.rel='noopener'; detail.append(sourceLink);
    if (h.gidis) detail.append(el('p', `Gidiş: ${h.gidis}`));
    if (h.donus) detail.append(el('p', `Dönüş: ${h.donus}`));
    if (!h.gidis && !h.donus) detail.append(el('p', 'Bu hat için kayıtlı güzergâh ayrıntısı bulunmuyor.'));
    
    const link = el('a', 'Güncel saatleri Elazığ Kart’ta kontrol et ↗'); link.href = 'https://elazigkart.elazig.bel.tr/wheremybus'; link.target = '_blank'; link.rel = 'noopener'; detail.append(link);
    let counted = detail.open; detail.addEventListener('toggle', () => { if (detail.open && !counted) { counted = true; visits[key] = (visits[key] || 0) + 1; store('ziyaretler', visits); } });
    card.append(top, detail); return card;
  }));
  if (!filtered.length) empty($('hatlar'), $('favoriler').checked ? 'Henüz eşleşen bir favorin yok. Yıldız simgesiyle hat ekleyebilirsin.' : 'Eşleşen hat bulunamadı.', 'p');
  $('dahaFazlaHat').hidden = filtered.length <= busLimit;
}
async function refresh() {
  if (busy) return; busy = true; $('guncelleme').textContent = 'Kayıtlı veriler kontrol ediliyor…';
  const names = ['okul', 'kyk', 'duyurular', 'otobus', 'durum'];
  const results = await Promise.allSettled(names.map(async name => {
    const response = await fetch(`data/${name}.json`, { cache: 'no-cache', signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(name); const value = await response.json();
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(name);
    return value;
  }));
  const errors = [];
  results.forEach((result, i) => { if (result.status === 'fulfilled') data[names[i]] = result.value; else errors.push(names[i]); });
  fillSelections(); renderMeals(); renderAnnouncements(); renderBuses(); lastCheck = Date.now();
  $('guncelleme').textContent = errors.length ? 'Bazı veriler alınamadı. Varsa son kayıtlar gösteriliyor; tekrar kontrol edebilirsin.' : `Son kaynak kontrolü: ${dateText(data.durum?.sonDeneme || data.duyurular?.guncelleme, true)} · Otomatik kontrol: 30 dk`;
  busy = false;
}
$('geri').onclick = () => { selectedDay = shiftDay(selectedDay, -1); renderMeals(); };
$('ileri').onclick = () => { selectedDay = shiftDay(selectedDay, 1); renderMeals(); };
$('buguneDon').onclick = () => { selectedDay = turkeyDay(); renderMeals(); };
$('kaynak').onchange = () => { fillDepartments(); selection = null; store('duyuru', null); renderAnnouncements(); };
$('duyuruForm').onsubmit = e => { e.preventDefault(); selection = { kaynak: $('kaynak').value, bolum: $('bolum').value, genelDahil: $('genelDahil').checked }; store('duyuru', selection); page = 1; renderAnnouncements(); };
$('konu').onchange = () => { page = 1; renderAnnouncements(); };
$('oncekiSayfa').onclick = () => { page--; renderAnnouncements(); $('duyuruSonuc').scrollIntoView({ block: 'start' }); };
$('sonrakiSayfa').onclick = () => { page++; renderAnnouncements(); $('duyuruSonuc').scrollIntoView({ block: 'start' }); };
for (const id of ['ara', 'hatSiralama', 'favoriler', 'seferGunu']) $(id).addEventListener(id === 'ara' ? 'input' : 'change', () => { busLimit = 6; renderBuses(); });
$('dahaFazlaHat').onclick = () => { busLimit += 6; renderBuses(); };
$('modalKapat').onclick = () => $('duyuruModal').close();
$('duyuruModal').addEventListener('click', e => { if (e.target === $('duyuruModal')) { const r = e.target.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) e.target.close(); } });

if (selection) { $('genelDahil').checked = selection.genelDahil ?? true; }
document.querySelectorAll('nav a').forEach(a => a.addEventListener('click', () => { document.querySelectorAll('nav a').forEach(x => x.classList.toggle('active', x === a)); }));
const weekday = new Date(turkeyDay()+'T12:00:00Z').getUTCDay(); $('seferGunu').value = weekday===0?'2':weekday===6?'1':'0';
await refresh();
setInterval(refresh, HALF_HOUR);
document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - lastCheck >= HALF_HOUR) refresh(); });

let weatherBusy = false;
async function refreshWeather() {
  if (weatherBusy) return; weatherBusy = true;
  try {
    const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=38.6748&longitude=39.2225&current=temperature_2m,weather_code,is_day&timezone=Europe%2FIstanbul', { signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error('Weather unavailable');
    const { current } = await response.json();
    if (!Number.isFinite(current?.temperature_2m) || !Number.isFinite(current?.weather_code)) throw new Error('Invalid weather');
    const code = current.weather_code;
    const label = code === 0 ? 'Açık' : code <= 2 ? 'Az bulutlu' : code === 3 ? 'Bulutlu' : [45,48].includes(code) ? 'Sisli' : [71,73,75,77,85,86].includes(code) ? 'Kar yağışlı' : code >= 95 ? 'Gök gürültülü' : 'Yağışlı';
    $('sicaklik').textContent = Math.round(current.temperature_2m) + '°C';
    $('havaDurum').textContent = label;
    $('havaIkon').innerHTML = window.siteIcon(code === 0 ? (current.is_day ? 'sun' : 'moon') : 'cloud');
    $('hava').title = 'Open-Meteo · Son kontrol ' + new Date().toLocaleTimeString('tr-TR', {hour:'2-digit',minute:'2-digit'});
  } catch {
    $('sicaklik').textContent = '—'; $('havaDurum').textContent = 'Hava bilgisi alınamadı';
  } finally { weatherBusy = false; }
}
refreshWeather();
setInterval(refreshWeather, HALF_HOUR);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshWeather(); });
