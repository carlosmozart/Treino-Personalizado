// V8: aquecimento automático nos exercícios compostos (desligado por padrão, Perfil → Treino).
// Rampa a partir da carga de trabalho: barra × 10 (só na barra livre), 40% × 8, 60% × 5 e 80% × 3,
// arredondada ao que dá para montar (anilhas aos pares na barra; 2,5 kg nas máquinas e halteres).
import type { Settings } from './model';
import { DEFAULT_BAR, DEFAULT_PLATES, isBarbell } from './plates';
import { normalizeExerciseName } from './text';

/** Como arredondar a rampa de um exercício: barra (kg) quando é barra livre e o passo de carga. */
export interface WarmupConfig { bar: number | null; step: number }

export interface WarmupStep { reps: number; weight: number }

/** Exercícios que puxam vários grupos de uma vez, onde a rampa faz sentido. */
const COMPOUND = /supino|agachamento|levantamento terra|\bterra\b|remada|desenvolvimento|leg press|\bhack\b|stiff|afundo|bulgaro|passada|avanco|elevacao pelvica|hip thrust/;
/** Isoladores que carregam essas palavras ("remada alta" é ombro, mas pesado; fica). */
const NOT_COMPOUND = /rosca|triceps|extensora|flexora|elevacao lateral|crucifixo|panturrilha|abdominal/;

export function isCompound(name: string): boolean {
  const n = normalizeExerciseName(name);
  return COMPOUND.test(n) && !NOT_COMPOUND.test(n);
}

/** Carga abaixo disso não pede rampa (fora da barra livre). */
const MIN_TOP = 20;

export function warmupConfig(name: string, settings: Pick<Settings, 'barWeight' | 'plates'>): WarmupConfig {
  if (!isBarbell(name)) return { bar: null, step: 2.5 };
  const plates = (settings.plates?.length ? settings.plates : DEFAULT_PLATES).filter(p => p > 0);
  const smallest = plates.length ? Math.min(...plates) : 1.25;
  return { bar: settings.barWeight ?? DEFAULT_BAR, step: Math.round(smallest * 2 * 100) / 100 };
}

const RAMP: readonly [number, number][] = [[0.4, 8], [0.6, 5], [0.8, 3]];

/**
 * As séries de aquecimento até a carga `top`. Na barra, a carga fica em barra + pares de anilhas
 * (arredonda para baixo: o aquecimento nunca passa do planejado). Passos repetidos ou que chegam
 * na carga de trabalho somem.
 */
export function warmupRamp(top: number, config: WarmupConfig): WarmupStep[] {
  const { bar, step } = config;
  if (!(top > 0) || (bar === null && top < MIN_TOP) || (bar !== null && top <= bar)) return [];
  const round = (kg: number) => {
    if (bar === null) return Math.round(kg / step) * step;
    return bar + Math.max(0, Math.floor((kg - bar) / step + 1e-9)) * step;
  };
  const out: WarmupStep[] = bar !== null ? [{ reps: 10, weight: bar }] : [];
  for (const [pct, reps] of RAMP) {
    const weight = Math.round(round(top * pct) * 100) / 100;
    const prev = out[out.length - 1]?.weight ?? 0;
    if (weight > prev && weight < top && weight > 0) out.push({ reps, weight });
  }
  return out;
}
