import { HALF_HOUR, mealDayLabel, fold, turkeyDay, shiftDay, routeKey, sortRoutes, campusScore } from './model.mjs';
const $ = id => document.getElementById(id);
const el = (tag, text, className) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; };
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(`firat:${key}`)) ?? fallback; } catch { return fallback; } };
const store = (key, value) => { try { localStorage.setItem(`firat:${key}`, JSON.stringify(value)); } catch { /* Private browsing can disable storage. */ } };
const dateText = (value, full = false) => value ? new Date(value.length === 10 ? `${value}T12:00:00+03:00` : value).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', day: 'numeric', month: full ? 'long' : 'short', ...(full ? { hour: '2-digit', minute: '2-digit' } : { year: 'numeric' }) }) : 'Tarih belirtilmemiş';
const empty = (parent, message, tag = 'li') => parent.replaceChildren(el(tag, message, 'empty'));
let data = {}, selectedDay = turkeyDay(), busLimit = 6, busy = false, lastCheck = 0;
let favorites = read('favoriler', []), visits = read('ziyaretler', {});
if (!Array.isArray(favorites)) favorites = [];
if (!visits || typeof visits !== 'object') visits = {};
const sourceStatus = id => data.durum?.kaynaklar?.[id];
function freshText(timestamp, maxAge = 2 * HALF_HOUR) { return timestamp ? `Son başarılı kontrol: ${dateText(timestamp, true)}${Date.now() - Date.parse(timestamp) > maxAge ? ' · Güncelleme gecikmiş olabilir' : ''}` : 'Kaynak henüz doğrulanmadı'; }

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
  if (!dishes.length) empty($('okul'), 'Kayıtlı menü yok. Aşağıda okulun sitesindeki güncel haftalık menü açılıyor.');
  // Fırat sunucuları bulut IP'lerini kesiyor; kayıt yoksa ziyaretçinin kendi bağlantısıyla okul sayfası açılır.
  let canli = $('okulCanli');
  if (!dishes.length && !canli) {
    canli = Object.assign(el('iframe'), { id: 'okulCanli', className: 'live-menu', src: 'https://unievi.firat.edu.tr/tr#fm', title: 'Üniversite Evi haftalık menü (canlı)', referrerPolicy: 'no-referrer' });
    canli.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups');
    $('okul').after(canli);
  }
  if (canli) canli.hidden = dishes.length > 0;
  $('kalori').textContent = dishes.length && dishes.every(x => x.kcal > 0) ? `Toplam ${dishes.reduce((sum, x) => sum + x.kcal, 0)} kcal` : '';
  $('okulDurum').textContent = `${freshText(data.okul?.guncelleme)}${sourceStatus('okul')?.durum === 'hata' ? ' · Son kontrol başarısız; kayıtlı menü gösteriliyor.' : ''}`;
  const menu = data.kyk?.sehir?.gunler?.[selectedDay] || {};
  for (const meal of ['kahvalti', 'aksam']) {
    const rows = (menu[meal] || []).map(x => el('li', typeof x === 'string' ? x : x.ad));
    $(meal).replaceChildren(...rows);
    if (!rows.length) empty($(meal), 'Seçilen tarih ve öğün için kaynakta menü yayımlanmamış.');
  }
  $('yurtDurum').replaceChildren(el('span', 'Elazığ geneli menüdür; yurtlarda değişiklik olabilir. '));
  $('yurtDurum').append(el('span', ' · '+freshText(data.kyk?.sehir?.guncelleme)+(sourceStatus('kyk')?.durum === 'hata' ? ' · Son kontrol başarısız; kayıtlı menü gösteriliyor.' : '')));

}
function renderBuses() {
  const openRoutes = new Set([...$('hatlar').querySelectorAll('details[open]')].map(d=>d.dataset.route));
  const q = fold($('ara').value);
  const filtered = sortRoutes(data.otobus?.hatlar || [], { favorites, visits, order: $('hatSiralama').value }).filter(h => (!q || fold(`${h.numara || ''} ${h.ad} ${h.gidis} ${h.donus}`).includes(q)) && (!$('favoriler').checked || favorites.includes(routeKey(h))));
  $('hatSayisi').textContent = `${filtered.length} hat · Kullanım sıralaması bu cihaza özeldir; şehir genelindeki yolcu yoğunluğunu göstermez.`;
  $('hatlar').replaceChildren(...filtered.slice(0, busLimit).map(h => {
    const key = routeKey(h), card = el('article', undefined, 'bus-card'), top = el('div', undefined, 'bus-card-top');
    const number = el('span', h.numaraDogrulandi ? h.numara : '—', 'bus-number'); number.title = h.numaraDogrulandi ? 'Doğrulanmış hat numarası' : 'Hat numarası doğrulanmadı';
    const title = el('div'); title.append(el('h3', h.ad), el('small', campusScore(h) ? 'Kampüs bağlantısı' : 'Şehir içi hat'));
    const favorite = el('button', undefined, 'favorite'); favorite.innerHTML = window.siteIcon('star'); favorite.setAttribute('aria-label', `${h.ad} favori`); favorite.setAttribute('aria-pressed', favorites.includes(key));
    favorite.onclick = () => { favorites = favorites.includes(key) ? favorites.filter(x => x !== key) : [...favorites, key]; store('favoriler', favorites); renderBuses(); const replacement = [...$('hatlar').querySelectorAll('button.favorite')].find(b => b.getAttribute('aria-label') === `${h.ad} favori`); replacement?.focus(); };
    top.append(number, title, favorite);
    const detail = el('details'); detail.dataset.route=key; detail.open=openRoutes.has(key); detail.append(el('summary', 'Saatleri ve güzergâhı görüntüle'));
    const schedule = h.tarifeler?.[$('seferGunu').value];
    for (const [key,label] of [['gidis','Gidiş'],['donus','Dönüş']]) { const trip=schedule?.[key]; detail.append(el('p',label+' · '+(trip?.durak||'Başlangıç durağı'))); const times=el('div',undefined,'time-grid'); for(const time of trip?.saatler||[]) times.append(el('span',time,'time-chip')); if(!trip?.saatler?.length) times.append(el('p','Kaynakta kayıtlı tarife yok.')); detail.append(times); }
    if(schedule?.guncelleme) detail.append(el('p',freshText(schedule.guncelleme, 48 * 60 * 60 * 1000)));
    if(schedule?.hata || h.tarifeHata) detail.append(el('p','Son tarife kontrolü başarısız; varsa önceki kayıt gösteriliyor.'));
    if (h.gidis) detail.append(el('p', `Gidiş: ${h.gidis}`));
    if (h.donus) detail.append(el('p', `Dönüş: ${h.donus}`));
    if (!h.gidis && !h.donus) detail.append(el('p', 'Bu hat için kayıtlı güzergâh ayrıntısı bulunmuyor.'));
    
    let counted = detail.open; detail.addEventListener('toggle', () => { if (detail.open && !counted) { counted = true; visits[key] = (visits[key] || 0) + 1; store('ziyaretler', visits); } });
    card.append(top, detail); return card;
  }));
  if (!filtered.length) empty($('hatlar'), $('favoriler').checked ? 'Henüz eşleşen bir favorin yok. Yıldız simgesiyle hat ekleyebilirsin.' : 'Eşleşen hat bulunamadı.', 'p');
  $('dahaFazlaHat').hidden = filtered.length <= busLimit;
}
async function refresh() {
  if (busy) return; busy = true; $('guncelleme').textContent = 'Kayıtlı veriler kontrol ediliyor…';
  const names = ['okul', 'kyk', 'otobus', 'durum'];
  const results = await Promise.allSettled(names.map(async name => {
    const response = await fetch(`data/${name}.json`, { cache: 'no-cache', signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(name); const value = await response.json();
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(name);
    data[name] = value;
    // Paint each section as soon as its own data arrives.
    if (['okul', 'kyk', 'durum'].includes(name)) renderMeals();
    if (name === 'otobus') renderBuses();
    return value;
  }));
  const errors = [];
  results.forEach((result, i) => { if (result.status === 'fulfilled') data[names[i]] = result.value; else errors.push(names[i]); });
  renderMeals(); renderBuses(); lastCheck = Date.now();
  $('guncelleme').textContent = errors.length ? 'Bazı veriler alınamadı. Varsa son kayıtlar gösteriliyor; tekrar kontrol edebilirsin.' : `Son kaynak kontrolü: ${dateText(data.durum?.sonDeneme || data.okul?.guncelleme, true)} · Yemek: 30 dk · Otobüs: günde 1` ;
  busy = false;
}
$('geri').onclick = () => { selectedDay = shiftDay(selectedDay, -1); renderMeals(); };
$('ileri').onclick = () => { selectedDay = shiftDay(selectedDay, 1); renderMeals(); };
$('buguneDon').onclick = () => { selectedDay = turkeyDay(); renderMeals(); };
for (const id of ['ara', 'hatSiralama', 'favoriler', 'seferGunu']) $(id).addEventListener(id === 'ara' ? 'input' : 'change', () => { busLimit = 6; renderBuses(); });
$('dahaFazlaHat').onclick = () => { busLimit += 6; renderBuses(); };
document.querySelectorAll('nav a').forEach(a => a.addEventListener('click', () => { document.querySelectorAll('nav a').forEach(x => x.classList.toggle('active', x === a)); }));
const weekday = new Date(turkeyDay()+'T12:00:00Z').getUTCDay(); $('seferGunu').value = weekday===0?'2':weekday===6?'1':'0';
refresh();
setInterval(refresh, HALF_HOUR);
document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - lastCheck >= HALF_HOUR) refresh(); });

