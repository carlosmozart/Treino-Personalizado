// Biblioteca de exercícios por grupo (a mesma do app antigo, data/static-config.js).
import { normalizeExerciseName } from '../domain/text';

export const EXERCISE_LIBRARY: Record<string, readonly string[]> = {
  Peito: [
    'Supino Reto (Barra)',
    'Supino Reto (Halteres)',
    'Supino Inclinado (Barra)',
    'Supino Inclinado (Halteres)',
    'Supino Declinado (Máquina)',
    'Supino Articulado',
    'Crossover (Polia Alta)',
    'Crossover (Polia Baixa)',
    'Peck Deck (Voador)',
    'Flexão de Braço (Solo)',
    'Paralelas / Mergulho (Dips)',
    'Crucifixo com Halteres'
  ],
  Costas: [
    'Puxada Frontal (Polia)',
    'Puxada Triângulo',
    'Barra Fixa (Pull-up)',
    'Remada Baixa (Polia)',
    'Remada Curvada (Barra)',
    'Remada Cavalinho',
    'Remada Unilateral (Halter)',
    'Remada Máquina',
    'Pulldown (Corda)',
    'Levantamento Terra',
    'Pullover'
  ],
  Ombro: [
    'Desenvolvimento Militar (Barra)',
    'Desenvolvimento com Halteres',
    'Desenvolvimento Máquina',
    'Elevação Lateral (Halteres)',
    'Elevação Lateral (Polia)',
    'Elevação Frontal',
    'Crucifixo Invertido (Máquina)',
    'Face Pull',
    'Encolhimento (Trapézio)'
  ],
  'Bíceps': [
    'Rosca Direta (Barra)',
    'Rosca Direta (Polia)',
    'Rosca Alternada (Halteres)',
    'Rosca Martelo',
    'Rosca Scott (Barra W)',
    'Rosca Scott Máquina',
    'Rosca Concentrada',
    'Rosca 21'
  ],
  'Tríceps': [
    'Tríceps Pulley (Corda)',
    'Tríceps Pulley (Barra)',
    'Tríceps Testa (Barra/Halteres)',
    'Tríceps Francês',
    'Mergulho no Banco',
    'Tríceps Coice (Halter)',
    'Supino Fechado'
  ],
  'Pernas (Quadríceps)': [
    'Agachamento Livre',
    'Leg Press 45º',
    'Cadeira Extensora',
    'Agachamento Smith',
    'Afundo (Passada)',
    'Agachamento Búlgaro',
    'Hack Squat'
  ],
  'Pernas (Posterior/Glúteo)': [
    'Stiff (Halteres/Barra)',
    'Levantamento Terra Romeno',
    'Mesa Flexora',
    'Cadeira Flexora',
    'Elevação Pélvica (Hip Thrust)',
    'Cadeira Abdutora',
    'Cadeira Adutora',
    'Glúteo na Polia (Coice)'
  ],
  Panturrilha: [
    'Panturrilha em Pé',
    'Panturrilha Sentado',
    'Panturrilha no Leg Press'
  ],
  'Abdômen / Core': [
    'Abdominal Crunch (Máquina)',
    'Abdominal na Polia',
    'Prancha Isométrica',
    'Elevação de Pernas',
    'Abdominal Infra',
    'Rotação de Tronco (Máquina)',
    'Roda Abdominal'
  ],
  Cardio: [
    'Esteira',
    'Bicicleta Ergométrica',
    'Elíptico',
    'Escada (StairMaster)',
    'Remo (Máquina)'
  ]
};

const GROUP_BY_NAME = new Map<string, string>();
for (const [group, names] of Object.entries(EXERCISE_LIBRARY)) {
  for (const name of names) GROUP_BY_NAME.set(normalizeExerciseName(name), group);
}

/** Grupo muscular quando o nome é exatamente um da biblioteca. */
export function groupOf(name: string): string | null {
  return GROUP_BY_NAME.get(normalizeExerciseName(name)) ?? null;
}

export function isCardioName(name: string): boolean {
  return groupOf(name) === 'Cardio';
}

/** Equipamento entre parênteses no nome ("Supino Reto (Halteres)" → "halteres"). */
function equipmentOf(name: string): string {
  return normalizeExerciseName(/\(([^)]*)\)\s*$/.exec(name)?.[1] ?? '');
}

/**
 * Grupo de um nome fora da biblioteca ("Remada Cavalinho ou Máquina"): o grupo mais comum entre os
 * exercícios da biblioteca que começam com a mesma palavra ("Remada…" → Costas).
 */
export function guessGroup(name: string): string | null {
  const exact = groupOf(name);
  if (exact) return exact;
  const first = normalizeExerciseName(name).split(' ')[0];
  if (!first || first.length < 4) return null;
  const count = new Map<string, number>();
  for (const [group, names] of Object.entries(EXERCISE_LIBRARY)) {
    for (const n of names) if (normalizeExerciseName(n).split(' ')[0] === first) count.set(group, (count.get(group) ?? 0) + 1);
  }
  return [...count].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

/** Primeira palavra do nome: a família do movimento ("supino", "remada", "rosca"). */
const movementOf = (name: string) => normalizeExerciseName(name).split(' ')[0] ?? '';

/**
 * Troca que faz sentido no treino do dia: mesmo grupo muscular, sem repetir o que já está no treino,
 * o mesmo movimento primeiro (outro supino para um supino), depois o mesmo equipamento. Sem grupo
 * conhecido, usa o grupo que mais aparece no treino de hoje.
 */
export function swapSuggestions(name: string, todayNames: readonly string[], exclude: readonly string[] = [], limit = 6, favorites?: ReadonlySet<string>): { group: string | null; names: string[] } {
  let group = guessGroup(name);
  if (!group) {
    const count = new Map<string, number>();
    for (const n of todayNames) { const g = guessGroup(n); if (g && g !== 'Cardio') count.set(g, (count.get(g) ?? 0) + 1); }
    group = [...count].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  }
  if (!group || group === 'Cardio') return { group, names: [] };
  const skip = new Set([name, ...todayNames, ...exclude].map(normalizeExerciseName));
  const movement = movementOf(name), equipment = equipmentOf(name);
  const names = (EXERCISE_LIBRARY[group] ?? [])
    .filter(n => !skip.has(normalizeExerciseName(n)))
    .map((n, i) => ({ n, rank: (favorites?.has(normalizeExerciseName(n)) ? -4 : 0) + (movementOf(n) === movement ? 0 : 2) + (equipment && equipmentOf(n) === equipment ? 0 : 1), i }))
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .slice(0, limit)
    .map(x => x.n);
  return { group, names };
}
