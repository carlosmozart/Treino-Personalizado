// V7: desafios do mês. Três metas ajustadas ao histórico de cada pessoa (nada de meta igual para
// todo mundo): dias de treino no mês e volume um pouco acima da média dos três meses anteriores, e uma
// terceira que muda a cada mês (recordes, pesagens ou todos os grupos). O progresso sai do
// histórico; só o bônus de XP de um desafio cumprido fica gravado (gamification.challengeBonus),
// para não ser dado duas vezes.
import { groupOf } from '../data/exercise-library';
import { toDateKey, type DateKey } from './dates';
import type { AppData } from './model';
import { recordKinds } from './strength';
import { workoutVolume, workSets } from './workouts';

export type ChallengeId = 'treinos' | 'volume' | 'recordes' | 'pesagens' | 'grupos';

export interface Challenge {
  id: ChallengeId;
  title: string;
  /** "8 treinos em novembro" */
  goal: string;
  target: number;
  current: number;
  done: boolean;
  /** Chave do bônus de XP: "2026-11:treinos". */
  key: string;
}

export const CHALLENGE_XP = 150;

/** Grupos do desafio "todos os grupos". */
export const CHALLENGE_GROUPS = ['Peito', 'Costas', 'Ombro', 'Pernas (Quadríceps)', 'Pernas (Posterior/Glúteo)', 'Abdômen / Core'] as const;

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'] as const;

const monthKey = (d: Date) => toDateKey(d).slice(0, 7);
const shift = (month: string, delta: number) => {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const d = new Date(y, m - 1 + delta, 1);
  return monthKey(d);
};
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function monthName(month: string): string {
  return MONTHS[Number(month.slice(5, 7)) - 1]!;
}

/** Os desafios de um mês ("2026-11"), com o progresso até agora. */
export function monthChallenges(data: Pick<AppData, 'workouts' | 'profile' | 'settings'>, month: string): Challenge[] {
  const inMonth = (date: DateKey, m: string) => date.startsWith(`${m}-`);
  const workoutsIn = (m: string) => data.workouts.filter(w => inMonth(w.date, m));
  const here = workoutsIn(month);
  // média dos meses anteriores que tiveram treino (até três)
  const before = [1, 2, 3].map(i => workoutsIn(shift(month, -i))).filter(ws => ws.length > 0);
  const avg = (f: (ws: typeof here) => number) => (before.length ? before.reduce((n, ws) => n + f(ws), 0) / before.length : 0);
  const name = monthName(month);
  const out: Challenge[] = [];
  const add = (id: ChallengeId, title: string, goal: string, target: number, current: number) =>
    out.push({ id, title, goal, target, current, done: current >= target, key: `${month}:${id}` });

  // X11: conta dias com treino (dois treinos no mesmo dia valem um), como a sequência e a meta da semana
  const days = (ws: typeof here) => new Set(ws.map(w => w.date)).size;
  const avgDays = avg(days);
  const treinos = before.length ? clamp(Math.round(avgDays * 1.1), 4, 26) : 8;
  add('treinos', 'Constância', `${treinos} dias de treino em ${name}`, treinos, days(here));

  const avgVolume = avg(ws => ws.reduce((n, w) => n + workoutVolume(w), 0));
  const third = (['recordes', 'pesagens', 'grupos'] as const)[Number(month.slice(5, 7)) % 3]!;
  if (avgVolume > 0) {
    const kg = Math.max(1000, Math.ceil((avgVolume * 1.05) / 500) * 500);
    add('volume', 'Volume', `${kg.toLocaleString('pt-BR')} kg levantados em ${name}`, kg, Math.round(here.reduce((n, w) => n + workoutVolume(w), 0)));
  }
  const want: ChallengeId[] = avgVolume > 0 ? [third] : third === 'grupos' ? ['grupos', 'recordes'] : [third, 'grupos'];
  for (const id of want) {
    if (id === 'recordes') {
      const records = here.reduce((n, w) => n + w.entries.filter(e => recordKinds(data.workouts, w, e).length > 0).length, 0);
      add('recordes', 'Recordes', `3 recordes em ${name}`, 3, records);
    } else if (id === 'pesagens') {
      const weighIns = data.profile.weighIns.filter(w => inMonth(w.date, month)).length;
      add('pesagens', 'Na balança', `4 pesagens em ${name}`, 4, weighIns);
    } else {
      const groups = new Set<string>();
      for (const w of here) for (const e of w.entries) {
        const g = groupOf(e.name, data.settings.customExercises);
        if (g && workSets(e).length) groups.add(g);
      }
      add('grupos', 'Corpo inteiro', `Treinar os ${CHALLENGE_GROUPS.length} grupos principais em ${name}`, CHALLENGE_GROUPS.length, CHALLENGE_GROUPS.filter(g => groups.has(g)).length);
    }
  }
  return out;
}

/** Os desafios do mês de `now`. */
export const currentChallenges = (data: Pick<AppData, 'workouts' | 'profile' | 'settings'>, now: Date) => monthChallenges(data, monthKey(now));

/** Dias que faltam para o mês acabar (contando hoje). */
export function daysLeftInMonth(now: Date): number {
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return end.getDate() - now.getDate() + 1;
}

/**
 * Dá o XP dos desafios cumpridos neste mês e no anterior (um treino lançado depois, com data do
 * mês passado, também vale), uma vez por desafio.
 */
export function awardChallenges<T extends Pick<AppData, 'workouts' | 'profile' | 'settings' | 'gamification'>>(data: T, now: Date): { data: T; done: Challenge[] } {
  const given = data.gamification.challengeBonus ?? {};
  const month = monthKey(now);
  const done = [...monthChallenges(data, shift(month, -1)), ...monthChallenges(data, month)].filter(c => c.done && !(c.key in given));
  if (!done.length) return { data, done: [] };
  const challengeBonus = { ...given };
  for (const c of done) challengeBonus[c.key] = CHALLENGE_XP;
  return { data: { ...data, gamification: { ...data.gamification, challengeBonus } }, done };
}

/** Meses com os três desafios cumpridos (para a conquista). */
export function perfectMonths(bonus: Record<string, number> | undefined): number {
  const byMonth = new Map<string, number>();
  for (const k of Object.keys(bonus ?? {})) byMonth.set(k.slice(0, 7), (byMonth.get(k.slice(0, 7)) ?? 0) + 1);
  return [...byMonth.values()].filter(n => n >= 3).length;
}

