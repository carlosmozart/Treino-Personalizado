import { create } from 'zustand';

interface RestState {
  /** Fim do descanso em ms (Date.now), ou null se parado. */
  endsAt: number | null;
  total: number;
  /** T4: o exercício (índice no treino) cuja série começou o descanso. */
  source: number | null;
  /** T4: o último descanso que chegou ao fim (o tempo acabou ou "Pular"); `seq` muda a cada um. */
  ended: { source: number | null; seq: number } | null;
  start(seconds: number, now?: number, source?: number | null): void;
  add(seconds: number, now?: number): void;
  /** Para sem avisar ninguém (treino cancelado ou concluído). */
  stop(): void;
  /** Fim do descanso: o tempo acabou ou a pessoa pulou. */
  finish(): void;
}

export const useRestStore = create<RestState>((set, get) => ({
  endsAt: null,
  total: 0,
  source: null,
  ended: null,
  start: (seconds, now = Date.now(), source = null) => { primeRestSound(); set({ endsAt: now + seconds * 1000, total: seconds, source }); },
  add: (seconds, now = Date.now()) => {
    const { endsAt, total } = get();
    if (endsAt === null) return;
    const next = Math.max(now, endsAt + seconds * 1000);
    set({ endsAt: next, total: Math.max(1, total + seconds) });
  },
  stop: () => set({ endsAt: null, total: 0, source: null }),
  finish: () => {
    const { endsAt, source, ended } = get();
    if (endsAt === null) return;
    set({ endsAt: null, total: 0, source: null, ended: { source, seq: (ended?.seq ?? 0) + 1 } });
  }
}));

// Som do descanso (O13): um AudioContext só, destravado pelo toque que inicia o descanso (o
// navegador só deixa tocar som a partir de um gesto) e suspenso depois do aviso, para continuar
// funcionando após tela bloqueada ou troca de app.
let audio: AudioContext | null = null;

function audioContext(): AudioContext | null {
  try {
    if (!audio && typeof window.AudioContext === 'function') audio = new window.AudioContext();
  } catch { audio = null; }
  return audio;
}

/** Chamar no toque que inicia o descanso. */
export function primeRestSound(): void {
  const ctx = audioContext();
  if (ctx && ctx.state !== 'running') void ctx.resume().catch(() => undefined);
}

/** Aviso de fim do descanso: vibração e um bipe curto, conforme os ajustes. */
export function restAlert({ sound, vibrate }: { sound: boolean; vibrate: boolean }): void {
  if (vibrate && typeof navigator.vibrate === 'function') navigator.vibrate([0, 400, 200, 400]);
  if (!sound) return;
  const ctx = audioContext();
  if (!ctx) return;
  const beep = () => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
    osc.onended = () => { void ctx.suspend().catch(() => undefined); };
  };
  try {
    if (ctx.state === 'running') beep();
    else void ctx.resume().then(beep, () => undefined);
  } catch { /* sem áudio: fica a vibração */ }
}
