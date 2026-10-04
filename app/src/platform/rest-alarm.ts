// Liga o cronômetro de descanso ao alarme do Android: agenda quando o descanso começa ou muda,
// cancela quando para. Com alarme exato agendado, o fim do descanso na tela não toca o bipe da
// página (o Android já toca); sem ele, a página toca e o aviso atrasado é cancelado.

export type Scheduled = 'exact' | 'inexact' | null;

export interface RestAlarmDeps {
  subscribe(listener: (endsAt: number | null, prev: number | null) => void): void;
  schedule(at: Date): Promise<Scheduled>;
  cancel(): Promise<void>;
  enabled(): boolean;
  onError(e: unknown): void;
}

export function startRestAlarm({ subscribe, schedule, cancel, enabled, onError }: RestAlarmDeps) {
  /** Fim do descanso agendado com alarme exato no Android (null = nenhum). */
  let exactFor: number | null = null;
  let queue = Promise.resolve();
  const run = (job: () => Promise<void>) => { queue = queue.then(job).catch(onError); };

  subscribe((endsAt, prev) => {
    if (endsAt === prev) return;
    if (endsAt === null) {
      // terminou na tela ou foi pulado: o Android não precisa avisar de novo
      const handled = exactFor !== null && exactFor <= Date.now() + 500;
      exactFor = null;
      if (!handled) run(cancel);
      return;
    }
    if (!enabled()) { exactFor = null; run(cancel); return; }
    run(async () => { exactFor = (await schedule(new Date(endsAt))) === 'exact' ? endsAt : null; });
  });

  return {
    /** O Android vai tocar exatamente este fim de descanso? */
    handledNatively: (endsAt: number) => exactFor === endsAt
  };
}
