// S9: o conteúdo do cartão do treino para compartilhar como imagem (o desenho fica na interface).
import { fromDateKey, weekdayName } from './dates';
import type { Workout } from './model';
import { recordKinds } from './strength';
import { describeEntry, workoutVolume, workSets } from './workouts';

export interface WorkoutCardLine { name: string; detail: string; record: string | null }

export interface WorkoutCard {
  title: string;
  /** "quarta-feira, 22/10/2026" */
  date: string;
  /** Até 4 números grandes; só os que o treino tem. */
  stats: { label: string; value: string }[];
  lines: WorkoutCardLine[];
}

const n = (v: number) => Math.round(v).toLocaleString('pt-BR');

export function workoutCard(workouts: readonly Workout[], w: Workout): WorkoutCard {
  const d = fromDateKey(w.date);
  const date = `${weekdayName(w.date)}, ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  const sets = w.entries.reduce((total, e) => total + workSets(e).length, 0);
  const volume = workoutVolume(w);
  const lines = w.entries.map(e => {
    // no cartão, só "Recorde" (os tipos ficam no app); o nome do exercício precisa do espaço
    const records = recordKinds(workouts, w, e);
    return { name: e.name, detail: describeEntry(e).replace(' (registro antigo)', ''), record: records.length ? 'Recorde' : null };
  });
  const stats = [
    w.durationMin ? { label: 'Minutos', value: n(w.durationMin) } : null,
    { label: w.entries.length === 1 ? 'Exercício' : 'Exercícios', value: n(w.entries.length) },
    sets ? { label: sets === 1 ? 'Série' : 'Séries', value: n(sets) } : null,
    volume ? { label: 'kg de volume', value: n(volume) } : null
  ].filter((s): s is { label: string; value: string } => !!s);
  return { title: w.dayName?.trim() || 'Treino', date, stats, lines };
}
