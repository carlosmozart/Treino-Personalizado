// Mantém os lembretes do Android (por data, M47) de acordo com o plano ativo, os treinos feitos,
// as notas de dia, os treinos remarcados, o horário e o ajuste. Refaz a cada mudança e quando o app volta para a tela.
import { remindersFor, remindersKey, REMINDER_IDS } from '../../domain/reminders';
import { notificationsAvailable, syncTrainingReminders } from '../../platform/notifications';
import { useErrorLog } from '../../platform/error-log';
import { weekStartSetting, type AppData } from '../../domain/model';
import { useAppStore } from '../../store';

const plan = (d: AppData) => (d.activePlanId ? d.plans[d.activePlanId] : undefined);
const listFor = (d: AppData) => remindersFor(plan(d), { workouts: d.workouts, dayNotes: d.dayNotes ?? {}, moves: d.moves ?? {}, weekStart: weekStartSetting(d.settings), now: new Date() });

export function startRemindersSync() {
  if (!notificationsAvailable()) return;
  let last: string | null = null;
  const sync = (data: AppData | null) => {
    if (!data) return;
    const reminders = listFor(data);
    const enabled = !!data.settings.trainingReminders;
    const k = remindersKey(enabled, reminders);
    if (k === last) return;
    last = k;
    syncTrainingReminders(REMINDER_IDS, reminders, enabled).catch(e => useErrorLog.getState().report(e, 'Lembretes de treino'));
  };
  sync(useAppStore.getState().data);
  useAppStore.subscribe(s => sync(s.data));
  // a lista cobre só os próximos dias e o dia de hoje muda: refaz quando o app volta à tela
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sync(useAppStore.getState().data); });
}

/** Depois de conceder a permissão, força refazer (a assinatura não muda com a permissão). */
export function resyncReminders() {
  const data = useAppStore.getState().data;
  if (!data) return;
  syncTrainingReminders(REMINDER_IDS, listFor(data), !!data.settings.trainingReminders)
    .catch(e => useErrorLog.getState().report(e, 'Lembretes de treino'));
}
