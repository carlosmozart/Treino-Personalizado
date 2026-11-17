#!/usr/bin/env node
// Lançamento do app novo (app/) num comando só.
//
//   node scripts/release.mjs --check                 confere a versão atual em todos os arquivos
//   node scripts/release.mjs 3.32.0                  prepara: sobe a versão nos arquivos e roda os testes
//   node scripts/release.mjs 3.32.0 --commit --title "resumo curto"
//   node scripts/release.mjs 3.32.0 --publish        envia, gera o APK no GitHub e confere o que foi publicado
//
// Antes de preparar, escreva à mão as novidades: a entrada "## [3.32.0] - AAAA-MM-DD" no
// CHANGELOG.md e a entrada da versão no topo de app/src/data/release-notes.ts. O resto (os dois
// package.json, os dois package-lock.json, o build.gradle e a página de convite) o script faz.
//
// O commit de lançamento nunca leva a linha "license" dos package.json: ela fica só na máquina
// até os dois sócios confirmarem a licença.
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkRelease, longDate, readVersions, VERSION_RE, versionCodeOf } from './release-check.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RELEASE_FILES = ['CHANGELOG.md', 'android/app/build.gradle', 'app/package-lock.json', 'app/package.json',
  'app/src/data/release-notes.ts', 'package-lock.json', 'package.json', 'site/convite/index.html'];
const LICENSE_FILES = ['package.json', 'app/package.json'];
const LICENSE_LINE = /^[ \t]*"license":[^\n]*\r?\n/m;
const WORKFLOW = 'android-release-apk.yml';

const args = process.argv.slice(2);
const flag = name => args.includes(`--${name}`);
const value = name => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const version = args.find(a => VERSION_RE.test(a));

const say = text => console.log(text);
const fail = text => { console.error(`\nParou: ${text}`); process.exit(1); };
const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8' }).trim();
const gh = (...a) => execFileSync('gh', a, { cwd: root, encoding: 'utf8' }).trim();
const path = file => resolve(root, file);
const read = file => readFileSync(path(file), 'utf8');

/** Roda um comando mostrando a saída; para tudo se ele falhar. */
function run(label, command, cwd = root) {
  say(`\n› ${label}`);
  const r = spawnSync(command, { cwd, shell: true, stdio: 'inherit' });
  if (r.status !== 0) fail(`"${label}" falhou.`);
}

function edit(file, change) {
  const before = read(file);
  const after = change(before);
  if (after !== before) writeFileSync(path(file), after);
  return after !== before;
}

async function report(expected) {
  const { version: v, problems } = await checkRelease(root, expected);
  if (problems.length) {
    say(`\nVersão ${v}: ${problems.length} ${problems.length === 1 ? 'ponto fora do lugar' : 'pontos fora do lugar'}:`);
    for (const p of problems) say(`  - ${p}`);
  } else say(`\nVersão ${v}: igual em todos os arquivos.`);
  return problems;
}

