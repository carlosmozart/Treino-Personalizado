// Sincronização com a nuvem, independente de qual nuvem seja (Firebase hoje; servidor próprio
// no estilo openGym é possível depois). Quem implementa CloudStore só guarda e devolve o
// documento com um número de revisão; a junção é sempre a de domain/sync.ts.
import type { AppData } from '../domain/model';
import { mergeAppData } from '../domain/sync';

export interface CloudDoc {
  data: AppData;
  /** Aumenta a cada gravação aceita na nuvem. */
  revision: number;
}

export type PushResult =
  | { ok: true; revision: number }
  /**
   * A nuvem não está na revisão informada: vem a versão atual para juntar, ou null se ela foi
   * esvaziada (conta apagada em outro aparelho, por exemplo).
   */
  | { ok: false; current: CloudDoc | null };

export interface CloudStore {
  pull(): Promise<CloudDoc | null>;
  /** Grava só se a nuvem ainda estiver em `baseRevision` (null = nuvem vazia). */
  push(data: AppData, baseRevision: number | null): Promise<PushResult>;
}

export interface SyncResult {
  /** Dados após a junção: o que o aparelho deve passar a usar. */
  data: AppData;
  revision: number;
  /** Houve dados de outro aparelho juntados aos locais. */
  mergedRemote: boolean;
}

export class SyncConflictError extends Error {
  constructor() { super('Outro aparelho continua gravando; tente de novo em instantes.'); }
}

const MAX_ATTEMPTS = 4;

/**
 * Uma rodada de sincronização, como no openGym: envia com a revisão conhecida; se outro aparelho
 * gravou antes, junta com a versão da nuvem e tenta de novo. Na primeira vez (sem revisão
 * conhecida) busca antes, para não sobrescrever dados de outro aparelho.
 */
export async function syncOnce(cloud: CloudStore, local: AppData, knownRevision: number | null): Promise<SyncResult> {
  let data = local;
  let base = knownRevision;
  let mergedRemote = false;

  if (base === null) {
    const remote = await cloud.pull();
    if (remote) {
      data = mergeAppData(data, remote.data);
      base = remote.revision;
      mergedRemote = true;
    }
  }

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const result = await cloud.push(data, base);
    if (result.ok) return { data, revision: result.revision, mergedRemote };
    if (result.current) {
      data = mergeAppData(data, result.current.data);
      base = result.current.revision;
      mergedRemote = true;
    } else {
      base = null;
    }
  }
  throw new SyncConflictError();
}

/** Nuvem em memória para testes e desenvolvimento, com o mesmo contrato das reais. */
export function memoryCloud(initial: CloudDoc | null = null): CloudStore & { doc(): CloudDoc | null; clear(): void; writes: number } {
  let doc = initial ? structuredClone(initial) : null;
  const cloud = {
    writes: 0,
    doc: () => (doc ? structuredClone(doc) : null),
    clear: () => { doc = null; },
    pull: async () => cloud.doc(),
    push: async (data: AppData, baseRevision: number | null): Promise<PushResult> => {
      const current = doc?.revision ?? null;
      if (current !== baseRevision) return { ok: false, current: cloud.doc() };
      doc = { data: structuredClone(data), revision: (current ?? 0) + 1 };
      cloud.writes++;
      return { ok: true, revision: doc.revision };
    }
  };
  return cloud;
}
