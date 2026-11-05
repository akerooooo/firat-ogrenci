import { mkdirSync, copyFileSync, cpSync } from 'node:fs';
mkdirSync('dist', { recursive: true });
for (const file of ['index.html', 'style.css', 'app.js', 'model.mjs']) copyFileSync(file, `dist/${file}`);
cpSync('data', 'dist/data', { recursive: true, filter: path => !path.endsWith('.tmp') });
console.log('Site dist klasöründe hazır.');
