import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const read = (file) => readFile(resolve(root, file), 'utf8');
const notificationsUI = await read('js/ui/notifications.js');
const [html, worker, manifest, pkg, lockfile, gradle, androidManifest, capacitorGradle, capacitorSettings, capacitorConfig, unitTest, deviceTest, mainActivity, backupValidation] = await Promise.all([
  read('index.html'),
  read('sw.js'),
  read('manifest.json'),
  read('package.json'),
  read('package-lock.json'),
  read('android/app/build.gradle'),
  read('android/app/src/main/AndroidManifest.xml'),
  read('android/app/capacitor.build.gradle'),
  read('android/capacitor.settings.gradle'),
  read('capacitor.config.json'),
  read('android/app/src/test/java/com/treinopersonalizado/app/ExampleUnitTest.java'),
  read('android/app/src/androidTest/java/com/treinopersonalizado/app/ExampleInstrumentedTest.java'),
  read('android/app/src/main/java/com/treinopersonalizado/app/MainActivity.java'),
  read('js/core/backup-validation.js')
]);

const appVersion = html.match(/const APP_VERSION = '([^']+)'/)?.[1];
for (const module of ['js/ui/notifications.js', 'js/ui/rest-timer.js',
  'js/ui/release-notes.js', 'js/ui/onboarding.js', 'js/ui/modal-accessibility.js', 'js/ui/app-lifecycle.js',
  'js/core/history-storage.js', 'js/core/local-persistence.js', 'js/core/workout-duration.js',
  'js/ui/tooltips.js', 'js/ui/confirmation.js', 'js/ui/app-feedback.js', 'js/ui/clipboard.js',
  'js/core/initial-migrations.js', 'js/core/history-queries.js', 'js/ui/workout-summary.js',
  'js/core/workout-calories.js', 'js/ui/workout-controls.js', 'data/seed-workouts.js']) {
  assert.ok(html.includes(`src="${module}"`), `${module} deve ser carregado pelo app.`);
  assert.ok(worker.includes(`'./${module}'`), `${module} deve estar disponível offline.`);
}
const cacheVersion = worker.match(/CACHE_NAME = 'treino-cache-v([^']+)'/)?.[1];
const packageVersion = JSON.parse(pkg).version;
const lockVersion = JSON.parse(lockfile).version;
const androidVersion = gradle.match(/versionName "([^"]+)"/)?.[1];
assert.ok(appVersion, 'APP_VERSION deve existir no index.html.');
assert.equal(cacheVersion, appVersion, 'Versão do cache PWA deve acompanhar o app.');
// A partir da 3.0.0 o APK leva o app novo (app/): package, lockfile e Android acompanham a
// versão dele; o index.html da raiz segue na 2.x enquanto o GitHub Pages servir o app antigo.
const shippedVersion = Number(packageVersion.split('.')[0]) >= 3
  ? JSON.parse(await readFile(new URL('../app/package.json', import.meta.url), 'utf8')).version
  : appVersion;
assert.equal(packageVersion, shippedVersion, 'Versão do package deve acompanhar o app publicado.');
assert.equal(lockVersion, shippedVersion, 'Versão do lockfile deve acompanhar o app publicado.');
assert.equal(androidVersion, shippedVersion, 'Versão do Android deve acompanhar o app publicado.');

const applicationId = gradle.match(/applicationId "([^"]+)"/)?.[1];
assert.equal(applicationId, 'com.treinopersonalizado.app', 'Identificador Android inesperado.');
assert.match(unitTest, /BuildConfig\.APPLICATION_ID/, 'Teste unitário deve proteger o identificador.');
assert.match(deviceTest, /com\.treinopersonalizado\.app/, 'Teste em aparelho deve conferir o identificador.');
assert.match(androidManifest, /android:screenOrientation="portrait"/, 'Android deve respeitar o layout retrato.');
assert.match(androidManifest, /android:windowSoftInputMode="adjustResize"/, 'Teclado Android deve redimensionar a tela.');
assert.match(androidManifest, /<uses-permission android:name="android\.permission\.SCHEDULE_EXACT_ALARM"\s*\/>/, 'O fim do descanso precisa poder usar alarmes exatos.');
assert.match(capacitorGradle, /capacitor-local-notifications/, 'Plugin de notificações deve entrar no app Android.');
assert.match(capacitorSettings, /capacitor-local-notifications/, 'Plugin de notificações deve ser registrado no Gradle.');
assert.match(capacitorConfig, /"LocalNotifications"/, 'Ícone de notificações deve estar configurado.');
assert.match(pkg, /@capacitor\/local-notifications/, 'Pacote de notificações deve permanecer instalado.');
assert.match(notificationsUI, /isExactNotification: false/, 'Lembretes semanais devem evitar alarmes exatos sem necessidade.');
assert.match(notificationsUI, /id: REST_NOTIFICATION_ID,[\s\S]*isExactNotification: true/, 'O aviso de descanso deve usar alarme exato.');
assert.match(notificationsUI, /REST_NOTIFICATION_CHANNEL_ID = 'treino-descanso-v3'/, 'O descanso precisa de canal próprio de alarme.');
assert.match(mainActivity, /AudioAttributes\.USAGE_ALARM/, 'Canal de descanso precisa usar o volume de alarmes do Android.');
assert.match(mainActivity, /RingtoneManager\.TYPE_ALARM/, 'Canal de descanso precisa usar toque de alarme.');
for (const [suffix, sound, vibrate] of [['-sound', true, false], ['-vibrate', false, true], ['-silent', false, false]]) {
  assert.ok(mainActivity.includes(`REST_CHANNEL_ID + "${suffix}"`) &&
    new RegExp(`"${suffix}"[^\\n]+${sound}, ${vibrate}\\)`).test(mainActivity), 'Canais de descanso devem cobrir cada combinação de som/vibração.');
}
assert.match(mainActivity, /channel\.enableVibration\(vibrate\)/, 'O canal deve respeitar a preferência de vibração.');
assert.match(mainActivity, /channel\.setSound\(sound \?[^\n]+: null, attributes\)/, 'Canais sem som devem ser explicitamente silenciosos.');
assert.match(notificationsUI, /checkExactNotificationSetting/, 'O app precisa verificar a autorização de alarmes exatos.');
assert.match(notificationsUI, /weekday: \(DAY_ORDER\.indexOf\(day\) \+ 1\) % 7 \+ 1/, 'Lembretes devem usar dias entre 1 (domingo) e 7 (sábado).');

