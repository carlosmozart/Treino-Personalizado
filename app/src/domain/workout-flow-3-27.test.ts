// 3.27.0: pausar (W3), treino esquecido (W4), prévia (W11), exercícios que ficaram para trás (W13),
// recorde na hora (W8) e o plano B do atualizador (W5).
import { describe, expect, it } from 'vitest';
import { parseRelease } from './app-update';
import type { Workout } from './model';
import {
  activeMs, addLeftovers, forgottenEnd, forgottenState, pauseSession, resumeSession, sessionToWorkout, startFromPreview, startSession, toggleSet,
  type ActiveSession
} from './session';
import { bestsBefore, recordHint, setRecords, trophiesFor } from './set-records';
import { planExercise, sampleData, samplePlan, workout } from './testing';

const T0 = new Date(2026, 10, 16, 18, 0);
const at = (min: number) => new Date(T0.getTime() + min * 60000);
const start = (): ActiveSession => startSession(sampleData(), 'p1', 'SEG', T0, 's1')!;

describe('W3: pausar', () => {
  it('o tempo pausado não conta, nem na tela nem no treino salvo', () => {
    let s = pauseSession(start(), at(10));
    expect(pauseSession(s, at(11))).toBe(s);
    expect(activeMs(s, at(25))).toBe(10 * 60000);
    s = resumeSession(s, at(25));
    expect(s.pausedAt).toBeUndefined();
    expect(s.pausedMs).toBe(15 * 60000);
    expect(activeMs(s, at(40))).toBe(25 * 60000);
    const w = sessionToWorkout(toggleSet(s, 0, 0), at(40))!;
    expect(w.durationMin).toBe(25);
  });
});

describe('W4: treino esquecido', () => {
  it('pergunta depois do tempo; salva sozinho 5 min depois, só com algo feito', () => {
    const s = start();
    expect(forgottenState(s, at(44), 45)).toBe('ok');
    expect(forgottenState(s, at(46), 45)).toBe('ask');
    expect(forgottenState(s, at(60), 45)).toBe('ask'); // nada feito: só pergunta
    const done = { ...toggleSet(s, 0, 0), lastActivityAt: at(20).toISOString() };
    expect(forgottenState(done, at(66), 45)).toBe('ask');
    expect(forgottenState(done, at(71), 45)).toBe('finish');
    expect(forgottenState(done, at(200), 0)).toBe('ok');
    expect(forgottenState(pauseSession(done, at(21)), at(200), 45)).toBe('ok');
    // termina na última mexida mais um descanso
    expect(forgottenEnd(done, 90, at(200)).getTime()).toBe(at(21.5).getTime());
  });
});

describe('W11: prévia', () => {
  it('Começar acerta o início para a hora do toque', () => {
    const s = { ...start(), preview: true as const };
    const go = startFromPreview(s, at(7));
    expect(go.preview).toBeUndefined();
    expect(go.startedAt).toBe(at(7).toISOString());
    expect(startFromPreview(go, at(9))).toBe(go);
  });
});

describe('W13: terminou cedo', () => {
  it('o treino salvo guarda os exercícios do plano sem série feita (opcionais não)', () => {
    const data = sampleData({ plans: { p1: samplePlan(() => [planExercise('a', 'Supino Reto'), planExercise('b', 'Remada Curvada'), planExercise('c', 'Abdominal', { optional: true })]) } });
    const s = toggleSet(startSession(data, 'p1', 'SEG', T0, 's1')!, 0, 0);
    expect(sessionToWorkout(s, at(30))!.skipped).toEqual(['Remada Curvada']);
  });

  it('põe no começo os que ficaram para trás, sem repetir os de hoje', () => {
    const data = sampleData({ plans: { p1: samplePlan(k => (k === 'SEG' ? [planExercise('a', 'Supino Reto')] : [planExercise('b', 'Remada Curvada', { weight: 50 })])) } });
    const s = startSession(data, 'p1', 'SEG', T0, 's1')!;
    const out = addLeftovers(s, data, ['Remada Curvada', 'Supino Reto', 'Rosca Livre']);
    expect(out.exercises.map(e => e.name)).toEqual(['Remada Curvada', 'Rosca Livre', 'Supino Reto']);
    expect(out.exercises[0]!.sets[0]!.weight).toBe(50);
    expect(out.exercises[0]!.slotId.startsWith('sobra-')).toBe(true);
    expect(addLeftovers(s, data, ['Supino Reto'])).toBe(s);
  });
});

