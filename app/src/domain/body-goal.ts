import type { DateKey } from './dates';

export type GoalMark = 25 | 50 | 75 | 100;

export interface WeightGoal {
  startWeight: number;
  targetWeight: number;
  startedAt: DateKey;
  /** Primeira data em que cada marco foi atingido. */
  checkpoints?: Partial<Record<GoalMark, DateKey>>;
}

export interface GoalCheckpoint {
  percent: GoalMark;
  weight: number;
  reached: boolean;
}

export interface GoalProgress {
  percent: number;
  /** Meta de manutenção (alvo igual ao início). */
  maintenance: boolean;
  remaining: number;
  checkpoints: GoalCheckpoint[];
}

const MARKS: readonly GoalMark[] = [25, 50, 75, 100];

export function goalProgress(start: number, current: number, target: number): GoalProgress | null {
  if (![start, current, target].every(n => Number.isFinite(n) && n > 0)) return null;
  const distance = target - start;
  const maintenance = Math.abs(distance) < 0.1;
  const percent = maintenance
    ? (Math.abs(current - target) < 0.1 ? 100 : 0)
    : Math.max(0, Math.min(100, ((current - start) / distance) * 100));
  return {
    percent,
    maintenance,
    remaining: Math.abs(target - current),
    checkpoints: maintenance ? [] : MARKS.map(mark => ({
      percent: mark, weight: start + (distance * mark) / 100, reached: percent + 1e-8 >= mark
    }))
  };
}

/** Registra marcos atingidos sem apagar os já conquistados se o peso oscilar de volta. */
export function recordGoalCheckpoints(goal: WeightGoal, current: number, date: DateKey): WeightGoal {
  const progress = goalProgress(goal.startWeight, current, goal.targetWeight);
  if (!progress) return goal;
  const checkpoints = { ...goal.checkpoints };
  for (const point of progress.checkpoints) {
    if (point.reached && !checkpoints[point.percent]) checkpoints[point.percent] = date;
  }
  return { ...goal, checkpoints };
}

/** Média móvel das últimas 7 pesagens válidas (por registros, não por dias). */
export function weightTrend<T extends { weight: number | string }>(entries: readonly T[]):
  (Omit<T, 'weight'> & { weight: number; trend: number; trendCount: number })[] {
  const valid = entries
    .map(e => ({ ...e, weight: Number(e.weight) }))
    .filter(e => Number.isFinite(e.weight) && e.weight > 0);
  return valid.map((entry, index) => {
    const recent = valid.slice(Math.max(0, index - 6), index + 1);
    return { ...entry, trendCount: recent.length, trend: recent.reduce((sum, e) => sum + e.weight, 0) / recent.length };
  });
}

export type BodyField = 'height' | 'weight' | 'targetWeight' | 'bodyFatPercent';

const LABELS: Record<BodyField, string> = {
  height: 'Altura', weight: 'Peso', targetWeight: 'Peso alvo', bodyFatPercent: 'Gordura corporal'
};

/** Mensagem de erro de um campo numérico do perfil; vazio é permitido (campo opcional). */
export function numericFieldError(field: BodyField, value: string): string {
  if (value === '') return '';
  const number = Number(value);
  if (value.trim() === '' || !Number.isFinite(number) || number <= 0) return `${LABELS[field]} deve ser um número maior que zero.`;
  if (field === 'bodyFatPercent' && number >= 100) return 'Gordura corporal deve ser menor que 100%.';
  return '';
}
