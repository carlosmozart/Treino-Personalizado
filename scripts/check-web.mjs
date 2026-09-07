import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const html = await readFile(resolve(root, 'index.html'), 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/i);
if (!scriptMatch) throw new Error('Script principal não encontrado no index.html.');

const appVersion = html.match(/const APP_VERSION = '([^']+)'/)?.[1];
const worker = await readFile(resolve(root, 'sw.js'), 'utf8');
const cacheVersion = worker.match(/CACHE_NAME = 'treino-cache-v([^']+)'/)?.[1];
if (!appVersion || appVersion !== cacheVersion) {
  throw new Error(`Versões divergentes: app=${appVersion || '?'} cache=${cacheVersion || '?'}.`);
}

const tempFile = resolve(root, '.tmp-inline-check.js');
await (await import('node:fs/promises')).writeFile(tempFile, scriptMatch[1]);
try {
  for (const file of [tempFile, resolve(root, 'sw.js')]) {
    const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
    if (result.status !== 0) throw new Error(`Falha de sintaxe em ${file}.`);
  }
} finally {
  await (await import('node:fs/promises')).rm(tempFile, { force: true });
}

JSON.parse(await readFile(resolve(root, 'manifest.json'), 'utf8'));
console.log(`Verificação concluída: versão ${appVersion}.`);
