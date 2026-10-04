// Divisão dos dados em partes para a nuvem. O Firestore limita cada documento a 1 MiB; anos de
// treino passam disso. Os treinos vão em partes por ano (ou por mês, se um ano não couber), com
// os carimbos de cada treino junto; o resto fica no documento principal. Funções puras: a
// nuvem só grava e lê as partes.
import type { AppData, SyncKey, Workout } from '../domain/model';

/** Limite usado por parte, com folga para o que o Firestore acrescenta. */
export const MAX_PART_BYTES = 900 * 1024;

export interface WorkoutChunk {
  workouts: Workout[];
  /** Carimbos de alteração dos treinos desta parte. */
  changed: Record<SyncKey, string>;
}

export interface CloudParts {
  /** AppData sem os treinos e sem os carimbos deles. */
  main: Omit<AppData, 'workouts'> & { chunkKeys: string[] };
  /** Chave "2026" (ano) ou "2026-03" (mês, quando o ano não cabe numa parte). */
  chunks: Record<string, WorkoutChunk>;
}

export class PartTooLargeError extends Error {
  constructor(part: string, bytes: number) {
    super(`A parte "${part}" dos dados tem ${Math.round(bytes / 1024)} KB e passa do limite da nuvem.`);
  }
}

const encoder = new TextEncoder();
export const byteSize = (value: unknown) => encoder.encode(JSON.stringify(value)).length;

const WORKOUT_PREFIX = 'workout:';

function group(workouts: Workout[], keyOf: (w: Workout) => string): Map<string, Workout[]> {
  const out = new Map<string, Workout[]>();
  for (const w of workouts) {
    const k = keyOf(w);
    out.set(k, [...(out.get(k) ?? []), w]);
  }
  return out;
}

export function splitForCloud(data: AppData, maxBytes = MAX_PART_BYTES): CloudParts {
  const workoutIds = new Set(data.workouts.map(w => w.id));
  const changed: Record<SyncKey, string> = {};
  const chunkChanged = (list: Workout[]) => Object.fromEntries(
    list.flatMap(w => {
      const stamp = data.sync.changed[WORKOUT_PREFIX + w.id];
      return stamp ? [[WORKOUT_PREFIX + w.id, stamp]] : [];
    })
  );
  for (const [k, v] of Object.entries(data.sync.changed)) {
    if (!(k.startsWith(WORKOUT_PREFIX) && workoutIds.has(k.slice(WORKOUT_PREFIX.length)))) changed[k] = v;
  }

  const chunks: Record<string, WorkoutChunk> = {};
  for (const [year, list] of group(data.workouts, w => w.date.slice(0, 4))) {
    const chunk = { workouts: list, changed: chunkChanged(list) };
    if (byteSize(chunk) <= maxBytes) { chunks[year] = chunk; continue; }
    for (const [month, monthList] of group(list, w => w.date.slice(0, 7))) {
      const monthChunk = { workouts: monthList, changed: chunkChanged(monthList) };
      const size = byteSize(monthChunk);
      if (size > maxBytes) throw new PartTooLargeError(month, size);
      chunks[month] = monthChunk;
    }
  }

  const { workouts: _, ...rest } = data;
  const main = { ...rest, sync: { changed, deleted: data.sync.deleted }, chunkKeys: Object.keys(chunks).sort() };
  const size = byteSize(main);
  if (size > maxBytes) throw new PartTooLargeError('principal', size);
  return { main, chunks };
}

/** Remonta o AppData. Treinos em ordem de data e início, como no aparelho. */
export function joinFromCloud(parts: CloudParts): AppData {
  const { chunkKeys, ...main } = parts.main;
  const workouts: Workout[] = [];
  const changed = { ...main.sync.changed };
  for (const key of chunkKeys) {
    const chunk = parts.chunks[key];
    if (!chunk) throw new Error(`Parte "${key}" dos dados não encontrada na nuvem.`);
    workouts.push(...chunk.workouts);
    Object.assign(changed, chunk.changed);
  }
  workouts.sort((a, b) => (a.date !== b.date ? (a.date < b.date ? -1 : 1) : (a.startedAt ?? '').localeCompare(b.startedAt ?? '')));
  return { ...main, workouts, sync: { changed, deleted: { ...main.sync.deleted } } };
}

/** Partes que mudaram entre duas divisões (para gravar só o necessário) e as que sumiram. */
export function changedParts(before: CloudParts | null, after: CloudParts): { write: string[]; remove: string[] } {
  const write = Object.keys(after.chunks).filter(k => !before?.chunks[k] || JSON.stringify(before.chunks[k]) !== JSON.stringify(after.chunks[k]));
  const remove = before ? Object.keys(before.chunks).filter(k => !after.chunks[k]) : [];
  return { write, remove };
}
