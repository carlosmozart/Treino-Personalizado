// Y1: pesagem fora da curva. Antes de salvar, compara com a pesagem mais perto daquele dia (a
// anterior; sem ela, a seguinte). Mais de 15% de diferença pede confirmação: quase sempre é dígito
// trocado (18 no lugar de 81) ou vírgula esquecida (815 no lugar de 81,5).
import type { DateKey } from './dates';

export const WEIGH_IN_JUMP = 0.15;

export interface WeighInJump {
  /** A pesagem usada na comparação. */
  ref: { date: DateKey; weight: number };
  /** Diferença em fração (0,2 = 20% a mais; −0,2 = 20% a menos). */
  change: number;
}

/** A pesagem nova destoa da mais próxima? null quando está dentro dos 15% ou não há com o que comparar. */
export function weighInJump(weighIns: readonly { date: DateKey; weight: number }[], date: DateKey, kg: number): WeighInJump | null {
  if (!(kg > 0)) return null;
  const others = weighIns.filter(w => w.date !== date && w.weight > 0);
  const before = others.filter(w => w.date < date).sort((a, b) => b.date.localeCompare(a.date))[0];
  const after = others.filter(w => w.date > date).sort((a, b) => a.date.localeCompare(b.date))[0];
  const ref = before ?? after;
  if (!ref) return null;
  const change = (kg - ref.weight) / ref.weight;
  return Math.abs(change) > WEIGH_IN_JUMP ? { ref: { date: ref.date, weight: ref.weight }, change } : null;
}
