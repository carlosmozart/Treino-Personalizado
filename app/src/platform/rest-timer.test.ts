// M21: descanso na barra de notificações do APK.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { reconcileRest, type NativeRest } from './rest-timer';

const NOW = 1_000_000;
const native = (over: Partial<NativeRest> = {}): NativeRest => ({ endsAt: NOW + 60_000, total: 90, seq: 3, ...over });
const screen = (endsAt: number | null, pausedLeft: number | null = null) => ({ endsAt, pausedLeft });

describe('M21: acertar a tela com os botões do aviso', () => {
  it('sem mudança nos botões, nada a fazer', () => {
    expect(reconcileRest(screen(NOW + 30_000), native(), 3, NOW, true)).toEqual({ kind: 'none' });
  });

  it('+15s ou −15s no aviso: a tela passa a contar até o novo fim', () => {
    expect(reconcileRest(screen(NOW + 45_000), native({ seq: 4, total: 105 }), 3, NOW, true))
      .toEqual({ kind: 'set', endsAt: NOW + 60_000, total: 105 });
  });

  it('Pular no aviso: o descanso acaba na tela', () => {
    expect(reconcileRest(screen(NOW + 45_000), native({ endsAt: null, seq: 4 }), 3, NOW, true)).toEqual({ kind: 'end' });
  });

  it('descanso pausado na tela ou já terminado: não mexe', () => {
    expect(reconcileRest(screen(null, 20_000), native({ endsAt: null, seq: 4 }), 3, NOW, true)).toEqual({ kind: 'none' });
    expect(reconcileRest(screen(null), native({ seq: 4 }), 3, NOW, true)).toEqual({ kind: 'none' });
  });

  it('ao abrir o app depois de o Android fechá-lo: retoma a contagem se o treino continua; sem treino, tira o aviso', () => {
    expect(reconcileRest(screen(null), native(), null, NOW, true)).toEqual({ kind: 'adopt', endsAt: NOW + 60_000, total: 90 });
    expect(reconcileRest(screen(null), native(), null, NOW, false)).toEqual({ kind: 'hide' });
    expect(reconcileRest(screen(null), native({ endsAt: NOW - 1 }), null, NOW, true)).toEqual({ kind: 'none' });
    expect(reconcileRest(screen(null), native({ endsAt: null }), null, NOW, true)).toEqual({ kind: 'none' });
  });

  it('primeira leitura com descanso na tela: só guarda o seq', () => {
    expect(reconcileRest(screen(NOW + 10_000), native(), null, NOW, true)).toEqual({ kind: 'none' });
  });
});

describe('M21: ponte com o Android', () => {
  afterEach(() => { delete (globalThis as { Capacitor?: unknown }).Capacitor; vi.restoreAllMocks(); vi.useRealTimers(); vi.resetModules(); });

  const install = () => {
    const local = {
      checkPermissions: vi.fn(async () => ({ display: 'granted' as const })),
      requestPermissions: vi.fn(async () => ({ display: 'granted' as const })),
      checkExactNotificationSetting: vi.fn(async () => ({ exact_alarm: 'granted' })),
      schedule: vi.fn(async () => undefined),
      cancel: vi.fn(async () => undefined)
    };
    const listeners: ((s: NativeRest) => void)[] = [];
    let state: NativeRest = { endsAt: null, total: 0, seq: 0 };
    const rest = {
      show: vi.fn(async (o: { endsAt: number; total: number }) => { state = { ...state, endsAt: o.endsAt, total: o.total }; return { exact: true }; }),
      hide: vi.fn(async () => { state = { ...state, endsAt: null }; }),
      getState: vi.fn(async () => state),
      addListener: vi.fn(async (_e: string, cb: (s: NativeRest) => void) => { listeners.push(cb); return { remove: () => undefined }; })
    };
    (globalThis as { Capacitor?: unknown }).Capacitor = {
      isNativePlatform: () => true, getPlatform: () => 'android',
      Plugins: { LocalNotifications: local, RestTimer: rest }
    };
    /** Simula um toque num botão do aviso. */
    const tap = (change: Partial<NativeRest>) => { state = { ...state, ...change, seq: state.seq + 1 }; listeners.forEach(l => l(state)); };
    return { local, rest, tap };
  };

  it('o descanso vai para o aviso nativo (contagem e fim), não para o LocalNotifications', async () => {
    const { local, rest } = install();
    const { scheduleRestAlarm, cancelRestAlarm } = await import('./notifications');
    const at = new Date(Date.now() + 90_000);
    const r = await scheduleRestAlarm(at, { sound: true, vibrate: false, body: 'Próxima: Supino Reto, 80 kg × 8', total: 90, countdown: true, alert: true });
    expect(r).toBe('exact');
    expect(rest.show).toHaveBeenCalledWith(expect.objectContaining({
      endsAt: at.getTime(), total: 90, countdown: true, alert: true, title: 'Descanso', body: 'Próxima: Supino Reto, 80 kg × 8',
      alertTitle: 'Descanso concluído', alertChannel: 'treino-descanso-v3-sound'
    }));
    expect(local.schedule).not.toHaveBeenCalled();
    await cancelRestAlarm();
    expect(rest.hide).toHaveBeenCalledTimes(1);
    expect(local.cancel).not.toHaveBeenCalled();
    // só a contagem (som e vibração desligados): o Android não avisa o fim, a página decide
    expect(await scheduleRestAlarm(at, { sound: false, vibrate: false, body: 'x', total: 90, countdown: true, alert: false })).toBeNull();
    expect(rest.show).toHaveBeenLastCalledWith(expect.objectContaining({ countdown: true, alert: false, body: '' }));
  });

  it('+15s e Pular no aviso mudam o descanso da tela; o ajuste desligado não mostra a contagem', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const { rest, tap } = install();
    const { useAppStore } = await import('../store');
    const { useRestStore } = await import('../features/workout/rest-store');
    const { startRestNativeSync } = await import('../features/workout/rest-native-sync');
    const { sampleData } = await import('../domain/testing');
    useAppStore.setState({ data: sampleData() });
    startRestNativeSync();
    await vi.waitFor(() => expect(rest.getState).toHaveBeenCalled());

    useRestStore.getState().start(90);
    await vi.waitFor(() => expect(rest.show).toHaveBeenCalledTimes(1));
    const first = useRestStore.getState().endsAt!;

    tap({ endsAt: first + 15_000, total: 105 });
    expect(useRestStore.getState()).toMatchObject({ endsAt: first + 15_000, total: 105 });

    tap({ endsAt: null });
    expect(useRestStore.getState().endsAt).toBeNull();
    expect(useRestStore.getState().ended?.seq).toBe(1);

    useAppStore.setState({ data: { ...sampleData(), settings: { ...sampleData().settings, restCountdown: false } } });
    useRestStore.getState().start(60);
    await vi.waitFor(() => expect(rest.show).toHaveBeenCalledTimes(3));
    expect(rest.show).toHaveBeenLastCalledWith(expect.objectContaining({ countdown: false, alert: true }));
  });
});
