// Notificações locais do Android (plugin LocalNotifications do Capacitor, já no APK).
// Lembretes semanais e aviso do descanso.
// O aviso do descanso é agendado no sistema assim que o descanso começa: toca pelo canal de
// alarme criado no MainActivity (volume de "Alarmes", não o de mídia) com o app aberto, em
// segundo plano ou com a tela bloqueada. No navegador nada disso existe e fica o bipe da página.
import { isNative } from './platform';

interface Permission { display: 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale' }

interface LocalNotificationsPlugin {
  checkPermissions(): Promise<Permission>;
  requestPermissions(): Promise<Permission>;
  checkExactNotificationSetting?(): Promise<{ exact_alarm: string }>;
  changeExactNotificationSetting?(): Promise<{ exact_alarm: string }>;
  schedule(o: { notifications: unknown[] }): Promise<unknown>;
  createChannel?(o: Record<string, unknown>): Promise<void>;
  cancel(o: { notifications: { id: number }[] }): Promise<void>;
}

function plugin(): LocalNotificationsPlugin | null {
  if (!isNative()) return null;
  return (globalThis as { Capacitor?: { Plugins?: { LocalNotifications?: LocalNotificationsPlugin } } }).Capacitor?.Plugins?.LocalNotifications ?? null;
}

export const REST_NOTIFICATION_ID = 4199;
/** Mesmo canal do app atual, criado no MainActivity (som e vibração ficam no canal). */
const REST_CHANNEL = 'treino-descanso-v3';

export function restChannelId(sound: boolean, vibrate: boolean): string {
  if (sound && vibrate) return REST_CHANNEL;
  return `${REST_CHANNEL}-${sound ? 'sound' : vibrate ? 'vibrate' : 'silent'}`;
}

export const notificationsAvailable = () => plugin() !== null;

/** Permissão de notificação; pede só se ainda não foi negada. */
export async function ensureNotificationPermission(ask: boolean): Promise<boolean> {
  const p = plugin();
  if (!p) return false;
  let perm = await p.checkPermissions();
  if (perm.display !== 'granted' && ask && perm.display !== 'denied') perm = await p.requestPermissions();
  return perm.display === 'granted';
}

/** Alarme exato (Android 12+ fica nas configurações do sistema). */
export async function exactAlarmAllowed(openSettings: boolean): Promise<boolean> {
  const p = plugin();
  if (!p?.checkExactNotificationSetting) return true;
  let s = await p.checkExactNotificationSetting();
  if (s.exact_alarm !== 'granted' && openSettings && p.changeExactNotificationSetting) s = await p.changeExactNotificationSetting();
  return s.exact_alarm === 'granted';
}

/**
 * Agenda (ou reagenda) o aviso de fim do descanso. 'exact' toca na hora; 'inexact' (sem a
 * permissão de alarme exato do Android 12+) pode atrasar; null não agendou.
 */
export async function scheduleRestAlarm(at: Date, sound: boolean, vibrate: boolean, body = 'Bora para a próxima série!'): Promise<'exact' | 'inexact' | null> {
  const p = plugin();
  if (!p || at.getTime() <= Date.now()) return null;
  if (!(await ensureNotificationPermission(false))) return null;
  await p.cancel({ notifications: [{ id: REST_NOTIFICATION_ID }] }).catch(() => undefined);
  await p.schedule({
    notifications: [{
      id: REST_NOTIFICATION_ID,
      title: 'Descanso concluído',
      // W15: o aviso diz a próxima série
      body,
      channelId: restChannelId(sound, vibrate),
      extra: { type: 'rest-finished' },
      schedule: { at, allowWhileIdle: true },
      isExactNotification: true
    }]
  });
  return (await exactAlarmAllowed(false)) ? 'exact' : 'inexact';
}

export async function cancelRestAlarm(): Promise<void> {
  const p = plugin();
  if (!p) return;
  await p.cancel({ notifications: [{ id: REST_NOTIFICATION_ID }] }).catch(() => undefined);
}

// ---------- lembretes de dose (Z4) ----------

/**
 * Canal próprio, com o conteúdo escondido na tela bloqueada (visibility 0 = privado): o aviso de dose
 * é coisa de saúde e não deve aparecer para quem pega o celular.
 */
const DOSE_CHANNEL = 'protocolo-doses-v1';

export interface DoseReminderNotification { id: number; at: Date; title: string; body: string }

/** Refaz os lembretes de dose: cancela todos os ids e agenda os de agora. Desligado ou sem permissão, só cancela. */
export async function syncDoseReminders(ids: number[], reminders: DoseReminderNotification[], enabled: boolean): Promise<boolean> {
  const p = plugin();
  if (!p) return false;
  await p.cancel({ notifications: ids.map(id => ({ id })) }).catch(() => undefined);
  if (!enabled || !reminders.length || !(await ensureNotificationPermission(false))) return false;
  await p.createChannel?.({
    id: DOSE_CHANNEL, name: 'Lembretes de dose', description: 'Hora das doses do Protocolo',
    importance: 4, visibility: 0, sound: 'default', vibration: true, lights: true
  });
  await p.schedule({
    notifications: reminders.map(r => ({
      id: r.id, title: r.title, body: r.body, channelId: DOSE_CHANNEL,
      extra: { type: 'dose-reminder' },
      schedule: { at: r.at, allowWhileIdle: true },
      isExactNotification: false
    }))
  });
  return true;
}

// ---------- lembretes de treino (por data, M47) ----------

/** Canal dos lembretes (o mesmo do app atual; versionado porque o Android congela o canal criado). */
const REMINDER_CHANNEL = 'treino-avisos-v2';

export interface ReminderNotification { id: number; at: Date; body: string }

/**
 * Refaz os lembretes: cancela todos os ids (inclusive os semanais antigos) e agenda os de agora. Desligado ou sem permissão, só
 * cancela. Devolve se ficaram agendados.
 */
export async function syncTrainingReminders(ids: number[], reminders: ReminderNotification[], enabled: boolean): Promise<boolean> {
  const p = plugin();
  if (!p) return false;
  await p.cancel({ notifications: ids.map(id => ({ id })) }).catch(() => undefined);
  if (!enabled || !reminders.length || !(await ensureNotificationPermission(false))) return false;
  await p.createChannel?.({
    id: REMINDER_CHANNEL, name: 'Avisos de treino', description: 'Horários de treino e fim dos descansos',
    importance: 5, visibility: 1, sound: 'default', vibration: true, lights: true
  });
  await p.schedule({
    notifications: reminders.map(r => ({
      id: r.id, title: 'Hora do treino', body: r.body, channelId: REMINDER_CHANNEL,
      extra: { type: 'training-reminder' },
      schedule: { at: r.at, allowWhileIdle: true },
      isExactNotification: false
    }))
  });
  return true;
}
