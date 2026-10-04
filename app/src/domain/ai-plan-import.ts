// Converte o plano lido da IA (ai-plan.ts) num Plan do app, listando tudo o que precisou ser
// adaptado para o usuário ver antes de confirmar.
import { DAY_KEYS, type AiPlan, type DayKey } from './ai-plan';
import type { DateKey } from './dates';
import { DAY_FULL_NAMES, MAX_EXERCISES_PER_DAY, type ExerciseMode, type Plan, type PlanDay, type PlanExercise } from './model';

export interface AiPlanImport {
  plan: Plan;
  notes: string[];
  exerciseCount: number;
  dayCount: number;
}

export interface AiPlanImportOptions {
  id: string;
  name: string;
  today: DateKey;
  makeId: () => string;
  /** Nomes que a biblioteca reconhece como cardio (para classificar as alternativas). */
  isCardioName: (name: string) => boolean;
}

const plural = (n: number, one: string, many: string) => (n > 1 ? many : one);

export function aiPlanToPlan(ai: AiPlan, opts: AiPlanImportOptions): AiPlanImport {
  const emptyDay = (): PlanDay => ({ name: '', focus: '', optional: false, exercises: [] });
  const days = Object.fromEntries(DAY_KEYS.map(key => [key, emptyDay()])) as Record<DayKey, PlanDay>;
  const notes: string[] = [];
  let exerciseCount = 0;
  let cardios = 0;
  let timed = 0;

  for (const aiDay of ai.dias) {
    const day = days[aiDay.dia];
    day.name = aiDay.nome || `${DAY_FULL_NAMES[aiDay.dia]}: Treino`;
    day.focus = aiDay.foco;
    let list = aiDay.exercicios;
    if (list.length > MAX_EXERCISES_PER_DAY) {
      notes.push(`${aiDay.nome || aiDay.dia}: ${list.length} exercícios vieram, mas o app aceita ${MAX_EXERCISES_PER_DAY} por dia. Os últimos ${list.length - MAX_EXERCISES_PER_DAY} ficaram de fora.`);
      list = list.slice(0, MAX_EXERCISES_PER_DAY);
    }
    day.exercises = list.map(e => {
      const mode: ExerciseMode = e.tipo === 'cardio' ? 'cardio' : e.tipo === 'tempo' ? 'time' : 'reps';
      if (mode === 'cardio') cardios++;
      if (mode === 'time') timed++;
      const exercise: PlanExercise = {
        id: opts.makeId(),
        name: e.nome,
        mode,
        sets: mode === 'cardio' ? 1 : e.series,
        reps: mode === 'reps' ? e.valor : 10,
        weight: e.carga,
        minutes: mode === 'cardio' ? e.valor : 20,
        km: 0,
        // cardio entra como opcional: é o que se faz quando sobra tempo, e não deve travar a
        // conclusão do treino (problema resolvido na 2.17.0 do app antigo)
        optional: mode === 'cardio',
        alternatives: e.alternativa ? [{ name: e.alternativa, mode: opts.isCardioName(e.alternativa) ? 'cardio' : 'reps' }] : []
      };
      if (mode === 'time') exercise.seconds = e.valor;
      return exercise;
    });
    exerciseCount += day.exercises.length;
  }

  if (timed) notes.push(`${timed} ${plural(timed, 'exercício é contado', 'exercícios são contados')} em segundos (prancha e parecidos).`);
  if (cardios) notes.push(`${cardios} ${plural(cardios, 'exercício de cardio entrou marcado', 'exercícios de cardio entraram marcados')} como opcional — não vai segurar a conclusão do treino nos dias em que você pular. Dá para mudar no editor.`);

  return {
    plan: { id: opts.id, name: opts.name, description: 'Plano montado com IA', trainingTime: '', createdAt: opts.today, updatedAt: opts.today, days },
    notes,
    exerciseCount,
    dayCount: ai.dias.length
  };
}
