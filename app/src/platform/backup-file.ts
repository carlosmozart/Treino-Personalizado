// Gravação do arquivo de backup: no APK pelo plugin nativo BackupFile (o WebView ignora links de
// download — bug corrigido no app antigo na 2.21.2); no navegador, download comum.
import { isNative } from './platform';

interface BackupFilePlugin {
  save(o: { fileName: string; content: string }): Promise<{ uri: string }>;
  autoSave(o: { fileName: string; content: string; keep: number }): Promise<{ uri: string }>;
}

function plugin(): BackupFilePlugin | undefined {
  return (globalThis as { Capacitor?: { Plugins?: { BackupFile?: BackupFilePlugin } } }).Capacitor?.Plugins?.BackupFile;
}

const errorCode = (e: unknown) => (e && typeof e === 'object' && 'code' in e ? String((e as { code: unknown }).code) : '');

/** Salva escolhendo o destino. 'cancelled' quando a pessoa fecha o seletor. */
export async function saveBackupFile(fileName: string, content: string): Promise<'saved' | 'cancelled'> {
  const native = isNative() ? plugin() : undefined;
  if (native) {
    try { await native.save({ fileName, content }); return 'saved'; }
    catch (e) { if (errorCode(e) === 'CANCELLED') return 'cancelled'; throw e; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return 'saved';
}

/** Backup automático só existe no APK (O11). */
export const canAutoBackup = () => isNative() && !!plugin();

export async function autoSaveBackupFile(fileName: string, content: string, keep = 7): Promise<void> {
  const native = plugin();
  if (!isNative() || !native) return;
  await native.autoSave({ fileName, content, keep });
}
