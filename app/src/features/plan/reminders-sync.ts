// Mantém os lembretes semanais do Android de acordo com o plano ativo, o horário e o ajuste.
import { remindersFor, remindersKey, REMINDER_IDS } from '../../domain/reminders';
import { notificationsAvailable, syncTrainingReminders } from '../../platform/notifications';
import { useErrorLog } from '../../platform/error-log';
import type { AppData } from '../../domain/model';
import { useAppStore } from '../../store';

const plan = (d: AppData) => (d.activePlanId ? d.plans[d.activePlanId] : undefined);

export function startRemindersSync() {
  if (!notificationsAvailable()) return;
  let last: string | null = null;
  const sync = (data: AppData | null) => {
    if (!data) return;
    const reminders = remindersFor(plan(data), data.workouts);
    const enabled = !!data.settings.trainingReminders;
    const k = remindersKey(enabled, reminders);
    if (k === last) return;
    last = k;
    syncTrainingReminders(REMINDER_IDS, reminders, enabled).catch(e => useErrorLog.getState().report(e, 'Lembretes de treino'));
  };
  sync(useAppStore.getState().data);
  useAppStore.subscribe(s => sync(s.data));
}

/** Depois de conceder a permissão, força refazer (a assinatura não muda com a permissão). */
export function resyncReminders() {
  const data = useAppStore.getState().data;
  if (!data) return;
  syncTrainingReminders(REMINDER_IDS, remindersFor(plan(data), data.workouts), !!data.settings.trainingReminders)
    .catch(e => useErrorLog.getState().report(e, 'Lembretes de treino'));
}
