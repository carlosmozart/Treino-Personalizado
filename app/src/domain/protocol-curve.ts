// Z2: curva estimada de uma substância ao longo do protocolo (a ideia do steroidplotter.com), com a
// meia-vida que a PESSOA informa (o app não tem tabela de meias-vidas). Modelo simples de propósito:
// cada dose entra inteira na hora e cai pela metade a cada meia-vida; o que sobra das doses
// anteriores soma. Mostra a quantidade estimada ainda ativa, na unidade da dose, não nível no sangue.
import { addDays, fromDateKey, toDateKey, type DateKey } from './dates';
import type { AppData, Protocol, ProtocolItem } from './model';
import { isDue, protocolEnd } from './protocol';

export type CurveMode = 'plan' | 'logged';

export interface CurvePoint { t: number; value: number }
export interface CurveWeek { week: number; start: DateKey; max: number; min: number }

export interface Curve {
  points: CurvePoint[];
  /** Instante de "agora" (para a marca de hoje), ou null se fora da janela. */
  now: number | null;
  /** Último dia com dose (fim do protocolo ou da substância). */
  lastDose: number | null;
  doses: number;
  /** Semanas até chegar perto do estável (5 meias-vidas), contando da primeira dose. */
  steadyWeeks: number;
  weeks: CurveWeek[];
  max: number;
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/** Doses do plano entram às 8h; as registradas, na hora em que foram registradas. */
const DOSE_HOUR = 8;
/** Até onde a curva vai depois da última dose: 5 meias-vidas, no máximo 8 semanas. */
const MAX_TAIL_DAYS = 56;
/** Protocolo contínuo: mostra até 8 semanas à frente e, para trás, no máximo 26 semanas. */
const AHEAD_DAYS = 56;
const BACK_DAYS = 182;
const MAX_POINTS = 360;

export const MIN_HALF_LIFE_HOURS = 0.5;
export const MAX_HALF_LIFE_HOURS = 90 * 24;

/** Um dia à `hour` hora local (fromDateKey devolve o meio-dia; aqui parte da meia-noite). */
function at(date: DateKey, hour = DOSE_HOUR): number {
  const d = fromDateKey(date);
  d.setHours(hour, 0, 0, 0);
  return d.getTime();
}

/** Doses que alimentam a curva: as previstas ou, até hoje, as registradas (e o resto previsto). */
function doseTimes(data: Pick<AppData, 'doses'>, p: Protocol, item: ProtocolItem, mode: CurveMode, today: DateKey, until: DateKey): { t: number; amount: number }[] {
  const out: { t: number; amount: number }[] = [];
  const logged = mode === 'logged'
    ? Object.values(data.doses ?? {}).filter(d => d.protocolId === p.id && d.itemId === item.id && d.date <= today)
    : [];
  const loggedDays = new Set(logged.map(d => d.date));
  for (const d of logged) {
    const when = new Date(d.at);
    // a hora do registro, se for do mesmo dia; senão 8h do dia informado
    out.push({ t: toDateKey(when) === d.date ? when.getTime() : at(d.date), amount: d.dose });
  }
  for (let d = p.startDate; d <= until; d = addDays(d, 1)) {
    if (!isDue(p, item, d)) continue;
    if (mode === 'logged' && (d < today || loggedDays.has(d))) continue;
    out.push({ t: at(d), amount: item.dose });
  }
  return out.sort((a, b) => a.t - b.t);
}

/** Quantidade estimada num instante: a soma do que resta de cada dose já tomada. */
export function amountAt(doses: { t: number; amount: number }[], t: number, halfLifeHours: number): number {
  const h = halfLifeHours * HOUR;
  let sum = 0;
  for (const d of doses) {
    if (d.t > t) break;
    sum += d.amount * 0.5 ** ((t - d.t) / h);
  }
  return sum;
}

export function estimateCurve(data: Pick<AppData, 'doses'>, p: Protocol, item: ProtocolItem, mode: CurveMode, now: Date): Curve | null {
  const half = item.halfLifeHours;
  if (!half || half < MIN_HALF_LIFE_HOURS) return null;
  const today = toDateKey(now);
  const end = protocolEnd(p);
  const until = end ?? addDays(today > p.startDate ? today : p.startDate, AHEAD_DAYS);
  const doses = doseTimes(data, p, item, mode, today, until);
  if (!doses.length) return null;
  // contínuo não tem queda no fim: a curva para na última dose mostrada, sem a "cauda"
  const tailDays = end ? Math.min(MAX_TAIL_DAYS, Math.ceil((5 * half) / 24)) : 0;
  const from = Math.max(at(p.startDate, 0), at(addDays(today, -BACK_DAYS), 0));
  const to = Math.max(doses.at(-1)!.t, at(until, 0) + DAY) + tailDays * DAY;
  if (to <= from) return null;

  // grade regular e, em cada dose, o instante antes e o depois (o "dente" da curva)
  const step = Math.max(HOUR, (to - from) / MAX_POINTS);
  const times = new Set<number>();
  for (let t = from; t <= to; t += step) times.add(Math.round(t));
  for (const d of doses) if (d.t >= from && d.t <= to) { times.add(d.t - 1); times.add(d.t); }
  const points = [...times].sort((a, b) => a - b).map(t => ({ t, value: amountAt(doses, t, half) }));

  // semana a semana: maior e menor valor estimado (as horas antes da primeira dose não contam)
  const weeks: CurveWeek[] = [];
  const startMs = at(p.startDate, 0);
  for (const pt of points) {
    if (pt.t < doses[0]!.t) continue;
    const week = Math.floor((pt.t - startMs) / (7 * DAY)) + 1;
    const last = weeks.at(-1);
    if (last && last.week === week) { last.max = Math.max(last.max, pt.value); last.min = Math.min(last.min, pt.value); }
    else weeks.push({ week, start: addDays(p.startDate, (week - 1) * 7), max: pt.value, min: pt.value });
  }
  const nowMs = now.getTime();
  return {
    points,
    now: nowMs >= from && nowMs <= to ? nowMs : null,
    lastDose: doses.at(-1)!.t,
    doses: doses.length,
    steadyWeeks: Math.max(1, Math.ceil((5 * half) / (24 * 7))),
    weeks,
    max: Math.max(...points.map(x => x.value))
  };
}

/** "8 h", "1,5 dia", "4,5 dias". */
export function halfLifeText(hours: number): string {
  if (hours < 48) return `${String(Math.round(hours * 10) / 10).replace('.', ',')} h`;
  const days = Math.round((hours / 24) * 10) / 10;
  return `${String(days).replace('.', ',')} ${days === 1 ? 'dia' : 'dias'}`;
}
