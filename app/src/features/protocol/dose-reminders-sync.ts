// Z4: mantém os lembretes de dose do Android de acordo com os protocolos, as doses registradas e os
// ajustes. Este módulo só baixa quando os lembretes estão ou estiveram ligados (ver dose-reminders-start).
import { DOSE_REMINDER_IDS, doseRemindersFor, doseRemindersKey, doseRemindersOn } from '../../domain/protocol-reminders';
import { syncDoseReminders } from '../../platform/notifications';
import { useErrorLog } from '../../platform/error-log';
import { useAppStore } from '../../store';

let last: string | null = null;

/** Refaz os avisos se algo mudou (`force`: refaz mesmo igual, depois de conceder a permissão). */
export function syncDoseRemindersNow(force = false): void {
  const data = useAppStore.getState().data;
  if (!data) return;
  const on = doseRemindersOn(data);
  const list = doseRemindersFor(data, new Date());
  const k = doseRemindersKey(on, list);
  if (!force && k === last) return;
  last = k;
  syncDoseReminders(DOSE_REMINDER_IDS, list, on).catch(e => useErrorLog.getState().report(e, 'Lembretes de dose'));
}
