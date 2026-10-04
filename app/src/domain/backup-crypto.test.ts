import { expect, test } from 'vitest';
import { decryptBackup, encryptBackup, isEncryptedBackup, type EncryptedBackup } from './backup-crypto';
// Implementação do app atual, para garantir que os backups já exportados continuam abrindo.
import legacySource from '../../../js/core/backup-crypto.js?raw';

interface LegacyCrypto {
  encrypt(backup: object, password: string, iterations: number, appVersion: string): Promise<EncryptedBackup>;
  decrypt(wrapper: EncryptedBackup, password: string): Promise<unknown>;
}

function loadLegacy(): LegacyCrypto {
  const window: { crypto: Crypto; TREINO_BACKUP_CRYPTO?: LegacyCrypto } = { crypto: globalThis.crypto };
  new Function('window', 'crypto', legacySource)(window, globalThis.crypto);
  return window.TREINO_BACKUP_CRYPTO!;
}

const backup = { app: 'treino-personalizado', backupVersion: 1, exportedAt: '2026-10-04T12:00:00.000Z', data: { a: '1' } };
const FAST = 100_000; // mínimo aceito, para o teste não demorar

test('criptografa e abre com a mesma senha; senha errada é recusada', async () => {
  const wrapper = await encryptBackup(backup, 'senha forte', '3.0.0', FAST);
  expect(isEncryptedBackup(wrapper)).toBe(true);
  expect(wrapper.ciphertext).not.toContain('treino');
  expect(await decryptBackup(wrapper, 'senha forte')).toEqual(backup);
  await expect(decryptBackup(wrapper, 'outra senha')).rejects.toThrow();
});

test('recusa envelope adulterado ou com parâmetros fracos', async () => {
  const wrapper = await encryptBackup(backup, 's', '3.0.0', FAST);
  await expect(decryptBackup({ ...wrapper, kdf: { ...wrapper.kdf, iterations: 1000 } }, 's')).rejects.toThrow('Formato');
  const ciphertext = (wrapper.ciphertext[0] === 'A' ? 'B' : 'A') + wrapper.ciphertext.slice(1);
  await expect(decryptBackup({ ...wrapper, ciphertext }, 's')).rejects.toThrow();
});

test('compatível nos dois sentidos com o app atual', async () => {
  const legacy = loadLegacy();
  const fromLegacy = await legacy.encrypt(backup, 'senha', FAST, '2.21.1');
  expect(await decryptBackup(fromLegacy, 'senha')).toEqual(backup);
  const fromNew = await encryptBackup(backup, 'senha', '3.0.0', FAST);
  expect(await legacy.decrypt(fromNew, 'senha')).toEqual(backup);
});
