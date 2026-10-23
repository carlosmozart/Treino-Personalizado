import { expect, test } from 'vitest';
import { historyCsv } from './history-csv';
import type { Workout } from './model';
import { restAfterSet, startSession } from './session';
import { untrainedGroups } from './stats';
import { planExercise, sampleData, samplePlan, workout } from './testing';

const at = (day: number, hour = 9) => new Date(2026, 9, day, hour);

test('T6: descanso depois do aquecimento segue o ajuste; o lado tem descanso próprio', () => {
  const d = sampleData({ plans: { p1: samplePlan(() => [planExercise('e1', 'Afundo', { restSeconds: 90, perSide: true, sideRestSeconds: 15 })]) } });
  const ex = startSession(d, 'p1', 'SEG', at(19), 's')!.exercises[0]!;
  expect(ex.sideRestSeconds).toBe(15);
  const withWarmup = { ...ex, sets: [{ reps: 10, weight: 5, kind: 'warmup' as const, done: false }, ...ex.sets] };
  expect(restAfterSet(withWarmup, 0, { restSeconds: 60 })).toBe(90);
  expect(restAfterSet(withWarmup, 0, { restSeconds: 60, warmupRest: 0 })).toBe(0);
  expect(restAfterSet(withWarmup, 0, { restSeconds: 60, warmupRest: 30 })).toBe(30);
  expect(restAfterSet(withWarmup, 1, { restSeconds: 60, warmupRest: 30 })).toBe(90);
});

test('T8: grupos sem nenhuma série no período, sem o cardio', () => {
  const d = sampleData({ workouts: [workout('2026-10-20', 'Supino Reto (Barra)', [[10, 40]]), workout('2026-08-01', 'Rosca Direta (Barra)', [[10, 20]])] });
  const groups = untrainedGroups(d, at(22));
  expect(groups).not.toContain('Peito');
  expect(groups).toContain('Bíceps');
  expect(groups).not.toContain('Cardio');
});

test('T9: CSV com uma linha por série, ponto e vírgula, vírgula decimal e texto entre aspas', () => {
  const w: Workout = {
    ...workout('2026-10-22', 'Supino Reto', [[10, 42.5], [8, 42.5]]), dayName: 'Peito; tríceps', deload: true
  };
  w.entries[0]!.sets.unshift({ reps: 12, weight: 20, kind: 'warmup' });
  w.entries[0]!.note = 'pegada "fechada"';
  w.entries.push({ key: 'prancha', name: 'Prancha', mode: 'time', sets: [{ reps: 45, weight: 0, kind: 'work' }] });
  w.entries.push({ key: 'esteira', name: 'Esteira', mode: 'cardio', sets: [], cardio: { minutes: 20, km: 2.5 } });
  const lines = historyCsv([w]).split('\r\n');
  expect(lines[0]).toBe('﻿Data;Treino;Exercício;Série;Tipo;Repetições;Segundos;Carga (kg);Por lado;Até a falha;Minutos;Km;Deload;Nota');
  expect(lines.slice(1, -1)).toEqual([
    '22/10/2026;"Peito; tríceps";Supino Reto;1;Aquecimento;12;;20;;;;;sim;"pegada ""fechada"""',
    '22/10/2026;"Peito; tríceps";Supino Reto;2;Trabalho;10;;42,5;;;;;sim;',
    '22/10/2026;"Peito; tríceps";Supino Reto;3;Trabalho;8;;42,5;;;;;sim;',
    '22/10/2026;"Peito; tríceps";Prancha;1;Trabalho;;45;0;;;;;sim;',
    '22/10/2026;"Peito; tríceps";Esteira;;Cardio;;;;;;20;2,5;sim;'
  ]);
});