describe('W8: recorde na hora', () => {
  const hist: Workout[] = [workout('2026-11-09', 'Supino', [[10, 60], [8, 60]]), workout('2026-11-12', 'Supino', [[5, 70]])];
  const here = { id: 's', date: '2026-11-16', startedAt: T0.toISOString() };

  it('carga, repetições nesta carga e 1RM; o primeiro treino não tem recorde', () => {
    const b = bestsBefore(hist, 'supino', here)!;
    expect(b.weight).toBe(70);
    expect(setRecords({ reps: 3, weight: 72.5, kind: 'work' }, b, 'reps')).toContain('carga');
    expect(setRecords({ reps: 11, weight: 60, kind: 'work' }, b, 'reps')).toEqual(['reps', 'e1rm']);
    expect(setRecords({ reps: 10, weight: 60, kind: 'work' }, b, 'reps')).toEqual([]);
    expect(setRecords({ reps: 20, weight: 60, kind: 'warmup' }, b, 'reps')).toEqual([]);
    expect(bestsBefore([], 'supino', here)).toBeNull();
  });

  it('a mesma marca duas vezes no treino só ganha um troféu', () => {
    const b = bestsBefore(hist, 'supino', here);
    const sets = [{ reps: 11, weight: 60, kind: 'work' as const, done: true }, { reps: 11, weight: 60, kind: 'work' as const, done: true }];
    expect(trophiesFor(sets, b, 'reps').kinds.map(k => k.length > 0)).toEqual([true, false]);
  });

  it('quanto falta para o recorde na próxima série', () => {
    const b = bestsBefore(hist, 'supino', here);
    expect(recordHint({ reps: 8, weight: 60, kind: 'work' }, b, 'reps')).toBe('Faltam 3 repetições para o recorde com 60 kg (11).');
    expect(recordHint({ reps: 11, weight: 60, kind: 'work' }, b, 'reps')).toBe('Recorde de repetições com 60 kg nesta série.');
    expect(recordHint({ reps: 5, weight: 75, kind: 'work' }, b, 'reps')).toBe('75 kg é a sua maior carga: recorde ao fazer a série.');
    expect(recordHint({ reps: 3, weight: 50, kind: 'work' }, b, 'reps')).toBeNull();
    expect(recordHint({ reps: 8, weight: 60, kind: 'work', done: true }, b, 'reps')).toBeNull();
  });
});

describe('W5: plano B do atualizador', () => {
  it('guarda o endereço do arquivo pela API, só deste repositório', () => {
    const asset = {
      name: 'treino-personalizado-v9.0.0.apk', size: 1,
      browser_download_url: 'https://github.com/carlosmozart/Treino-Personalizado/releases/download/v9.0.0/treino-personalizado-v9.0.0.apk',
      url: 'https://api.github.com/repos/carlosmozart/Treino-Personalizado/releases/assets/12345',
      digest: `sha256:${'a'.repeat(64)}`
    };
    expect(parseRelease({ tag_name: 'v9.0.0', assets: [asset] })?.apiUrl).toBe(asset.url);
    expect(parseRelease({ tag_name: 'v9.0.0', assets: [{ ...asset, url: 'https://api.github.com/repos/outro/repo/releases/assets/1' }] })?.apiUrl).toBeUndefined();
  });
});
