// Progressão automática de carga (M10–M12). Regras em docs/dev/progressao.md.
// Função pura: a sugestão sai do histórico a cada treino, nada é gravado.
import type { PlanExercise, Workout, WorkoutEntry } from './model';
import { sessionsOf, workSets } from './workouts';
import { normalizeExerciseName } from './text';

export const DEFAULT_INCREMENT = 2.5;
export const INCREMENTS = [1, 1.25, 2.5, 5] as const;
/** Sessões seguidas na mesma carga, sem evoluir, que pedem deload. */
const STALL_SESSIONS = 3;
/** No máximo uma subida de carga por exercício a cada tantos dias (uma por semana). */
export const MIN_DAYS_BETWEEN_UPS = 7;
/** Sem incremento escolhido: cargas leves sobem 1 kg; a partir daqui, 2,5 kg. */
const LIGHT_LOAD = 20;

/** Quanto subir: o escolhido no exercício ou, sem escolha, 1 kg abaixo de 20 kg e 2,5 kg a partir daí. */
export function incrementFor(t: Pick<PlanExercise, 'increment'>, weight: number): number {
  if (t.increment && t.increment > 0) return t.increment;
  return weight < LIGHT_LOAD ? 1 : DEFAULT_INCREMENT;
}

export type ProgressionKind = 'first' | 'up' | 'keep' | 'deload';

export interface Progression {
  kind: ProgressionKind;
  weight: number;
  reps: number;
  /** Linha explicando o porquê; vazia na primeira vez. */
  reason: string;
}

type Target = Pick<PlanExercise, 'sets' | 'reps' | 'weight' | 'repMin' | 'repMax' | 'increment'> & {
  /** M10: progressão linear do plano: reps fixas no topo, a carga sobe a cada treino completo. */
  linear?: boolean;
};

export function repRange(t: Pick<PlanExercise, 'reps' | 'repMin' | 'repMax'>): { min: number; max: number } {
  const min = t.repMin && t.repMin > 0 ? t.repMin : t.reps;
  const max = t.repMax && t.repMax >= min ? t.repMax : Math.max(min, t.reps);
  return { min, max };
}

type RangeTarget = Pick<PlanExercise, 'reps' | 'repMin' | 'repMax'>;
type RangePatch = { reps: number; repMin: number; repMax: number };

/** Os dois números como gravados, sem a correção do repRange: é o que os campos mostram enquanto se digita. */
export function rangeFields(t: RangeTarget): { min: number; max: number } {
  return { min: t.repMin && t.repMin > 0 ? t.repMin : t.reps, max: t.repMax && t.repMax > 0 ? t.repMax : t.reps };
}

const rangePatch = (min: number, max: number): RangePatch => {
  const repMin = Math.max(1, Math.round(min)), repMax = Math.max(1, Math.round(max));
  return { reps: Math.max(repMin, repMax), repMin, repMax };
};

/**
 * Um dos limites da faixa a cada tecla. O outro limite não muda: apagar o "2" de "12" grava 1
 * de passagem, e corrigir isso agora puxaria o campo para o mínimo enquanto se digita.
 */
export function editRange(t: RangeTarget, side: 'min' | 'max', value: number): RangePatch {
  const f = rangeFields(t);
  return side === 'min' ? rangePatch(value, f.max) : rangePatch(f.min, value);
}

/** Ao sair do campo: se os limites ficaram invertidos, o outro acompanha o que acabou de ser digitado. */
export function settleRange(t: RangeTarget, side: 'min' | 'max'): RangePatch | null {
  const { min, max } = rangeFields(t);
  if (min <= max) return null;
  return side === 'min' ? rangePatch(min, min) : rangePatch(max, max);
}

/**
 * M30: exercício feito só com o peso do corpo, pelo nome. Máquinas e polias de mesmo nome ficam de
 * fora ("Abdominal Crunch (Máquina)", "Mesa Flexora"), e carga zero sozinha não basta: um exercício
 * de máquina sem a carga anotada não deve ganhar repetições.
 */
