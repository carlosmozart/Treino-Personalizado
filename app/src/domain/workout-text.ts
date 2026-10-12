// M33: um treino feito como texto, pronto para colar no WhatsApp.
import { fromDateKey } from './dates';
import type { Workout } from './model';
import { workSets } from './workouts';

const n = (v: number) => String(Math.round(v * 10) / 10).replace('.', ',');

export function workoutAsText(w: Workout): string {
  const d = fromDateKey(w.date);
  const date = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  const head = [w.dayName?.trim() || 'Treino', date, w.durationMin ? `${w.durationMin} min` : ''].filter(Boolean).join(' · ');
  const lines = w.entries.map(e => {
    if (e.mode === 'cardio') return `${e.name}: ${e.cardio?.minutes ?? 0} min${e.cardio?.km ? ` · ${n(e.cardio.km)} km` : ''}`;
    const sets = workSets(e).map(s => (e.mode === 'time' ? `${s.reps}s` : s.weight > 0 ? `${n(s.weight)}×${s.reps}` : `${s.reps}`) + (s.failure ? ' (falha)' : ''));
    return `${e.name}: ${sets.join(', ')}`;
  });
  return [head, ...lines].join('\n');
}