let weatherBusy = false;
async function refreshWeather() {
  if (weatherBusy) return; weatherBusy = true;
  try {
    const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=38.6748&longitude=39.2225&current=temperature_2m,weather_code,is_day&timezone=Europe%2FIstanbul', { cache: 'no-store', signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('Weather unavailable');
    const { current } = await response.json();
    if (!Number.isFinite(current?.temperature_2m) || !Number.isFinite(current?.weather_code)) throw new Error('Invalid weather');
    const code = current.weather_code;
    const label = code === 0 ? 'Açık' : code <= 2 ? 'Az bulutlu' : code === 3 ? 'Bulutlu' : [45,48].includes(code) ? 'Sisli' : [71,73,75,77,85,86].includes(code) ? 'Kar yağışlı' : code >= 95 ? 'Gök gürültülü' : 'Yağışlı';
    $('sicaklik').textContent = Math.round(current.temperature_2m) + '°C';
    $('havaDurum').textContent = label;
    $('havaIkon').innerHTML = window.siteIcon(code === 0 ? (current.is_day ? 'sun' : 'moon') : 'cloud');
    $('hava').title = 'Son kontrol ' + new Date().toLocaleTimeString('tr-TR', {hour:'2-digit',minute:'2-digit'});
  } catch {
    $('sicaklik').textContent = '—'; $('havaDurum').textContent = 'Hava bilgisi alınamadı';
  } finally { weatherBusy = false; }
}
refreshWeather();
setInterval(refreshWeather, HALF_HOUR);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshWeather(); });
window.addEventListener('pageshow', event => { if (event.persisted) refreshWeather(); });