export function isBodyweight(name: string): boolean {
  const n = normalizeExerciseName(name);
  if (/maquina|polia|cabo|halter|barra\)|anilha|mesa|cadeira|leg press|smith/.test(n) && !/barra fixa/.test(n)) return false;
  return /flexao de braco|barra fixa|pull-?up|chin-?up|paralela|mergulho|dips|abdominal|prancha|burpee|polichinelo|afundo|agachamento (livre )?sem peso|peso do corpo|elevacao pelvica|roda abdominal|ponte|super-?homem|remada invertida/.test(n);
}

/** M30: sem carga, a progressão anda nas repetições: todas as séries no alvo pedem uma rep a mais. */
function bodyweightProgression(name: string, ref: ReturnType<typeof reference>, max: number, planned: number): Progression | null {
  if (!isBodyweight(name)) return null;
  const reps = ref.atWeight.map(s => s.reps);
  const target = Math.max(max, Math.min(...reps));
  if (ref.atWeight.length >= planned && reps.every(r => r >= target) && !ref.atWeight.some(s => s.failure)) {
    return { kind: 'up', weight: 0, reps: target + 1, reason: `+1 rep: ${target} nas ${planned} séries; agora ${target + 1}.` };
  }
  return { kind: 'keep', weight: 0, reps: target, reason: `Busque ${target} reps em todas (última: ${reps.join(' · ')}).` };
}

// cargas em centésimos: 41,25 kg (anilhas de 1,25) existe; arredondar em décimos dava 41,3
const roundKg = (n: number) => Math.round(n * 100) / 100;
const kg = (n: number) => `${String(roundKg(n)).replace('.', ',')} kg`;

/** Carga de referência da sessão (última série de trabalho) e as séries feitas com ela. */
function reference(entry: WorkoutEntry) {
  const sets = workSets(entry);
  const weight = sets.length ? sets[sets.length - 1]!.weight : 0;
  return { weight, sets, atWeight: sets.filter(s => s.weight === weight) };
}

/**
 * Estagnação: as últimas sessões na mesma carga, nenhuma no topo, o total de repetições sem crescer
 * e a última com alguma série abaixo do começo da faixa. Ficar no começo da faixa (o que o treino
 * já preenche) não é estagnar: é a carga certa, ainda sem subir.
 */
function stalled(history: WorkoutEntry[], weight: number, min: number, max: number, planned: number): boolean {
  if (history.length < STALL_SESSIONS) return false;
  const lastN = history.slice(-STALL_SESSIONS).map(reference);
  if (lastN.some(r => r.weight !== weight || r.atWeight.length >= planned && r.atWeight.every(s => s.reps >= max))) return false;
  const total = (r: ReturnType<typeof reference>) => r.atWeight.reduce((n, s) => n + s.reps, 0);
  const lastRef = lastN[lastN.length - 1]!;
  return total(lastRef) <= total(lastN[0]!) && lastRef.atWeight.some(s => s.reps < min);
}

