// Descanso na barra de notificações do APK (M21): o plugin nativo RestTimer mostra a contagem
// regressiva com −15s, +15s e Pular (funcionam com a tela bloqueada) e agenda o fim do descanso.
// Os botões mudam o descanso sem a página; ela confere o que mudou ao voltar (ou na hora, com o
// app aberto) e acerta o cronômetro da tela.
import { isNative } from './platform';

/** Estado guardado no Android. `seq` sobe a cada toque nos botões do aviso. */
export interface NativeRest { endsAt: number | null; total: number; seq: number }

export interface RestTimerShow {
  endsAt: number;
  total: number;
  /** Aviso fixo com a contagem e os botões. */
  countdown: boolean;
  /** Aviso de fim do descanso, no canal de alarme. */
  alert: boolean;
  title: string;
  body: string;
  alertTitle: string;
  alertBody: string;
  alertChannel: string;
  sound: boolean;
  vibrate: boolean;
}

export interface RestTimerPlugin {
  show(o: RestTimerShow): Promise<{ exact: boolean }>;
  hide(): Promise<void>;
  getState(): Promise<NativeRest>;
  addListener(event: 'restChanged', cb: (s: NativeRest) => void): Promise<{ remove(): void }>;
}

export function restTimerPlugin(): RestTimerPlugin | null {
  if (!isNative()) return null;
  return (globalThis as { Capacitor?: { Plugins?: { RestTimer?: RestTimerPlugin } } }).Capacitor?.Plugins?.RestTimer ?? null;
}

/** O que o cronômetro da tela sabe do descanso. */
export interface ScreenRest { endsAt: number | null; pausedLeft: number | null }

export type RestFix =
  | { kind: 'none' }
  /** Os botões mudaram o fim (−15s ou +15s). */
  | { kind: 'set'; endsAt: number; total: number }
  /** Pular, ou −15s com menos de 15 s: o descanso acabou pelo aviso (o Android já avisou, se for o caso). */
  | { kind: 'end' }
  /** O app foi fechado pelo Android no meio do descanso e o treino continua: a tela retoma a contagem. */
  | { kind: 'adopt'; endsAt: number; total: number }
  /** Sobrou um aviso sem treino em andamento. */
  | { kind: 'hide' };

/**
 * Compara o descanso da tela com o do Android. `lastSeq` é o último `seq` que a tela aplicou
 * (null = ainda nenhum, logo depois de abrir o app).
 */
export function reconcileRest(screen: ScreenRest, native: NativeRest, lastSeq: number | null, now: number, inWorkout: boolean): RestFix {
  const resting = screen.endsAt !== null || screen.pausedLeft !== null;
  const nativeOn = native.endsAt !== null && native.endsAt > now;
  if (lastSeq === null && !resting) {
    if (!nativeOn) return { kind: 'none' };
    return inWorkout ? { kind: 'adopt', endsAt: native.endsAt!, total: native.total } : { kind: 'hide' };
  }
  if (lastSeq !== null && native.seq === lastSeq) return { kind: 'none' };
  // pausado na tela, o aviso não existe: nada a acertar
  if (screen.endsAt === null) return { kind: 'none' };
  if (!nativeOn) return lastSeq === null ? { kind: 'none' } : { kind: 'end' };
  if (native.endsAt === screen.endsAt) return { kind: 'none' };
  return lastSeq === null ? { kind: 'none' } : { kind: 'set', endsAt: native.endsAt!, total: native.total };
}
