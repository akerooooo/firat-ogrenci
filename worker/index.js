// Yalnızca *.firat.edu.tr adreslerine aracılık eden küçük proxy.
// Kullanım: https://<worker>.workers.dev/?u=https://unievi.firat.edu.tr/tr
export default {
  async fetch(req) {
    let hedef;
    try { hedef = new URL(new URL(req.url).searchParams.get('u')); } catch { return new Response('u parametresi gerekli', { status: 400 }); }
    const izinli = hedef.protocol === 'https:' && (hedef.hostname === 'firat.edu.tr' || hedef.hostname.endsWith('.firat.edu.tr'));
    if (!izinli) return new Response('Sadece firat.edu.tr', { status: 403 });
    const r = await fetch(hedef, { headers: { 'user-agent': 'firat-ogrenci-sayfasi' } });
    return new Response(r.body, { status: r.status, headers: { 'content-type': r.headers.get('content-type') || 'text/html; charset=utf-8' } });
  },
};
