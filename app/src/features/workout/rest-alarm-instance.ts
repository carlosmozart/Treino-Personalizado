// Instância do alarme do descanso usada pelo app (o APK agenda no Android; no navegador não faz nada).
import { cancelRestAlarm, ensureNotificationPermission, notificationsAvailable, scheduleRestAlarm } from '../../platform/notifications';
import { startRestAlarm } from '../../platform/rest-alarm';
import { useErrorLog } from '../../platform/error-log';
import { useAppStore } from '../../store';
import { useRestStore } from './rest-store';
import { restAlarmBody } from '../../domain/next-set';
import type { Settings } from '../../domain/model';

const settings = () => useAppStore.getState().data?.settings;
const alertOn = (s: Settings | undefined) => !!s && (s.restSound || s.restVibrate);
/** M21: a contagem na barra de notificações (ausente = ligada). */
export const countdownOn = (s: Settings | undefined) => !!s && s.restCountdown !== false;

export const restAlarm = notificationsAvailable()
  ? startRestAlarm({
    subscribe: listener => useRestStore.subscribe((s, p) => listener(s.endsAt, p.endsAt)),
    schedule: at => {
      const s = settings();
      return scheduleRestAlarm(at, {
        sound: s?.restSound ?? true,
        vibrate: s?.restVibrate ?? true,
        // W15: o aviso diz a próxima série ("Próxima: Supino Reto, 80 kg × 8")
        body: restAlarmBody(useAppStore.getState().session, useRestStore.getState().source),
        total: useRestStore.getState().total,
        countdown: countdownOn(s),
        alert: alertOn(s)
      });
    },
    cancel: cancelRestAlarm,
    enabled: () => { const s = settings(); return alertOn(s) || countdownOn(s); },
    onError: e => useErrorLog.getState().report(e, 'Alarme do descanso')
  })
  : { handledNatively: () => false };

/** Ao começar um treino (um toque): pede a permissão de notificação uma vez, se ainda não decidida. */
export function askRestAlarmPermission(): void {
  if (!notificationsAvailable()) return;
  const s = settings();
  if (!alertOn(s) && !countdownOn(s)) return;
  ensureNotificationPermission(true).catch(e => useErrorLog.getState().report(e, 'Permissão de notificação'));
}
