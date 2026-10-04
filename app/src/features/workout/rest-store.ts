import { create } from 'zustand';

interface RestState {
  /** Fim do descanso em ms (Date.now), ou null se parado. */
  endsAt: number | null;
  total: number;
  start(seconds: number, now?: number): void;
  add(seconds: number, now?: number): void;
  stop(): void;
}

export const useRestStore = create<RestState>((set, get) => ({
  endsAt: null,
  total: 0,
  start: (seconds, now = Date.now()) => set({ endsAt: now + seconds * 1000, total: seconds }),
  add: (seconds, now = Date.now()) => {
    const { endsAt, total } = get();
    if (endsAt === null) return;
    const next = Math.max(now, endsAt + seconds * 1000);
    set({ endsAt: next, total: Math.max(1, total + seconds) });
  },
  stop: () => set({ endsAt: null, total: 0 })
}));

/** Aviso de fim do descanso: vibração e um bipe curto, conforme os ajustes. */
export function restAlert({ sound, vibrate }: { sound: boolean; vibrate: boolean }): void {
  if (vibrate && typeof navigator.vibrate === 'function') navigator.vibrate([0, 400, 200, 400]);
  if (!sound) return;
  try {
    const AudioCtx = window.AudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
    osc.onended = () => { void ctx.close(); };
  } catch { /* sem áudio: fica a vibração */ }
}
