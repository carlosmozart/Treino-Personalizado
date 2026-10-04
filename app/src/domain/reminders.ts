// Lembretes semanais de treino (porta de js/ui/notifications.js): um aviso por dia obrigatório
// com exercícios, no horário de treino do plano ativo.
import { DAY_KEYS, type DayKey } from './ai-plan';
import type { Plan } from './model';

export const REMINDER_BASE_ID = 4100;
export const REMINDER_IDS = DAY_KEYS.map((_, i) => REMINDER_BASE_ID + i);

export function parseTrainingTime(value: string): { hour: number; minute: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const hour = Number(m[1]), minute = Number(m[2]);
  return hour <= 23 && minute <= 59 ? { hour, minute } : null;
}

export interface Reminder { id: number; dayKey: DayKey; weekday: number; hour: number; minute: number; body: string }

/** Lembretes do plano. Weekday do Capacitor: 1 = domingo, 2 = segunda... */
export function remindersFor(plan: Plan | undefined): Reminder[] {
  const time = plan ? parseTrainingTime(plan.trainingTime) : null;
  if (!plan || !time) return [];
  return DAY_KEYS.flatMap((dayKey, i) => {
    const day = plan.days[dayKey];
    if (day.optional || !day.exercises.some(e => e.name.trim())) return [];
    const name = day.name.replace(/\s*\(opcional\)\s*$/i, '').trim();
    return [{ id: REMINDER_BASE_ID + i, dayKey, weekday: ((i + 1) % 7) + 1, ...time, body: name ? `Hoje: ${name}` : 'Seu treino está pronto para começar.' }];
  });
}

/** Assinatura para saber se os lembretes precisam ser refeitos. */
export const remindersKey = (enabled: boolean, reminders: Reminder[]) =>
  enabled ? reminders.map(r => `${r.id}@${r.weekday}-${r.hour}:${r.minute}-${r.body}`).join('|') : 'off';
