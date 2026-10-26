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
import { startDayWatcher, useToday } from './hooks/use-today';
import { dailyCheck } from './domain/actions';
import { autoSaveBackupFile, canAutoBackup } from './platform/backup-file';
import { applyAccent, applySeason, applyTheme, PUMPKIN, watchSystemTheme } from './ui/theme';
import { halloweenColors } from './domain/seasonal';
import './index.css';

installGlobalErrorHandlers();
watchSystemTheme();
// aplica o tema salvo sempre que a escolha muda (inclusive ao carregar e ao restaurar um backup)
useAppStore.subscribe((s, p) => {
  const t = s.data?.settings.theme;
  if (!p.data || t !== p.data.settings.theme) applyTheme(t);
});
// cor de destaque e tema de época: mudam com a escolha e com a virada do dia (o Halloween some em 1º/11)
let lastLook = '';
const applyLook = () => {
  const settings = useAppStore.getState().data?.settings;
  if (!settings) return;
  const halloween = halloweenColors(settings, useToday.getState().today);
  const look = `${settings.accent ?? ''}|${halloween}`;
  if (look === lastLook) return;
  lastLook = look;
  applySeason(halloween ? 'halloween' : null);
  applyAccent(settings.accent, halloween ? PUMPKIN : undefined);
};
useAppStore.subscribe((s, p) => { if (s.data?.settings !== p.data?.settings) applyLook(); });
useToday.subscribe(applyLook);
void useAppStore.getState().init().then(() => {
  syncController.start();
  startRemindersSync();
  startDayWatcher(() => useAppStore.getState().run(dailyCheck));
  void useUpdate.getState().check(false);
  // o Android mantém o app na memória: voltar a ele não reinicia, então consulta também aqui
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void useUpdate.getState().check(false); });
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