const DAY_MS = 86_400_000;
const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00`) - Date.parse(`${from}T12:00:00`)) / DAY_MS);
const dayMonth = (key: string) => `${key.slice(8, 10)}/${key.slice(5, 7)}`;

/** Data da primeira sessão seguida com a carga de agora (quando a carga mudou pela última vez). */
function weightSince(sessions: { date: string; entry: WorkoutEntry }[], weight: number): string {
  let since = sessions[sessions.length - 1]!.date;
  for (let i = sessions.length - 1; i >= 0 && reference(sessions[i]!.entry).weight === weight; i--) since = sessions[i]!.date;
  return since;
}

/**
 * Sugestão para o próximo treino do exercício, a partir das sessões anteriores a `date`.
 * `null` quando não há o que sugerir (cardio, tempo, peso do corpo).
 */
export function suggestProgression(workouts: readonly Workout[], key: string, target: Target, date: string): Progression | null {
  const range = repRange(target);
  // linear: sem faixa; as reps do plano (o topo) valem para subir e continuam as mesmas depois
  const { min, max } = target.linear ? { min: range.max, max: range.max } : range;
  // M32: treino de deload não é base da progressão
  const sessions = sessionsOf(workouts, key)
    .filter(s => s.workout.date < date && !s.workout.deload && workSets(s.entry).length)
    .map(s => ({ date: s.workout.date, entry: s.entry }));
  const history = sessions.map(s => s.entry);
  const last = history[history.length - 1];
  // as repetições abrem no começo da faixa: o topo é a meta, não o ponto de partida
  if (!last) return target.weight > 0 ? { kind: 'first', weight: target.weight, reps: min, reason: '' } : null;

  const ref = reference(last);
  if (ref.weight <= 0) return bodyweightProgression(key, ref, max, Math.max(1, target.sets));
  const inc = incrementFor(target, ref.weight);
  const planned = Math.max(1, target.sets);
  // linear: as reps do plano são fixas; na dupla, o treino abre no começo da faixa
  const reps = min;

  if (last.aggregated) {
    return { kind: 'keep', weight: ref.weight, reps, reason: `Mantém ${kg(ref.weight)}: a última vez é um registro antigo, sem as séries.` };
  }
  if (ref.atWeight.length >= planned && ref.atWeight.every(s => s.reps >= max) && ref.atWeight.some(s => s.failure)) {
    return { kind: 'keep', weight: ref.weight, reps, reason: `Mantém ${kg(ref.weight)}: chegou a ${max} reps, mas indo até a falha.` };
  }
  if (ref.atWeight.length >= planned && ref.atWeight.every(s => s.reps >= max)) {
    // uma subida por semana, no máximo: o corpo leva dias para se adaptar à carga nova
    const since = weightSince(sessions, ref.weight);
    const days = daysBetween(since, date);
    if (days < MIN_DAYS_BETWEEN_UPS) {
      const from = dayMonth(new Date(Date.parse(`${since}T12:00:00`) + MIN_DAYS_BETWEEN_UPS * DAY_MS).toISOString().slice(0, 10));
      return {
        kind: 'keep', weight: ref.weight, reps,
        reason: `Mantém ${kg(ref.weight)}: ${max} reps em todas, mas essa carga é de ${days === 1 ? '1 dia' : `${days} dias`} atrás. Sobe a partir de ${from} (no máximo uma vez por semana).`
      };
    }
    return { kind: 'up', weight: roundKg(ref.weight + inc), reps: min, reason: `+${kg(inc)}: ${max} reps nas ${planned} séries.` };
  }
  if (stalled(history, ref.weight, range.min, max, planned)) {
    // a folga de 1e-9 evita que 22,5 / 2,5 = 8,9999… desça um degrau a mais
    const weight = roundKg(Math.floor((ref.weight * 0.9) / inc + 1e-9) * inc);
    if (weight > 0) {
      return { kind: 'deload', weight, reps, reason: `−10%: ${STALL_SESSIONS} treinos sem evoluir com ${kg(ref.weight)}.` };
    }
    // carga tão leve que o −10% chegaria a zero: não há para onde baixar
    return { kind: 'keep', weight: ref.weight, reps, reason: `Mantém ${kg(ref.weight)}: ${STALL_SESSIONS} treinos sem evoluir, mas a carga já é a menor do incremento.` };
  }
  if (ref.atWeight.length < planned) {
    return { kind: 'keep', weight: ref.weight, reps, reason: `Mantém ${kg(ref.weight)}: ${ref.atWeight.length} de ${planned} séries na última vez.` };
  }
  return {
    kind: 'keep', weight: ref.weight, reps,
    reason: `Mantém ${kg(ref.weight)}: busque ${max} reps em todas (última: ${ref.atWeight.map(s => s.reps).join(' · ')}).`
  };
}
