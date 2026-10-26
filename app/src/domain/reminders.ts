// Lembretes de treino por data (M47): um aviso para cada dia planejado dos próximos dias, no
// horário de treino do plano ativo. Antes eram 7 avisos semanais fixos (porta do app antigo), que
// tocavam mesmo depois de a pessoa já ter treinado no dia. Agora o dia que já teve treino, o dia
// com nota de "sem treino" (S8) e o horário que já passou ficam de fora, e a lista é refeita a
// cada mudança nos dados e quando o app volta para a tela. O treino remarcado (M19) avisa no dia novo.
import { addDays, fromDateKey, toDateKey, weekStartOf, type DateKey, type WeekStart } from './dates';
import type { DayMove, DayNote, Plan, Workout } from './model';
import { scheduledDay } from './reschedule';
import { rotationState, rotationTitle } from './rotation';

export const REMINDER_BASE_ID = 4100;
/** Quantos dias à frente ficam agendados (o app refaz a cada abertura). */
export const REMINDER_DAYS = 14;
/** Ids dos lembretes; incluem os 7 dos lembretes semanais antigos, para cancelá-los. */
export const REMINDER_IDS = Array.from({ length: REMINDER_DAYS }, (_, i) => REMINDER_BASE_ID + i);

export function parseTrainingTime(value: string): { hour: number; minute: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const hour = Number(m[1]), minute = Number(m[2]);
  return hour <= 23 && minute <= 59 ? { hour, minute } : null;
}

export interface Reminder { id: number; date: DateKey; at: Date; body: string }

export interface ReminderContext {
  workouts?: readonly Workout[];
  dayNotes?: Readonly<Record<DateKey, DayNote>>;
  moves?: Readonly<Record<DateKey, DayMove>>;
  weekStart?: WeekStart;
  now: Date;
}

/**
 * Lembretes dos próximos REMINDER_DAYS dias. Semana fixa: os dias obrigatórios com exercícios,
 * já com os treinos remarcados (M19).
 * Rotação (R1): todo dia ainda sem treino, com o próximo da volta, até cumprir a meta da semana.
 */
export function remindersFor(plan: Plan | undefined, { workouts = [], dayNotes = {}, moves = {}, weekStart = 'seg', now }: ReminderContext): Reminder[] {
  const time = plan ? parseTrainingTime(plan.trainingTime) : null;
  if (!plan || !time) return [];
  const trained = new Set(workouts.map(w => w.date));
  const today = toDateKey(now);
  const rot = plan.rotation ? rotationState(plan, workouts, today) : null;
  if (plan.rotation && !rot) return [];
  const perWeek = plan.rotation?.perWeek ?? 0;
  const doneInWeek = (date: DateKey) => {
    const start = weekStartOf(date, weekStart), end = addDays(start, 6);
    return [...trained].filter(d => d >= start && d <= end).length;
  };

  const out: Reminder[] = [];
  for (let i = 0; i < REMINDER_DAYS; i++) {
    const date = addDays(today, i);
    const at = fromDateKey(date);
    at.setHours(time.hour, time.minute, 0, 0);
    if (at.getTime() <= now.getTime() || trained.has(date) || dayNotes[date]) continue;
    let body: string;
    if (rot) {
      if (perWeek && doneInWeek(date) >= perWeek) continue;
      // T14: dia de descanso da volta, logo depois do último treino
      if (rot.restUntil && date <= rot.restUntil) continue;
      body = `Próximo treino: ${rotationTitle(plan, rot.next)}`;
    } else {
      const k = scheduledDay(plan, date, moves);
      const day = k ? plan.days[k] : null;
      if (!day || day.optional || !day.exercises.some(e => e.name.trim())) continue;
      const name = day.name.replace(/\s*\(opcional\)\s*$/i, '').trim();
      body = name ? `Hoje: ${name}` : 'Seu treino está pronto para começar.';
    }
    out.push({ id: REMINDER_BASE_ID + i, date, at, body });
  }
  return out;
}

/** Assinatura para saber se os lembretes precisam ser refeitos. */
export const remindersKey = (enabled: boolean, reminders: Reminder[]) =>
  enabled ? reminders.map(r => `${r.id}@${r.at.toISOString()}-${r.body}`).join('|') : 'off';
