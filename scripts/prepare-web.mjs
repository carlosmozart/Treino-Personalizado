import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const webDir = resolve(root, 'www');

// "www" é sempre uma saída gerada. O app fonte continua nos arquivos na raiz, o que mantém
// o PWA publicado e o APK sincronizados sem duplicar código manualmente.
await rm(webDir, { recursive: true, force: true });
await mkdir(webDir, { recursive: true });

for (const file of ['index.html', 'manifest.json', 'sw.js']) {
  await cp(resolve(root, file), resolve(webDir, file));
}
await cp(resolve(root, 'icons'), resolve(webDir, 'icons'), { recursive: true });

console.log('Arquivos web preparados em www/.');
