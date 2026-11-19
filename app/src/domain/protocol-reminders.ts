// Z4: lembretes de dose. Um aviso para cada dose com horário dos próximos dias que ainda não foi
// registrada. A lista é refeita a cada mudança nos dados e quando o app volta à tela (como os
// lembretes de treino, M47). Por padrão o texto é discreto; o nome e a dose só com o ajuste ligado.
import { addDays, fromDateKey, toDateKey } from './dates';
import type { AppData } from './model';
import { doseText, doseTime, doseVolume, dosesDue, slotLabel, volumeText } from './protocol';

/** Ids reservados para os lembretes de dose (os de treino usam 4100–4113; o descanso, 4199). */
export const DOSE_REMINDER_BASE_ID = 4300;
/** No máximo 64 avisos agendados de uma vez (o Android limita os alarmes por app). */
export const DOSE_REMINDER_MAX = 64;
/** Quantos dias à frente ficam agendados (o app refaz a cada abertura). */
export const DOSE_REMINDER_DAYS = 7;
export const DOSE_REMINDER_IDS = Array.from({ length: DOSE_REMINDER_MAX }, (_, i) => DOSE_REMINDER_BASE_ID + i);

export const DISCREET_TITLE = 'Lembrete';
export const DISCREET_BODY = 'Hora de registrar sua dose. Toque para abrir o app.';

export interface DoseReminder { id: number; at: Date; title: string; body: string }

export const doseRemindersOn = (data: Pick<AppData, 'settings'>) => !!(data.settings.protocolEnabled && data.settings.doseReminders);

export function doseRemindersFor(data: Pick<AppData, 'protocols' | 'doses' | 'settings'>, now: Date): DoseReminder[] {
  if (!doseRemindersOn(data)) return [];
  const details = !!data.settings.doseReminderDetails;
  const today = toDateKey(now);
  const list: Omit<DoseReminder, 'id'>[] = [];
  for (let i = 0; i < DOSE_REMINDER_DAYS; i++) {
    const date = addDays(today, i);
    for (const d of dosesDue(data, date)) {
      const time = doseTime(d.item, d.slot);
      if (!time || d.taken) continue;
      const at = fromDateKey(date);
      at.setHours(time.hour, time.minute, 0, 0);
      if (at.getTime() <= now.getTime()) continue;
      const ml = doseVolume(d.item.dose, d.item.unit, d.item.perMl);
      list.push(details
        ? { at, title: 'Hora da dose', body: `${d.item.name}: ${doseText(d.item.dose, d.item.unit)}${ml !== null ? ` (${volumeText(ml)})` : ''}${d.of > 1 ? `, ${slotLabel(d.slot, d.of)}` : ''}` }
        : { at, title: DISCREET_TITLE, body: DISCREET_BODY });
    }
  }
  return list.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, DOSE_REMINDER_MAX).map((r, i) => ({ ...r, id: DOSE_REMINDER_BASE_ID + i }));
}

/** Assinatura para saber se os lembretes precisam ser refeitos. */
export const doseRemindersKey = (enabled: boolean, list: DoseReminder[]) =>
  enabled ? list.map(r => `${r.id}@${r.at.toISOString()}-${r.title}-${r.body}`).join('|') : 'off';
