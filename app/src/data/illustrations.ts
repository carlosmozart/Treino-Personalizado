// Busca da ilustração pelo nome (Q1/Q5): nome exato da biblioteca ou do plano; senão o nome sem
// o complemento entre parênteses ("Leg Press 45º (Amplitude Parcial)" → "Leg Press 45º"), que
// também cobre exercícios criados pela IA ou pelo usuário com variações no nome.
import { normalizeExerciseName } from '../domain/text';
import { EXERCISE_LIBRARY } from './exercise-library';
import { ILLUSTRATION_BY_NAME } from './illustration-map';

const baseName = (name: string) => normalizeExerciseName(name.replace(/\s*\([^)]*\)\s*$/, ''));

const EXACT = new Map<string, string>();
const BASE = new Map<string, string>();
for (const [name, id] of Object.entries(ILLUSTRATION_BY_NAME)) {
  EXACT.set(normalizeExerciseName(name), id);
  // a primeira variação listada vence (ex.: "Supino Reto" → a versão com barra)
  if (!BASE.has(baseName(name))) BASE.set(baseName(name), id);
}

// Q5: nome livre (criado pela pessoa ou pela IA) casa por palavras: todas as palavras do nome do
// exercício ilustrado (sem o complemento) precisam estar no nome livre, em qualquer ordem
// ("Supino reto com halteres" → "Supino Reto (Halteres)"). Palavras que mudam o movimento
// (inclinado, unilateral, sumô...) ou outro equipamento no nome livre barram a correspondência.
// Os nomes da biblioteca não passam por aqui: os que ficaram sem desenho ficaram de propósito.
const STOP = new Set(['com', 'na', 'no', 'nas', 'nos', 'de', 'da', 'do', 'das', 'dos', 'em', 'e', 'a', 'o', 'p', 'para', 'pela', 'pelo']);
const stem = (w: string) => (w.length > 4 && w.endsWith('es') ? w.slice(0, -2) : w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w);
const words = (name: string) => normalizeExerciseName(name).split(/[^a-z0-9]+/).filter(w => w && !STOP.has(w)).map(stem);
const CHANGES = new Set(words(
  'inverso inversa invertido invertida inclinado inclinada declinado declinada unilateral frontal lateral sumo bulgaro ' +
  'alternado alternada fechada fechado aberta aberto sentado sentada pe martelo concentrada neutra supinada pronada romeno stiff ' +
  'posterior anterior baixa alta reverso reversa curvado curvada cavalinho'
));
const EQUIPMENT = new Set(words('barra halter halteres polia cabo maquina smith corda kettlebell elastico'));
const LIBRARY = new Set(Object.values(EXERCISE_LIBRARY).flat().map(normalizeExerciseName));

const ENTRIES = Object.entries(ILLUSTRATION_BY_NAME).map(([name, id]) => ({
  id, base: words(name.replace(/\s*\([^)]*\)\s*$/, '')), all: new Set(words(name))
}));

function byWords(name: string): string | null {
  const q = new Set(words(name));
  let best: string | null = null, score = -Infinity;
  for (const e of ENTRIES) {
    // números (o 45º do leg press) são opcionais
    if (!e.base.length || !e.base.every(w => q.has(w) || /^\d+$/.test(w))) continue;
    if ([...q].some(w => CHANGES.has(w) && !e.all.has(w))) continue;
    const gear = [...e.all].filter(w => EQUIPMENT.has(w));
    if (gear.length && [...q].some(w => EQUIPMENT.has(w)) && !gear.some(w => q.has(w))) continue;
    // mais palavras em comum vence; no empate, o nome ilustrado mais curto (menos variação)
    const s = [...q].filter(w => e.all.has(w)).length * 10 - e.all.size;
    if (s > score) { best = e.id; score = s; }
  }
  return best;
}

const CACHE = new Map<string, string | null>();

export function illustrationIdFor(name: string): string | null {
  const n = normalizeExerciseName(name);
  if (!CACHE.has(n)) CACHE.set(n, EXACT.get(n) ?? EXACT.get(baseName(name)) ?? BASE.get(baseName(name)) ?? (LIBRARY.has(n) ? null : byWords(name)));
  return CACHE.get(n)!;
}

const FILES = import.meta.glob<string>('../assets/illustrations/*.svg', { query: '?raw', import: 'default' });

export interface IllustrationFrames { start: string; end: string }

/** Carrega as duas posições sob demanda (cada SVG vira um arquivo à parte no build). */
export async function loadIllustration(id: string): Promise<IllustrationFrames | null> {
  const start = FILES[`../assets/illustrations/${id}-a.svg`];
  const end = FILES[`../assets/illustrations/${id}-b.svg`];
  if (!start || !end) return null;
  const [a, b] = await Promise.all([start(), end()]);
  return { start: a, end: b };
}
