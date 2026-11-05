import { mkdirSync, copyFileSync, cpSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
mkdirSync('dist', { recursive: true });
for (const file of ['index.html', 'style.css', 'app.js', 'model.mjs', 'theme.js', 'manifest.webmanifest', 'favicon.svg']) copyFileSync(file, `dist/${file}`);
cpSync('icons', 'dist/icons', { recursive: true });
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 12);
// New deployments must not mix a cached old stylesheet with a new page.
const app = readFileSync('dist/app.js', 'utf8').replace("'./model.mjs'", `'./model.mjs?v=${hash('dist/model.mjs')}'`);
writeFileSync('dist/app.js', app);
let html = readFileSync('dist/index.html', 'utf8');
for (const file of ['style.css', 'app.js', 'theme.js']) html = html.replace(`"${file}"`, `"${file}?v=${hash(`dist/${file}`)}"`);
writeFileSync('dist/index.html', html);
mkdirSync('dist/data', {recursive:true});
const publishedData = ['okul.json', 'kyk.json', 'otobus.json', 'durum.json'];
for (const file of readdirSync('dist/data')) if (file.endsWith('.json') && !publishedData.includes(file)) unlinkSync(`dist/data/${file}`);
for (const file of publishedData) copyFileSync(`data/${file}`, `dist/data/${file}`);
for (const file of readdirSync('dist/data').filter(name => name.endsWith('.json'))) {
  const path = `dist/data/${file}`;
  writeFileSync(path, JSON.stringify(JSON.parse(readFileSync(path, 'utf8'))));
}
console.log('Site dist klasöründe hazır.');
