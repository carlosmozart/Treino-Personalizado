import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const read = (file) => readFile(resolve(root, file), 'utf8');
const [html, worker, manifest, pkg, lockfile, gradle, androidManifest, unitTest, deviceTest] = await Promise.all([
  read('index.html'),
  read('sw.js'),
  read('manifest.json'),
  read('package.json'),
  read('package-lock.json'),
  read('android/app/build.gradle'),
  read('android/app/src/main/AndroidManifest.xml'),
  read('android/app/src/test/java/com/treinopersonalizado/app/ExampleUnitTest.java'),
  read('android/app/src/androidTest/java/com/treinopersonalizado/app/ExampleInstrumentedTest.java')
]);

const appVersion = html.match(/const APP_VERSION = '([^']+)'/)?.[1];
const cacheVersion = worker.match(/CACHE_NAME = 'treino-cache-v([^']+)'/)?.[1];
const packageVersion = JSON.parse(pkg).version;
const lockVersion = JSON.parse(lockfile).version;
const androidVersion = gradle.match(/versionName "([^"]+)"/)?.[1];
assert.ok(appVersion, 'APP_VERSION deve existir no index.html.');
assert.equal(cacheVersion, appVersion, 'Versão do cache PWA deve acompanhar o app.');
assert.equal(packageVersion, appVersion, 'Versão do package deve acompanhar o app.');
assert.equal(lockVersion, appVersion, 'Versão do lockfile deve acompanhar o app.');
assert.equal(androidVersion, appVersion, 'Versão do Android deve acompanhar o app.');

const applicationId = gradle.match(/applicationId "([^"]+)"/)?.[1];
assert.equal(applicationId, 'com.treinopersonalizado.app', 'Identificador Android inesperado.');
assert.match(unitTest, /BuildConfig\.APPLICATION_ID/, 'Teste unitário deve proteger o identificador.');
assert.match(deviceTest, /com\.treinopersonalizado\.app/, 'Teste em aparelho deve conferir o identificador.');
assert.match(androidManifest, /android:screenOrientation="portrait"/, 'Android deve respeitar o layout retrato.');
assert.match(androidManifest, /android:windowSoftInputMode="adjustResize"/, 'Teclado Android deve redimensionar a tela.');

assert.match(html, /const MAX_BACKUP_BYTES = 15 \* 1024 \* 1024/, 'Importação precisa limitar o tamanho do backup.');
assert.match(html, /file\.size > MAX_BACKUP_BYTES/, 'Limite do backup deve ser conferido antes da leitura.');
assert.match(html, /pendingImport\.backupVersion !== 1/, 'Versão do backup deve ser conferida na restauração.');

assert.match(html, /:focus-visible\s*\{[\s\S]*outline:/, 'Foco visível é obrigatório.');
assert.match(html, /id="toast" role="status" aria-live="polite"/, 'Toast deve anunciar mensagens assistivas.');
assert.match(html, /id="bottomNav" aria-label="Navegação principal"/, 'Navegação precisa ter nome acessível.');
assert.match(html, /aria-label="Procurar exercício para substituir/, 'Botão de troca precisa ter nome acessível.');

const webManifest = JSON.parse(manifest);
assert.equal(webManifest.display, 'standalone', 'Manifest precisa manter modo de app.');
assert.equal(webManifest.orientation, 'portrait', 'Manifest precisa manter orientação retrato.');

console.log(`Prontidão de release validada: v${appVersion}.`);
