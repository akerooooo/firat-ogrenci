const $ = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2, '0');
const isoGun = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const getJson = (p) => fetch(p, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : {})).catch(() => ({}));

// Metni DOM'a yazarken HTML olarak yorumlanmasın diye textContent kullanılır.
function li(ad, ek) {
  const el = document.createElement('li');
  el.textContent = ad;
  if (ek) { const s = document.createElement('span'); s.textContent = ek; el.append(s); }
  return el;
}
function doldur(ul, satirlar, bosMesaj) {
  ul.replaceChildren(...(satirlar.length ? satirlar : [Object.assign(document.createElement('li'), { className: 'bos', textContent: bosMesaj })]));
}

// Sekmeler
document.querySelectorAll('nav button').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('nav button').forEach((x) => x.setAttribute('aria-selected', x === b));
  for (const id of ['yemek', 'duyuru', 'otobus']) $(id).hidden = b.dataset.tab !== id;
}));

const [okul, kyk, duyuru, otobus] = await Promise.all(['data/okul.json', 'data/kyk.json', 'data/duyurular.json', 'data/otobus.json'].map(getJson));

// Yemek
let gun = new Date();
function yemekGoster() {
  const k = isoGun(gun);
  $('gunAd').textContent = gun.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
  const y = kyk.gunler?.[k] || {};
  doldur($('kahvalti'), (y.kahvalti || []).map((x) => li(x)), 'Menü girilmedi');
  doldur($('aksam'), (y.aksam || []).map((x) => li(x)), 'Menü girilmedi');
  doldur($('okul'), (okul.gunler?.[k] || []).map((x) => li(x.ad, x.kcal ? `${x.kcal} kcal` : '')), 'Bu gün için menü yok');
}
$('geri').onclick = () => { gun.setDate(gun.getDate() - 1); yemekGoster(); };
$('ileri').onclick = () => { gun.setDate(gun.getDate() + 1); yemekGoster(); };
yemekGoster();

// Duyurular
const adlar = Object.fromEntries((duyuru.kaynaklar || []).map((k) => [k.id, k.ad]));
for (const k of duyuru.kaynaklar || []) $('kaynak').append(new Option(k.ad, k.id));
function duyuruGoster() {
  const sec = $('kaynak').value;
  const items = (duyuru.items || []).filter((x) => !sec || x.kaynak === sec).slice(0, 100);
  doldur($('duyurular'), items.map((x) => {
    const el = document.createElement('li');
    const a = Object.assign(document.createElement('a'), { href: x.url, target: '_blank', rel: 'noopener', textContent: x.baslik });
    const s = document.createElement('small');
    s.textContent = `${x.tarih ? new Date(x.tarih).toLocaleDateString('tr-TR') : ''} · ${adlar[x.kaynak] || x.kaynak}`;
    el.append(a, s);
    return el;
  }), 'Duyuru yok');
}
$('kaynak').onchange = duyuruGoster;
duyuruGoster();

// Otobüs
const dk = (s) => { const [h, m] = s.slice(0, 5).split(':'); return +h * 60 + +m; };
const kucuk = (s) => s.toLocaleLowerCase('tr');
const hatlar = (otobus.hatlar || []).map((h) => ({ ...h, saatler: [...h.saatler].sort((a, b) => dk(a) - dk(b)) }));
$('otobusKaynak').href = otobus.kaynak || '#';
function otobusGoster() {
  const q = kucuk($('ara').value.trim());
  const now = new Date();
  const simdi = now.getHours() * 60 + now.getMinutes();
  const liste = hatlar.filter((h) => !q || kucuk(`${h.ad} ${h.gidis} ${h.donus}`).includes(q));
  doldur($('hatlar'), liste.map((h) => {
    const el = Object.assign(document.createElement('li'), { className: 'kart' });
    const sonraki = h.saatler.find((s) => dk(s) >= simdi);
    const baslik = Object.assign(document.createElement('h2'), { textContent: h.ad });
    if (h.saatler.length) {
      const s = document.createElement('small');
      const fark = sonraki && dk(sonraki) - simdi;
      s.textContent = sonraki ? `Sıradaki ${sonraki.slice(0, 5)} · ${fark >= 60 ? `${Math.floor(fark / 60)} sa ` : ''}${fark % 60} dk` : 'Bugün sefer kalmadı';
      baslik.append(s);
    }
    const saatler = Object.assign(document.createElement('div'), { className: 'saatler' });
    for (const s of h.saatler) {
      const c = Object.assign(document.createElement('span'), { textContent: s });
      if (dk(s) < simdi) c.className = 'gecti';
      if (s === sonraki) c.className = 'siradaki';
      saatler.append(c);
    }
    el.append(baslik, saatler);
    if (h.not) el.append(Object.assign(document.createElement('p'), { className: 'bos', textContent: h.not }));
    if (h.gidis || h.donus) {
      const d = document.createElement('details');
      d.append(Object.assign(document.createElement('summary'), { textContent: 'Güzergah' }));
      if (h.gidis) d.append(Object.assign(document.createElement('p'), { textContent: `Gidiş: ${h.gidis}` }));
      if (h.donus) d.append(Object.assign(document.createElement('p'), { textContent: `Dönüş: ${h.donus}` }));
      el.append(d);
    }
    return el;
  }), 'Eşleşen hat yok');
}
$('ara').oninput = otobusGoster;
otobusGoster();

if (duyuru.guncelleme) $('guncelleme').textContent = `Son güncelleme: ${new Date(duyuru.guncelleme).toLocaleString('tr-TR')}`;
