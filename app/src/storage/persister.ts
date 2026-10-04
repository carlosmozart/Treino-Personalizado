// Gravação adiada e em fila: vários toques seguidos viram uma gravação, nunca há duas ao mesmo
// tempo e a última versão sempre vence. `flush` grava já (ao sair do app, antes de exportar).

export interface Persister<T> {
  schedule(value: T): void;
  flush(): Promise<void>;
  readonly pending: boolean;
}

export function createPersister<T>(write: (value: T) => Promise<void>, options: { delay?: number; onError?: (error: unknown) => void } = {}): Persister<T> {
  const delay = options.delay ?? 250;
  let next: { value: T } | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let running: Promise<void> = Promise.resolve();

  function drain(): Promise<void> {
    if (timer) { clearTimeout(timer); timer = null; }
    running = running.then(async () => {
      while (next) {
        const { value } = next;
        next = null;
        try { await write(value); } catch (error) { options.onError?.(error); }
      }
    });
    return running;
  }

  return {
    schedule(value) {
      next = { value };
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { void drain(); }, delay);
    },
    flush: drain,
    get pending() { return next !== null; }
  };
}
