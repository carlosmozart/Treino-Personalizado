import { expect, test } from 'vitest';
import { dataStatus } from './data-status';

const NOW = new Date(2026, 9, 21, 12);

test('N14: no APK, com cópia automática e backup recente', () => {
  const st = dataStatus({ native: true, autoBackup: true, lastBackupAt: new Date(2026, 9, 20, 9).toISOString(), now: NOW });
  expect(st.where).toContain('Neste celular');
  expect(st.copy).toContain('Downloads/TreinoPersonalizado');
  expect(st.backup).toMatch(/^Último backup: ontem/);
  expect(st.stale).toBe(false);
});

test('N14: na web, sem backup nenhum, avisa', () => {
  const st = dataStatus({ native: false, autoBackup: false, lastBackupAt: null, now: NOW });
  expect(st.where).toContain('navegador');
  expect(st.copy).toContain('Sem cópia automática');
  expect(st.backup).toBe('Você ainda não fez nenhum backup.');
  expect(st.stale).toBe(true);
});

test('N14: backup de mais de duas semanas fica marcado; APK com a cópia desligada diz isso', () => {
  const st = dataStatus({ native: true, autoBackup: false, lastBackupAt: new Date(2026, 9, 1, 9).toISOString(), now: NOW });
  expect(st.backup).toMatch(/^Último backup: há 20 dias/);
  expect(st.stale).toBe(true);
  expect(st.copy).toBe('Cópia automática desligada.');
  expect(dataStatus({ native: true, autoBackup: true, lastBackupAt: NOW.toISOString(), now: NOW }).backup).toMatch(/hoje/);
});
