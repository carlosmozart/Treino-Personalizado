// Z4: liga a sincronização dos lembretes de dose sem pesar na abertura do app: a lógica do protocolo
// só baixa quando os lembretes estão ligados, ou quando acabaram de ser desligados (para cancelar).
import { notificationsAvailable } from '../../platform/notifications';
import { useAppStore } from '../../store';

let loading: Promise<typeof import('./dose-reminders-sync')> | null = null;
const load = () => (loading ??= import('./dose-reminders-sync'));

export function startDoseRemindersSync(): void {
  if (!notificationsAvailable()) return;
  let wasOn = false;
  const check = () => {
    const s = useAppStore.getState().data?.settings;
    const on = !!(s?.protocolEnabled && s.doseReminders);
    if (!on && !wasOn) return;
    wasOn = on;
    void load().then(m => m.syncDoseRemindersNow());
  };
  check();
  useAppStore.subscribe((s, p) => { if (s.data !== p.data) check(); });
  // a lista cobre só os próximos dias: refaz quando o app volta à tela
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
}

/** Depois de ligar e conceder a permissão: refaz na hora. */
export function resyncDoseReminders(): void {
  if (!notificationsAvailable()) return;
  void load().then(m => m.syncDoseRemindersNow(true));
}
