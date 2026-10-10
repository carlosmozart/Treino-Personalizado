// Busca de exercícios tolerante (S6): sem acento, com erro de digitação, plural e abreviação.
import { normalizeExerciseName } from './text';

/** Abreviações comuns na academia. */
const SHORT: Record<string, string> = { db: 'halteres', hbc: 'halteres', bb: 'barra', sl: 'stiff', rdl: 'stiff' };

const words = (s: string) => normalizeExerciseName(s).replace(/[^a-z0-9 ]/g, ' ').split(' ').filter(Boolean);
const singular = (w: string) => (w.length > 3 ? w.replace(/(oes|aes)$/, 'ao').replace(/es$/, '').replace(/s$/, '') : w);

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j]!;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length]!;
}

/** Quanto uma palavra digitada casa com uma palavra do nome: 0 = igual, maior = pior, null = não casa. */
function wordScore(q: string, w: string): number | null {
  const a = singular(SHORT[q] ?? q), b = singular(w);
  if (a === b) return 0;
  if (b.startsWith(a)) return 1;
  if (a.length < 4) return null;
  const d = distance(a, b.slice(0, Math.max(a.length, Math.min(b.length, a.length + 1))));
  return d <= (a.length >= 7 ? 2 : 1) ? 2 + d : null;
}

/**
 * Nomes que casam com a busca, os melhores primeiro (todas as palavras digitadas precisam casar).
 * `done`: chaves dos exercícios que a pessoa já fez; sobem na frente dos parecidos, mas um erro de
 * digitação não passa um acerto.
 */
export function searchNames(query: string, names: readonly string[], limit = 6, done?: ReadonlySet<string>): string[] {
  const qs = words(query);
  if (!qs.length) return [];
  const scored: { n: string; score: number }[] = [];
  names.forEach((n, i) => {
    const ws = words(n);
    let score = 0;
    for (const q of qs) {
      const best = Math.min(...ws.map(w => wordScore(q, w) ?? Infinity));
      if (best === Infinity) return;
      score += best;
    }
    // nome que começa com a busca e nomes curtos sobem; empate fica na ordem da biblioteca
    if (!normalizeExerciseName(n).startsWith(normalizeExerciseName(query))) score += 0.5;
    if (done?.has(normalizeExerciseName(n))) score -= 0.75;
    scored.push({ n, score: score * 100 + ws.length + i / 1e4 });
  });
  return scored.sort((a, b) => a.score - b.score).slice(0, limit).map(x => x.n);
}

/**
 * Nomes para buscar: a biblioteca e, no fim, os nomes do histórico que não estão nela (exercícios
 * digitados à mão), mais as chaves do que já foi feito, para a busca dar prioridade.
 */
export function searchPool(library: readonly string[], history: readonly { entries: readonly { key: string; name: string }[] }[]) {
  const done = new Set<string>();
  const extra = new Map<string, string>();
  const inLibrary = new Set(library.map(normalizeExerciseName));
  for (const w of history) for (const e of w.entries) {
    done.add(e.key);
    if (!inLibrary.has(e.key) && !extra.has(e.key)) extra.set(e.key, e.name);
  }
  return { names: [...library, ...extra.values()], done };
}
