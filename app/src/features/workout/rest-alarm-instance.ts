// Instância do alarme do descanso usada pelo app (o APK agenda no Android; no navegador não faz nada).
import { cancelRestAlarm, ensureNotificationPermission, notificationsAvailable, scheduleRestAlarm } from '../../platform/notifications';
import { startRestAlarm } from '../../platform/rest-alarm';
import { useErrorLog } from '../../platform/error-log';
import { useAppStore } from '../../store';
import { useRestStore } from './rest-store';
import { restAlarmBody } from '../../domain/next-set';

const settings = () => useAppStore.getState().data?.settings;

export const restAlarm = notificationsAvailable()
  ? startRestAlarm({
    subscribe: listener => useRestStore.subscribe((s, p) => listener(s.endsAt, p.endsAt)),
    // W15: o aviso diz a próxima série ("Próxima: Supino Reto, 80 kg × 8")
    schedule: at => scheduleRestAlarm(at, settings()?.restSound ?? true, settings()?.restVibrate ?? true,
      restAlarmBody(useAppStore.getState().session, useRestStore.getState().source)),
    cancel: cancelRestAlarm,
    enabled: () => { const s = settings(); return !!s && (s.restSound || s.restVibrate); },
    onError: e => useErrorLog.getState().report(e, 'Alarme do descanso')
  })
  : { handledNatively: () => false };

/** Ao começar um treino (um toque): pede a permissão de notificação uma vez, se ainda não decidida. */
export function askRestAlarmPermission(): void {
  if (!notificationsAvailable()) return;
  const s = settings();
  if (!s || !(s.restSound || s.restVibrate)) return;
  ensureNotificationPermission(true).catch(e => useErrorLog.getState().report(e, 'Permissão de notificação'));
}
