// Busca da ilustração pelo nome (Q1/Q5): nome exato da biblioteca ou do plano; senão o nome sem
// o complemento entre parênteses ("Leg Press 45º (Amplitude Parcial)" → "Leg Press 45º"), que
// também cobre exercícios criados pela IA ou pelo usuário com variações no nome.
import { normalizeExerciseName } from '../domain/text';
import { ILLUSTRATION_BY_NAME } from './illustration-map';

const baseName = (name: string) => normalizeExerciseName(name.replace(/\s*\([^)]*\)\s*$/, ''));

const EXACT = new Map<string, string>();
const BASE = new Map<string, string>();
for (const [name, id] of Object.entries(ILLUSTRATION_BY_NAME)) {
  EXACT.set(normalizeExerciseName(name), id);
  // a primeira variação listada vence (ex.: "Supino Reto" → a versão com barra)
  if (!BASE.has(baseName(name))) BASE.set(baseName(name), id);
}

export function illustrationIdFor(name: string): string | null {
  return EXACT.get(normalizeExerciseName(name)) ?? EXACT.get(baseName(name)) ?? BASE.get(baseName(name)) ?? null;
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
