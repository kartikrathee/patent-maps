import { readdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
if (new Set(ids).size !== ids.length) throw new Error('Duplicate HTML IDs');
const app = await readFile(new URL('../dist/app.js', import.meta.url), 'utf8');
for (const match of app.matchAll(/\$\('([^']+)'\)/g)) if (!ids.includes(match[1])) throw new Error(`Missing UI element: ${match[1]}`);
for (const name of await readdir(new URL('../dist/', import.meta.url))) {
  if (name.endsWith('.js')) {
    const result = spawnSync(process.execPath, ['--check', new URL(`../dist/${name}`, import.meta.url).pathname], { stdio: 'inherit' });
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
}
console.log('JavaScript syntax and UI references verified.');
