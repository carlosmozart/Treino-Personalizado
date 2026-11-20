// Z4: horário das doses e lembretes.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DISCREET_BODY, doseRemindersFor, doseRemindersKey } from './protocol-reminders';
import { itemSchedule, logDose, saveProtocol } from './protocol';
import { estimateCurve } from './protocol-curve';
import { updateSettings } from './actions';
import { sampleData } from './testing';
import type { AppData, Protocol, ProtocolItem } from './model';

const NOW = new Date(2026, 10, 18, 9); // quarta, 9h
const item = (over: Partial<ProtocolItem> = {}): ProtocolItem => ({
  id: 'i1', name: 'Substância A', category: 'hormonio', route: 'sc', dose: 250, unit: 'mcg', schedule: { every: 1 }, timesPerDay: 2, times: ['08:00', '20:00'], perMl: 2500, ...over
});
const protocol = (over: Partial<Protocol> = {}): Protocol => ({ id: 'p1', name: 'P', kind: 'outro', startDate: '2026-11-16', items: [item()], ...over });
const setup = (p = protocol(), settings: Partial<AppData['settings']> = { protocolEnabled: true, doseReminders: true }) =>
  updateSettings(saveProtocol(sampleData(), p, NOW).data, settings, NOW).data;

describe('Z4: lembretes de dose', () => {
  it('desligado (ou com a seção desligada) não agenda nada', () => {
    expect(doseRemindersFor(setup(protocol(), { protocolEnabled: true }), NOW)).toEqual([]);
    expect(doseRemindersFor(setup(protocol(), { doseReminders: true }), NOW)).toEqual([]);
  });

  it('próximos 7 dias, sem o horário que já passou nem a dose registrada; texto discreto por padrão', () => {
    let d = setup();
    // a das 20h de hoje já foi registrada (adiantada)
    d = logDose(d, { id: 'x', date: '2026-11-18', name: 'Substância A', dose: 250, unit: 'mcg', route: 'sc', protocolId: 'p1', itemId: 'i1', slot: 1 }, NOW, '2026-11-18').data;
    const list = doseRemindersFor(d, NOW);
    // hoje: 8h já passou e 20h registrada; 19 a 24 nov: 2 por dia
    expect(list).toHaveLength(12);
    expect(list[0]!.at).toEqual(new Date(2026, 10, 19, 8));
    expect(list[1]!.at).toEqual(new Date(2026, 10, 19, 20));
    expect(list.map(r => r.id)).toEqual(Array.from({ length: 12 }, (_, i) => 4300 + i));
    expect(list[0]).toMatchObject({ title: 'Lembrete', body: DISCREET_BODY });
  });

  it('com o ajuste, o aviso diz o nome, a dose, os ml e qual dose do dia', () => {
    const d = setup(protocol(), { protocolEnabled: true, doseReminders: true, doseReminderDetails: true });
    expect(doseRemindersFor(d, NOW)[0]).toMatchObject({ title: 'Hora da dose', body: 'Substância A: 250 mcg (0,1 ml), 2ª de 2' });
  });

  it('dose sem horário não avisa; no máximo 64 avisos', () => {
    expect(doseRemindersFor(setup(protocol({ items: [item({ times: ['', ''] })] })), NOW)).toEqual([]);
    const six = item({ timesPerDay: 6, times: ['06:00', '09:00', '12:00', '15:00', '18:00', '21:00'] });
    const d = setup(protocol({ items: [six, { ...six, id: 'i2' }] }));
    const list = doseRemindersFor(d, NOW);
    expect(list).toHaveLength(64);
    expect(list.at(-1)!.id).toBe(4363);
  });

  it('a assinatura muda quando a lista muda', () => {
    const a = doseRemindersFor(setup(), NOW);
    expect(doseRemindersKey(true, a)).toBe(doseRemindersKey(true, doseRemindersFor(setup(), NOW)));
    expect(doseRemindersKey(true, a)).not.toBe(doseRemindersKey(true, doseRemindersFor(setup(), new Date(2026, 10, 18, 21))));
    expect(doseRemindersKey(false, a)).toBe('off');
  });
});

