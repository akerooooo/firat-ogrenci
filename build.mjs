import { mkdirSync, copyFileSync, cpSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
mkdirSync('dist', { recursive: true });
for (const file of ['index.html', 'style.css', 'app.js', 'model.mjs', 'theme.js']) copyFileSync(file, `dist/${file}`);
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 12);
// New deployments must not mix a cached old stylesheet with a new page.
const app = readFileSync('dist/app.js', 'utf8').replace("'./model.mjs'", `'./model.mjs?v=${hash('dist/model.mjs')}'`);
writeFileSync('dist/app.js', app);
let html = readFileSync('dist/index.html', 'utf8');
for (const file of ['style.css', 'app.js', 'theme.js']) html = html.replace(`"${file}"`, `"${file}?v=${hash(`dist/${file}`)}"`);
writeFileSync('dist/index.html', html);
cpSync('data', 'dist/data', { recursive: true, filter: path => !path.endsWith('.tmp') });
console.log('Site dist klasöründe hazır.');
