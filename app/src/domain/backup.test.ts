import { expect, test } from 'vitest';
import { buildBackup, readBackup } from './backup';
import { encryptBackup } from './backup-crypto';
import { emptyAppData } from './model';
import { LEGACY_FIXTURE } from './legacy/fixture';
import { migrateLegacy } from './legacy/migrate';
import { parseLegacyData } from './legacy/validate';

const FAST = 100_000;
const legacyBackup = { app: 'treino-personalizado', backupVersion: 1, appVersion: '2.21.1', exportedAt: '2026-10-04T00:00:00.000Z', data: LEGACY_FIXTURE };

test('backup novo vai e volta igual', async () => {
  const data = migrateLegacy(parseLegacyData(LEGACY_FIXTURE)).data;
  const file = buildBackup(data, '3.0.0', new Date('2026-10-04T15:00:00Z'));
  const result = await readBackup(JSON.stringify(file));
  expect(result).toEqual({ kind: 'ok', data, source: 'current', exportedAt: '2026-10-04T15:00:00.000Z' });
});

test('backup antigo v1 é convertido e traz o relatório', async () => {
  const result = await readBackup(JSON.stringify(legacyBackup));
  expect(result.kind).toBe('ok');
  if (result.kind !== 'ok') return;
  expect(result.source).toBe('legacy');
  expect(result.report?.workouts).toBe(7);
  expect(result.data.workouts).toHaveLength(7);
});

test('backup com senha, novo ou antigo: pede a senha e recusa a errada', async () => {
  for (const inner of [buildBackup(emptyAppData(), '3.0.0'), legacyBackup]) {
    const text = JSON.stringify(await encryptBackup(inner, 'segredo', '3.0.0', FAST));
    expect(await readBackup(text)).toEqual({ kind: 'needs-password' });
    expect((await readBackup(text, 'errada')).kind).toBe('invalid');
    expect((await readBackup(text, 'segredo')).kind).toBe('ok');
  }
});

test('recusa arquivos que não são backup do app ou estão corrompidos', async () => {
  const reasons = await Promise.all([
    readBackup('não é json'),
    readBackup(JSON.stringify({ app: 'outro', data: {} })),
    readBackup(JSON.stringify({ app: 'treino-personalizado', backupVersion: 9 })),
    readBackup(JSON.stringify({ ...buildBackup(emptyAppData(), '3.0.0'), data: { schemaVersion: 1, workouts: 'x' } })),
    readBackup(JSON.stringify({ ...legacyBackup, data: { treino_xyz: '{}' } })),
    readBackup('x'.repeat(16 * 1024 * 1024))
  ]);
  expect(reasons.map(r => r.kind)).toEqual(['invalid', 'invalid', 'invalid', 'invalid', 'invalid', 'invalid']);
});