describe('Z4: horário no protocolo', () => {
  it('texto da frequência com os horários; horário inválido não salva; sobras somem', () => {
    expect(itemSchedule(item())).toBe('2 vezes por dia às 08:00 e 20:00');
    expect(itemSchedule(item({ timesPerDay: undefined as unknown as number, times: ['07:30'] }))).toBe('todo dia às 07:30');
    const base = sampleData();
    expect(saveProtocol(base, protocol({ items: [item({ times: ['25:00', ''] })] }), NOW).data).toBe(base);
    const saved = saveProtocol(base, protocol({ items: [item({ timesPerDay: 1, times: ['08:00', '20:00'] })] }), NOW).data;
    expect(saved.protocols!.p1!.items[0]!.times).toEqual(['08:00']);
    const none = saveProtocol(base, protocol({ items: [item({ times: ['', ''] })] }), NOW).data;
    expect(none.protocols!.p1!.items[0]!.times).toBeUndefined();
  });

  it('a curva usa o horário informado', () => {
    const p = protocol({ weeks: 1, items: [item({ timesPerDay: 1, times: ['07:30'], halfLifeHours: 12 })] });
    const curve = estimateCurve({}, p, p.items[0]!, 'plan', NOW)!;
    const at = (h: number, m = 0) => curve.points.find(pt => pt.t === new Date(2026, 10, 16, h, m).getTime())?.value;
    expect(at(7, 30)).toBeCloseTo(250);
  });
});

describe('Z4: sincronização com o Android', () => {
  afterEach(() => { delete (globalThis as { Capacitor?: unknown }).Capacitor; vi.restoreAllMocks(); vi.useRealTimers(); });

  it('agenda no canal discreto e cancela tudo ao desligar', async () => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
    const plugin = {
      checkPermissions: vi.fn(async () => ({ display: 'granted' as const })),
      requestPermissions: vi.fn(async () => ({ display: 'granted' as const })),
      createChannel: vi.fn(async () => undefined),
      schedule: vi.fn(async () => undefined),
      cancel: vi.fn(async () => undefined)
    };
    (globalThis as { Capacitor?: unknown }).Capacitor = { isNativePlatform: () => true, getPlatform: () => 'android', Plugins: { LocalNotifications: plugin } };
    const { useAppStore } = await import('../store');
    const { syncDoseRemindersNow } = await import('../features/protocol/dose-reminders-sync');
    useAppStore.setState({ data: setup() });
    syncDoseRemindersNow(true);
    await vi.waitFor(() => expect(plugin.schedule).toHaveBeenCalledTimes(1));
    const sent = (plugin.schedule.mock.calls[0] as unknown as [{ notifications: { id: number; channelId: string; body: string }[] }])[0].notifications;
    expect(sent).toHaveLength(13);
    expect(sent[0]).toMatchObject({ id: 4300, channelId: 'protocolo-doses-v1', body: DISCREET_BODY });
    expect(plugin.createChannel).toHaveBeenCalledWith(expect.objectContaining({ id: 'protocolo-doses-v1', visibility: 0 }));
    // desligar: cancela os 64 ids das doses e o do exame (Z5), e não agenda de novo
    useAppStore.setState({ data: updateSettings(useAppStore.getState().data!, { doseReminders: false }, NOW).data });
    syncDoseRemindersNow();
    await vi.waitFor(() => expect(plugin.cancel).toHaveBeenCalledTimes(2));
    expect((plugin.cancel.mock.calls[1] as unknown as [{ notifications: { id: number }[] }])[0].notifications).toHaveLength(65);
    expect(plugin.schedule).toHaveBeenCalledTimes(1);
  });
});
