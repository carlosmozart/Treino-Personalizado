// T15: ritmo semanal do peso. A tendência das últimas 3 semanas (reta pelos pontos, que o peso do
// dia oscila), em kg e em % do peso por semana, comparada com um ritmo saudável para a meta.
import { addDays, fromDateKey, type DateKey } from './dates';
import type { WeightGoal } from './body-goal';

export type PaceStatus = 'no ritmo' | 'rápido demais' | 'devagar' | 'estável' | 'subindo' | 'descendo';

export interface WeightPace {
  kgPerWeek: number;
  pctPerWeek: number;
  /** Sem meta, só a direção. */
  status: PaceStatus;
  /** O ritmo saudável para a meta, para o texto ("0,25% a 1% por semana"). */
  range: string | null;
  weighIns: number;
}

const WINDOW_DAYS = 21;

/** Kg por semana pela reta dos mínimos quadrados, com pelo menos 3 pesagens em 7 dias ou mais. */
export function weightPace(weighIns: readonly { date: DateKey; weight: number }[], today: DateKey, goal?: Pick<WeightGoal, 'startWeight' | 'targetWeight'>): WeightPace | null {
  const from = addDays(today, -WINDOW_DAYS);
  const pts = weighIns.filter(w => w.date > from && w.date <= today && w.weight > 0).sort((a, b) => a.date.localeCompare(b.date));
  if (pts.length < 3) return null;
  const day = (d: DateKey) => fromDateKey(d).getTime() / 86400000;
  const xs = pts.map(p => day(p.date)), ys = pts.map(p => p.weight);
  if (xs[xs.length - 1]! - xs[0]! < 7) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let num = 0, den = 0;
  xs.forEach((x, i) => { num += (x - mx) * (ys[i]! - my); den += (x - mx) ** 2; });
  if (den === 0) return null;
  const kgPerWeek = Math.round((num / den) * 7 * 100) / 100;
  const current = my;
  const pctPerWeek = Math.round((kgPerWeek / current) * 100 * 100) / 100;
  const dir = !goal ? 0 : goal.targetWeight < goal.startWeight - 0.5 ? -1 : goal.targetWeight > goal.startWeight + 0.5 ? 1 : 0;
  let status: PaceStatus, range: string | null;
  if (dir < 0) {
    range = '0,25% a 1% por semana';
    status = pctPerWeek <= -1 ? 'rápido demais' : pctPerWeek <= -0.25 ? 'no ritmo' : 'devagar';
  } else if (dir > 0) {
    range = '0,1% a 0,5% por semana';
    status = pctPerWeek >= 0.5 ? 'rápido demais' : pctPerWeek >= 0.1 ? 'no ritmo' : 'devagar';
  } else {
    range = goal ? 'até 0,25% por semana para cima ou para baixo' : null;
    status = Math.abs(pctPerWeek) <= 0.25 ? 'estável' : pctPerWeek > 0 ? 'subindo' : 'descendo';
  }
  return { kgPerWeek, pctPerWeek, status, range, weighIns: pts.length };
}
