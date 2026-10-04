import { expect, test } from 'vitest';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const context = vm.createContext({ window: {} });
vm.runInContext(await readFile(new URL('../../js/ui/backup.js', import.meta.url), 'utf8'), context);

function setup(BackupFile) {
  const toasts = [], saved = [];
  let done = 0;
  const ui = context.window.TREINO_BACKUP_UI.create({
    window: {}, document: {}, navigator: {}, isIOS: () => false,
    buildBackupObject: () => ({ app: 'treino-personalizado', data: {} }),
    backupFileName: () => 'treino-backup-2026-10-04.json',
    markBackupDone: () => { done++; }, showToast: m => toasts.push(m),
    nativeBackupFile: () => BackupFile && { save: async args => { saved.push(args); return BackupFile(args); } }
  });
  return { ui, toasts, saved, done: () => done };
}

test('no APK salva pelo seletor do Android e só então confirma', async () => {
  const t = setup(async () => ({ uri: 'content://x' }));
  await t.ui.exportBackup();
  expect(t.saved[0].fileName).toBe('treino-backup-2026-10-04.json');
  expect(JSON.parse(t.saved[0].content).app).toBe('treino-personalizado');
  expect(t.done()).toBe(1);
  expect(t.toasts).toEqual(['✅ Backup salvo! Guarde num lugar seguro.']);
});

test('cancelar o seletor não avisa nada nem marca backup feito', async () => {
  const t = setup(async () => { throw Object.assign(new Error('x'), { code: 'CANCELLED' }); });
  await t.ui.exportBackup();
  expect(t.done()).toBe(0);
  expect(t.toasts).toEqual([]);
});

test('falha ao gravar avisa o erro em vez de sucesso', async () => {
  const t = setup(async () => { throw Object.assign(new Error('x'), { code: 'WRITE_FAILED' }); });
  await t.ui.exportBackup();
  expect(t.done()).toBe(0);
  expect(t.toasts[0]).toContain('Não foi possível salvar');
});
