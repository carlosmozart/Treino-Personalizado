import { expect, test } from 'vitest';
import { logWeight, updateProfile } from './actions';
import { mergeBackup, restoreBackup } from './profile-view';
import { nextOpenExercise, startSession, type SessionExercise } from './session';
import { stampAll } from './sync';
import { sampleData, workout } from './testing';
import { useRestStore } from '../features/workout/rest-store';

const at = (day: number, hour = 9) => new Date(2026, 9, day, hour);

test('T1: juntar o backup mantém o que é novo aqui, acrescenta o que só está no arquivo e não duplica', () => {
  // backup feito no dia 20, com um treino do dia 18
  const backup = stampAll(sampleData({ workouts: [workout('2026-10-18', 'Supino Reto', [[10, 40]], 'w18')] }), at(20));
  // depois do backup, este aparelho: outro treino e o nome mudou
  let here = stampAll(sampleData({ workouts: [workout('2026-10-21', 'Remada Curvada', [[10, 30]], 'w21')] }), at(21));
  here = updateProfile(here, { name: 'Ana' }, at(22)).data;

  const merged = mergeBackup(here, backup).data;
  expect(merged.workouts.map(w => w.id)).toEqual(['w18', 'w21']);
  expect(merged.profile.name).toBe('Ana');
  expect(mergeBackup(merged, backup).data.workouts).toHaveLength(2);
  // substituir continua apagando o que era só daqui
  expect(restoreBackup(here, backup, at(23)).data.workouts.map(w => w.id)).toEqual(['w18']);
});

test('T2: pesagem de um dia anterior entra no histórico sem virar o peso atual; data futura é recusada', () => {
  const d = logWeight(sampleData(), 80, '2026-10-22', at(22)).data;
  const before = logWeight(d, 82, '2026-10-20', at(22)).data;
  expect(before.profile.weighIns.map(w => [w.date, w.weight])).toEqual([['2026-10-20', 82], ['2026-10-22', 80]]);
  expect(before.profile.weightKg).toBe(80);
  expect(logWeight(d, 79, '2026-10-23', at(22)).data).toBe(d);
});

test('T3: o próximo pendente pula os concluídos e dá a volta; com tudo feito, nenhum', () => {
  const ex = (done: boolean) => ({ mode: 'reps', sets: [{ reps: 10, weight: 20, kind: 'work', done }] }) as unknown as SessionExercise;
  const list = [ex(false), ex(true), ex(true), ex(false), ex(true)];
  expect(nextOpenExercise(list, 0)).toBe(3);
  expect(nextOpenExercise(list, 3)).toBe(0);
  expect(nextOpenExercise([ex(true), ex(true)], 0)).toBeNull();
  const s = startSession(sampleData(), 'p1', 'SEG', at(19), 's1')!;
  expect(nextOpenExercise(s.exercises, 0)).toBe(1);
});

test('T4: o fim do descanso avisa de qual exercício ele veio; parar não avisa', () => {
  const rest = useRestStore.getState();
  rest.start(60, 0, 2);
  expect(useRestStore.getState().source).toBe(2);
  const seq = useRestStore.getState().ended?.seq ?? 0;
  useRestStore.getState().finish();
  expect(useRestStore.getState()).toMatchObject({ endsAt: null, source: null, ended: { source: 2, seq: seq + 1 } });
  useRestStore.getState().start(60, 0, 1);
  useRestStore.getState().stop();
  expect(useRestStore.getState().ended).toEqual({ source: 2, seq: seq + 1 });
  // sem descanso rodando, terminar não faz nada
  useRestStore.getState().finish();
  expect(useRestStore.getState().ended?.seq).toBe(seq + 1);
});
