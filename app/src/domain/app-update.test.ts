import { expect, test } from 'vitest';
import { compareVersions, isNewer, parseRelease } from './app-update';
import { remindersFor, parseTrainingTime } from './reminders';
import { samplePlan, workout } from './testing';

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

test('M47: lembretes por data nos dias obrigatórios com exercícios, no horário do plano', () => {
  const plan = { ...samplePlan(), trainingTime: '12:15' };
  plan.days.SAB = { ...plan.days.SAB, optional: true };
  const now = new Date(2026, 9, 5, 8); // segunda, 08:00
  const list = remindersFor(plan, { now });
  // 14 dias: segunda a sexta das duas semanas (sábado opcional, domingo sem exercícios)
  expect(list.map(r => r.date)).toEqual(['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16']);
  expect(list[0]).toEqual({ id: 4100, date: '2026-10-05', at: new Date(2026, 9, 5, 12, 15), body: 'Hoje: Treino SEG' });
  expect(list[5]!.id).toBe(4107);
  expect(remindersFor({ ...plan, trainingTime: '' }, { now })).toEqual([]);
  expect(parseTrainingTime('25:00')).toBeNull();
});

test('M47: sem lembrete no dia que já teve treino, no dia com nota de sem treino e no horário que já passou', () => {
  const plan = { ...samplePlan(), trainingTime: '12:15' };
  const dates = (ctx: Parameters<typeof remindersFor>[1]) => remindersFor(plan, ctx).map(r => r.date).slice(0, 3);
  const segunda = new Date(2026, 9, 5, 8);
  expect(dates({ now: segunda, workouts: [workout('2026-10-05', 'Supino', [[10, 40]])] })).toEqual(['2026-10-06', '2026-10-07', '2026-10-08']);
  expect(dates({ now: segunda, dayNotes: { '2026-10-06': { reason: 'doente' } } })).toEqual(['2026-10-05', '2026-10-07', '2026-10-08']);
  expect(dates({ now: new Date(2026, 9, 5, 13) })).toEqual(['2026-10-06', '2026-10-07', '2026-10-08']);
});
