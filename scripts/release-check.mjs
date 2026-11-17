// Confere se a versão do app novo (app/) está igual em todos os lugares onde ela aparece.
// Usado por scripts/release.mjs e por tests/release-readiness.mjs (que roda no CI).
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const VERSION_RE = /^\d+\.\d+\.\d+$/;

/** 3.31.1 → 33101 (o Android exige um número que só cresce). */
export function versionCodeOf(version) {
  const [major, minor, patch] = version.split('.').map(Number);
  return major * 10000 + minor * 100 + patch;
}

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** "2026-11-16" → "16 de novembro de 2026" (sem zero à esquerda; dia 1 vira "1º"). */
export function longDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d === 1 ? '1º' : d} de ${MONTHS[m - 1]} de ${y}`;
}

/** Os arquivos que carregam a versão, com o que cada um diz. */
export async function readVersions(root) {
  const read = file => readFile(resolve(root, file), 'utf8');
  const [pkg, appPkg, lock, appLock, gradle, changelog, notes, site] = await Promise.all([
    read('package.json'), read('app/package.json'), read('package-lock.json'), read('app/package-lock.json'),
    read('android/app/build.gradle'), read('CHANGELOG.md'), read('app/src/data/release-notes.ts'), read('site/convite/index.html')
  ]);
  const lockOf = text => { const j = JSON.parse(text); return [j.version, j.packages?.['']?.version]; };
  const top = /^## \[(\d+\.\d+\.\d+)\] - (\d{4}-\d{2}-\d{2})/m.exec(changelog);
  return {
    app: JSON.parse(appPkg).version,
    root: JSON.parse(pkg).version,
    lock: lockOf(lock),
    appLock: lockOf(appLock),
    versionName: /versionName "([^"]+)"/.exec(gradle)?.[1],
    versionCode: Number(/versionCode (\d+)/.exec(gradle)?.[1]),
    changelog: top?.[1],
    changelogDate: top?.[2],
    notes: /version: '(\d+\.\d+\.\d+)'/.exec(notes)?.[1],
    notesMonth: /version: '\d+\.\d+\.\d+',\s*date: '(\d{4}-\d{2})'/.exec(notes)?.[1],
    siteVersion: /Versão (\d+\.\d+\.\d+) · /.exec(site)?.[1],
    siteDate: /Versão \d+\.\d+\.\d+ · ([^<]+)</.exec(site)?.[1],
    siteApk: /treino-personalizado-v(\d+\.\d+\.\d+)\.apk/.exec(site)?.[1]
  };
}

/**
 * Lista o que está fora do lugar para a versão dada (ou para a de app/package.json).
 * Lista vazia = pronto para lançar.
 */
export async function checkRelease(root, expected) {
  const v = await readVersions(root);
  const version = expected ?? v.app;
  const problems = [];
  const same = (label, got) => { if (got !== version) problems.push(`${label}: está ${got ?? 'ausente'}, deveria ser ${version}`); };
  if (!VERSION_RE.test(version ?? '')) return { version, problems: [`versão inválida: ${version}`], found: v };
  same('app/package.json', v.app);
  same('package.json', v.root);
  same('package-lock.json (raiz)', v.lock[0]);
  same('package-lock.json (pacote)', v.lock[1]);
  same('app/package-lock.json (raiz)', v.appLock[0]);
  same('app/package-lock.json (pacote)', v.appLock[1]);
  same('android/app/build.gradle versionName', v.versionName);
  if (v.versionCode !== versionCodeOf(version)) problems.push(`android/app/build.gradle versionCode: está ${v.versionCode}, deveria ser ${versionCodeOf(version)}`);
  same('CHANGELOG.md (primeira entrada)', v.changelog);
  same('app/src/data/release-notes.ts (primeira entrada)', v.notes);
  same('site/convite/index.html (versão)', v.siteVersion);
  same('site/convite/index.html (nome do APK)', v.siteApk);
  if (v.changelog === version && v.changelogDate) {
    if (v.siteDate !== longDate(v.changelogDate)) problems.push(`site/convite/index.html (data): está "${v.siteDate}", deveria ser "${longDate(v.changelogDate)}"`);
    if (v.notesMonth !== v.changelogDate.slice(0, 7)) problems.push(`app/src/data/release-notes.ts (mês): está ${v.notesMonth}, deveria ser ${v.changelogDate.slice(0, 7)}`);
  }
  return { version, problems, found: v };
}
