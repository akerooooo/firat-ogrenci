# Fırat Öğrenci

Tek sayfada: KYK yurt menüsü, okul yemekhanesi menüsü, duyurular (genel, SKS, tüm fakülteler) ve Elazığ belediye otobüs saatleri.

## Veri nereden geliyor

| Dosya | Kaynak | Nasıl güncellenir |
|---|---|---|
| `data/okul.json` | unievi.firat.edu.tr haftalık menü | Otomatik (GitHub Actions, 3 saatte bir) |
| `data/duyurular.json` | firat.edu.tr, sksdab ve `fakulteler.json` içindeki fakülteler | Otomatik |
| `data/kyk.json` | Yurdun paylaştığı aylık menü | **Elle** (aşağıya bakın) |
| `data/otobus.json` | elazig.bel.tr otobüs sefer ve güzergahları (2020–2021) | Elle. Belediye sitesi otomatik istekleri engelliyor |

## KYK menüsünü girme

`data/kyk.json` dosyasını GitHub'da açıp kalem simgesiyle düzenleyin:

```json
{
 "gunler": {
  "2026-11-07": { "kahvalti": ["Haşlanmış yumurta", "Beyaz peynir", "Zeytin", "Çay"], "aksam": ["Mercimek çorbası", "Tavuk sote", "Pilav", "Ayran"] },
  "2026-11-08": { "kahvalti": ["..."], "aksam": ["..."] }
 }
}
```

## Yerelde çalıştırma

```bash
npm install
```

```bash
npm test
```

```bash
node scrape.mjs
```

```bash
npx serve .
```

## İnternete koyma (GitHub Pages)

1. GitHub'da yeni bir public repo açın ve bu klasörü push edin.
2. Repo > Settings > Pages > Source: "Deploy from a branch", branch `main`, klasör `/ (root)`.
3. Repo > Settings > Actions > General > Workflow permissions: "Read and write permissions".
4. Actions sekmesinde "Verileri güncelle" iş akışını bir kez elle çalıştırın.

Site adresi: `https://<kullanıcı-adınız>.github.io/<repo-adı>/`