assert.match(html, /const MAX_BACKUP_BYTES = 15 \* 1024 \* 1024/, 'Importação precisa limitar o tamanho do backup.');
const backupUI = await read('js/ui/backup.js');
assert.match(html, /js\/ui\/backup\.js/, 'Interface de backup deve carregar o módulo.');
assert.match(worker, /js\/ui\/backup\.js/, 'Interface de backup deve estar disponível offline.');
assert.match(backupUI, /file\.size > MAX_BACKUP_BYTES/, 'Limite do backup deve ser conferido antes da leitura.');
assert.match(backupUI, /pendingImport\.backupVersion !== 1/, 'Versão do backup deve ser conferida na restauração.');
assert.match(backupUI, /type: isIOS\(\) \? 'text\/plain' : 'application\/json'/, 'Compartilhamento no iOS precisa usar texto simples com prévia.');
assert.match(html, /js\/core\/backup-validation\.js/, 'A validação de backup precisa ficar em módulo próprio.');
assert.match(worker, /js\/core\/backup-validation\.js/, 'A validação de backup precisa funcionar offline.');
assert.match(backupValidation, /isValidData/, 'Módulo de backup precisa validar dados importados.');

assert.match(html, /:focus-visible\s*\{[\s\S]*outline:/, 'Foco visível é obrigatório.');
assert.match(html, /id="toast" role="status" aria-live="polite"/, 'Toast deve anunciar mensagens assistivas.');
assert.match(html, /id="bottomNav" aria-label="Navegação principal"/, 'Navegação precisa ter nome acessível.');
const exerciseCards = await read('js/ui/exercise-cards.js');
assert.ok(html.includes('src="js/ui/exercise-cards.js"'), 'Cartões devem carregar o módulo.');
assert.ok(worker.includes('./js/ui/exercise-cards.js'), 'Cartões devem funcionar offline.');
assert.match(exerciseCards, /aria-label="Procurar exercício para substituir/, 'Botão de troca precisa ter nome acessível.');

const webManifest = JSON.parse(manifest);
assert.equal(webManifest.display, 'standalone', 'Manifest precisa manter modo de app.');
assert.equal(webManifest.orientation, 'portrait', 'Manifest precisa manter orientação retrato.');

// O Tailwind é pré-compilado: toda classe usada precisa existir no <style>, senão fica inerte.
{
  const { readdir } = await import('node:fs/promises');
  const css = (html.match(/<style[^>]*>[\s\S]*?<\/style>/g) || []).join('');
  const uiFiles = ['index.html',
    ...(await readdir(resolve(root, 'js'))).filter((f) => f.endsWith('.js')).map((f) => `js/${f}`),
    ...(await readdir(resolve(root, 'js/ui'))).map((f) => `js/ui/${f}`)];
  const prefix = /^-?(bg|text|border|p[xytblr]?|m[xytblr]?|w|h|min|max|gap|space|z|flex|grid|rounded|shadow|ring|focus|focus-visible|active|hover|left|right|top|bottom|inset|translate|opacity|font|leading|tracking|items|justify|overflow|whitespace|break|underline|stroke|scale|shrink)\b/;
  const missing = new Set();
  for (const file of uiFiles) {
    const source = await read(file);
    for (const match of source.matchAll(/class(?:Name)?\s*[=:]\s*["`']([^"`']+)["`']/g)) {
      for (const cls of match[1].split(/\s+/)) {
        if (!cls || /[${}<>]/.test(cls) || !/[-:]/.test(cls) || !prefix.test(cls)) continue;
        const sel = '.' + cls.replace(/[:\[\]\/.%#!(),]/g, (ch) => '\\' + ch);
        if (![...'{,: >'].some((end) => css.includes(sel + end))) missing.add(`${cls} (${file})`);
      }
    }
  }
  assert.deepEqual([...missing], [], 'Classes usadas sem definição no CSS compilado.');
  assert.ok(!/text-\[[5-8]px\]/.test(html + (await Promise.all(uiFiles.map(read))).join('')), 'Fontes abaixo de 9px prejudicam a leitura no celular.');
}

console.log(`Prontidão de release validada: v${appVersion}.`);
