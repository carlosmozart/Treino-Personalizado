import { expect, test } from 'vitest';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const context = vm.createContext({ window: {} });
vm.runInContext(await readFile(new URL('../../js/ui/backup-status.js', import.meta.url), 'utf8'), context);
test('lembrete respeita cinco check-ins, 14 dias sem backup e sete entre avisos', () => {
  const now = Date.parse('2026-09-28T12:00:00Z');
  const ago = days => new Date(now - days * 86400000).toISOString();
  const data = {}, messages = [], element = {};
  let count = 4;
  const ui = context.window.TREINO_BACKUP_STATUS.create({
    document: { getElementById: () => element }, clock: () => now,
    loadString: key => data[key], saveString: (key, value) => { data[key] = value; },
    getCheckins: () => Object.fromEntries(Array.from({ length: count }, (_, i) => [i, true])),
    formatDateBR: date => date, showToast: message => messages.push(message),
    setTimeout: (callback, delay) => { expect(delay).toBe(2500); callback(); }
  });
  ui.renderBackupStatus(); expect(element.innerHTML).toContain('nenhum backup');
  ui.maybeSuggestBackup(); expect(messages).toHaveLength(0);
  count = 5; data.treino_last_backup_at = ago(13);
  ui.maybeSuggestBackup(); expect(messages).toHaveLength(0);
  data.treino_last_backup_at = ago(14); data.treino_last_backup_nag = ago(6);
  ui.maybeSuggestBackup(); expect(messages).toHaveLength(0);
  data.treino_last_backup_nag = ago(7);
  ui.maybeSuggestBackup(); expect(messages).toHaveLength(1);
  ui.maybeSuggestBackup(); expect(messages).toHaveLength(1);
  ui.renderBackupStatus(); expect(element.innerHTML).toContain('há 14 dias');
  ui.markBackupDone(); expect(data.treino_last_backup_at).toBe(ago(0));
  expect(element.innerHTML).toContain('hoje');
});