/** Sobe a versão nos arquivos numéricos e na página de convite. */
async function prepare() {
  const found = await readVersions(root);
  if (found.changelog !== version) fail(`o CHANGELOG.md ainda não tem a entrada "## [${version}] - AAAA-MM-DD" no topo (a primeira é ${found.changelog}).`);
  if (found.notes !== version) fail(`app/src/data/release-notes.ts ainda não tem a entrada da ${version} no topo (a primeira é ${found.notes}).`);
  const date = found.changelogDate;
  const json = text => text.replace(/("version":\s*")\d+\.\d+\.\d+(")/, `$1${version}$2`);
  // no lockfile a versão do próprio pacote aparece duas vezes: na raiz e em packages[""]
  const lock = text => { let n = 0; return text.replace(/("version":\s*")\d+\.\d+\.\d+(")/g, (m, a, b) => (n++ < 2 ? `${a}${version}${b}` : m)); };
  const changed = [
    ['package.json', json], ['app/package.json', json], ['package-lock.json', lock], ['app/package-lock.json', lock],
    ['android/app/build.gradle', t => t.replace(/versionCode \d+/, `versionCode ${versionCodeOf(version)}`).replace(/versionName "[^"]+"/, `versionName "${version}"`)],
    ['site/convite/index.html', t => t.replace(/Versão \d+\.\d+\.\d+ · [^<]+</, `Versão ${version} · ${longDate(date)}<`)
      .replace(/treino-personalizado-v\d+\.\d+\.\d+\.apk/g, `treino-personalizado-v${version}.apk`)]
  ].filter(([file, change]) => edit(file, change)).map(([file]) => file);
  say(changed.length ? `\nVersão ${version} (${date}) gravada em: ${changed.join(', ')}.` : `\nOs arquivos já estavam na ${version}.`);
  if ((await report(version)).length) fail('a versão não ficou igual em todos os arquivos.');
}

function tests() {
  run('Conferência de lançamento', 'node tests/release-readiness.mjs');
  run('Tipos', 'npx tsc -b --noEmit', path('app'));
  run('Testes unitários', 'npx vitest run', path('app'));
  run('Build', 'npm run build', path('app'));
  run('Testes de tela', 'npx playwright test', path('app'));
}

/** Commit de lançamento só com os arquivos da versão, e sem a linha da licença. */
function commit() {
  const title = value('title');
  if (!title) fail('falta --title "resumo curto" para a mensagem do commit.');
  if (git('diff', '--cached', '--name-only')) fail('já existe algo preparado para commit (git add). Desfaça ou commite antes.');
  const dirty = git('diff', '--name-only').split('\n').filter(Boolean);
  const outside = dirty.filter(f => !RELEASE_FILES.includes(f));
  if (outside.length) fail(`há mudanças fora do lançamento, commite antes: ${outside.join(', ')}.`);
  for (const file of RELEASE_FILES) {
    if (!LICENSE_FILES.includes(file)) { git('add', '--', file); continue; }
    // entra no commit o arquivo sem a linha da licença; o da pasta continua com ela
    const clean = read(file).replace(LICENSE_LINE, '');
    const hash = execFileSync('git', ['hash-object', '-w', '--path', file, '--stdin'], { cwd: root, input: clean, encoding: 'utf8' }).trim();
    git('update-index', '--cacheinfo', `100644,${hash},${file}`);
  }
  const staged = git('diff', '--cached');
  if (/^\+.*"license"/m.test(staged)) fail('a linha da licença ia entrar no commit. Nada foi commitado; rode "git reset" para desfazer a preparação.');
  if (!staged) fail('não há nada para commitar: a versão já foi commitada?');
  const trailer = value('trailer');
  const message = `release: ${version} — ${title}${trailer ? `\n\n${trailer}` : ''}`;
  execFileSync('git', ['commit', '-q', '-F', '-'], { cwd: root, input: message });
  say(`\nCommit feito: ${git('log', '--oneline', '-1')}`);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Envia, dispara o APK, espera e confere o que ficou publicado. */
async function publish() {
  const subject = git('log', '-1', '--format=%s');
  if (!subject.startsWith(`release: ${version} `)) fail(`o último commit não é o lançamento da ${version} ("${subject}"). Rode com --commit antes.`);
  if ((await report(version)).length) fail('a versão não está igual em todos os arquivos.');
  const sha = git('rev-parse', 'HEAD');
  run('Enviando para o GitHub', 'git push');
  const before = new Date(Date.now() - 5000).toISOString();
  run('Disparando o APK', `gh workflow run ${WORKFLOW} --ref main -f app=novo -f publish=true`);
  let id;
  for (let i = 0; i < 12 && !id; i++) {
    await sleep(5000);
    const runs = JSON.parse(gh('run', 'list', '--workflow', WORKFLOW, '--limit', '5', '--json', 'databaseId,headSha,createdAt'));
    id = runs.find(r => r.headSha === sha && r.createdAt >= before)?.databaseId;
  }
  if (!id) fail('não achei a execução do APK no GitHub. Veja em "gh run list".');
  say(`\n› Gerando o APK (execução ${id}); costuma levar uns 5 minutos`);
  for (;;) {
    const r = JSON.parse(gh('run', 'view', String(id), '--json', 'status,conclusion'));
    if (r.status === 'completed') { if (r.conclusion !== 'success') fail(`o APK não foi gerado (${r.conclusion}). Veja "gh run view ${id} --log-failed".`); break; }
    await sleep(20000);
  }
  await verify(sha);
}

/** A release é a mais recente, o APK baixado bate com o SHA-256 dela, e as execuções do commit passaram. */
async function verify(sha = git('rev-parse', 'HEAD')) {
  const tag = `v${version}`;
  const latest = JSON.parse(gh('release', 'list', '--limit', '5', '--json', 'tagName,isLatest')).find(r => r.isLatest)?.tagName;
  if (latest !== tag) fail(`a release mais recente no GitHub é ${latest}, não ${tag}.`);
  const apk = JSON.parse(gh('release', 'view', tag, '--json', 'assets')).assets.find(a => a.name.endsWith('.apk'));
  if (!apk) fail(`a release ${tag} não tem APK.`);
  const dir = mkdtempSync(join(tmpdir(), 'tp-release-'));
  try {
    gh('release', 'download', tag, '--pattern', '*.apk', '--dir', dir);
    const file = readdirSync(dir).find(f => f.endsWith('.apk'));
    const sum = createHash('sha256').update(readFileSync(join(dir, file))).digest('hex');
    if (`sha256:${sum}` !== apk.digest) fail(`o SHA-256 do APK baixado (${sum}) não bate com o da release (${apk.digest}).`);
    say(`\nRelease ${tag}: a mais recente; ${apk.name}, SHA-256 ${sum} (confere).`);
  } finally { rmSync(dir, { recursive: true, force: true }); }
  const runs = JSON.parse(gh('run', 'list', '--commit', sha, '--json', 'name,status,conclusion'));
  for (const r of runs) say(`  ${r.name}: ${r.status === 'completed' ? r.conclusion : r.status}`);
  const bad = runs.filter(r => r.status === 'completed' && r.conclusion !== 'success');
  if (bad.length) fail(`falhou no GitHub: ${bad.map(r => r.name).join(', ')}.`);
  if (runs.some(r => r.status !== 'completed')) say('  (ainda há execução em andamento; rode de novo com --verify para conferir)');
  say(`\nLançado: ${version}. Falta atualizar o HANDOFF e o roadmap.`);
}

if (flag('check')) process.exit((await report(version)).length ? 1 : 0);
if (!version) fail('diga a versão, por exemplo: node scripts/release.mjs 3.32.0 (ou --check para só conferir).');
if (flag('verify')) await verify();
else if (flag('publish') && !flag('commit')) await publish();
else {
  await prepare();
  if (!flag('skip-tests')) tests();
  if (flag('commit')) commit();
  if (flag('publish')) await publish();
  else say(flag('commit') ? `\nPróximo passo: node scripts/release.mjs ${version} --publish` : `\nPróximo passo: node scripts/release.mjs ${version} --commit --title "resumo curto"`);
}
