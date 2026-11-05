import { lookup } from 'node:dns/promises';
const urls = ['https://www.firat.edu.tr/tr/page/announcement', 'https://unievi.firat.edu.tr/tr', 'https://bilgisayarmf.firat.edu.tr/announcements-all'];
await Promise.all(urls.map(async url => {
  const host = new URL(url).hostname;
  try { console.log(host, 'DNS', await lookup(host, {all:true})); } catch (e) { console.log(host, 'DNS error', e.code); }
  try {
    const r = await fetch(url, { headers: {'user-agent':'firat-ogrenci-sayfasi'}, signal: AbortSignal.timeout(15000) });
    console.log(host, 'HTTP', r.status, 'bytes', (await r.text()).length);
  } catch (e) {
    console.log(host, JSON.stringify({message:e.message, cause:e.cause?.message, code:e.cause?.code, errors:e.cause?.errors?.map(x=>({code:x.code,message:x.message}))}));
  }
}));
