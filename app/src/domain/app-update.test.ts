import { expect, test } from 'vitest';
import { compareVersions, isNewer, parseRelease } from './app-update';
import { remindersFor, parseTrainingTime } from './reminders';
import { samplePlan } from './testing';

const SHA = 'a'.repeat(64);
const release = (extra: object = {}) => ({
  tag_name: 'v3.0.0', body: 'Notas',
  assets: [{ name: 'treino-personalizado-v3.0.0.apk', browser_download_url: 'https://github.com/carlosmozart/Treino-Personalizado/releases/download/v3.0.0/x.apk', digest: `sha256:${SHA}`, size: 6_000_000 }],
  ...extra
});

test('compara versões numericamente', () => {
  expect(compareVersions('2.20.10', '2.20.9')).toBe(1);
  expect(compareVersions('v3.0.0', '3.0.0-dev')).toBe(0);
  expect(compareVersions('2.21.2', '3.0.0')).toBe(-1);
});

test('lê a release: APK do repositório e SHA-256; recusa rascunho, outra origem e sem hash', () => {
  expect(parseRelease(release())).toMatchObject({ version: '3.0.0', sha256: SHA, size: 6_000_000 });
  expect(parseRelease(release({ draft: true }))).toBeNull();
  expect(parseRelease(release({ assets: [{ name: 'x.apk', browser_download_url: 'https://evil.example/x.apk', digest: `sha256:${SHA}` }] }))).toBeNull();
  const noDigest = release({ assets: [{ name: 'x.apk', browser_download_url: 'https://github.com/carlosmozart/Treino-Personalizado/releases/download/v3/x.apk' }] });
  expect(parseRelease(noDigest)).toBeNull();
  expect(parseRelease({ ...noDigest, body: `SHA-256: \`${SHA}\`` })?.sha256).toBe(SHA);
  expect(isNewer(parseRelease(release()), '2.21.2')).toBe(true);
  expect(isNewer(parseRelease(release()), '3.0.0')).toBe(false);
});

test('lembretes: dias obrigatórios com exercícios, no horário do plano', () => {
  const plan = { ...samplePlan(), trainingTime: '12:15' };
  plan.days.SAB = { ...plan.days.SAB, optional: true };
  const list = remindersFor(plan);
  expect(list.map(r => r.dayKey)).toEqual(['SEG', 'TER', 'QUA', 'QUI', 'SEX']);
  expect(list[0]).toEqual({ id: 4100, dayKey: 'SEG', weekday: 2, hour: 12, minute: 15, body: 'Hoje: Treino SEG' });
  expect(remindersFor({ ...plan, trainingTime: '' })).toEqual([]);
  expect(parseTrainingTime('25:00')).toBeNull();
});
