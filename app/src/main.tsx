import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { isNative } from './platform/platform';
import { flushOnHide, syncController, useAppStore } from './store';
import { listenBack } from './store/ui-store';
import { installGlobalErrorHandlers, useErrorLog } from './platform/error-log';
import { startAutoBackup } from './platform/auto-backup';
import { keepFocusedFieldVisible } from './platform/keyboard';
import { useUpdate } from './platform/app-update';
import { startRemindersSync } from './features/plan/reminders-sync';
import { autoSaveBackupFile, canAutoBackup } from './platform/backup-file';
import './index.css';

installGlobalErrorHandlers();
void useAppStore.getState().init().then(() => {
  syncController.start();
  startRemindersSync();
  void useUpdate.getState().check(false);
});
flushOnHide();
listenBack();
if (isNative()) keepFocusedFieldVisible();
if (canAutoBackup()) {
  startAutoBackup({
    subscribe: listener => useAppStore.subscribe((s, p) => { if (s.data !== p.data) listener(s.data, p.data); }),
    save: (name, content) => autoSaveBackupFile(name, content),
    onError: e => useErrorLog.getState().report(e, 'Backup automático'),
    appVersion: __APP_VERSION__
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Cache offline só no navegador/PWA: no APK os arquivos já vêm dentro do pacote.
if (!isNative() && 'serviceWorker' in navigator) {
  void import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }));
}
