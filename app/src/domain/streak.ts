import { toDateKey } from './dates';

interface StreakInput {
  /** Dias com check-in (chave AAAA-MM-DD). */
  isCheckedIn: (key: string) => boolean;
  /** Dia de descanso planejado (sem exercícios ou opcional): não quebra a sequência. */
  isRestDay: (date: Date) => boolean;
  now?: Date;
  maxLookbackDays?: number;
}

/**
 * Treinos seguidos contando para trás a partir de hoje. Hoje ainda sem check-in não quebra a
 * sequência (o dia não acabou); dias de descanso planejado são pulados sem contar.
 */
export function calculateStreak({ isCheckedIn, isRestDay, now = new Date(), maxLookbackDays = 730 }: StreakInput): number {
  let streak = 0;
  const day = new Date(now);
  day.setHours(0, 0, 0, 0);
  for (let index = 0; index < maxLookbackDays; index++) {
    if (isCheckedIn(toDateKey(day))) streak++;
    else if (index > 0 && !isRestDay(day)) break;
    day.setDate(day.getDate() - 1);
  }
  return streak;
}
