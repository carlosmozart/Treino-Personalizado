import { describe, expect, it } from 'vitest';
import type { Workout } from './model';
import { sampleData, workout } from './testing';
import { reviewSlides, reviewYearFor, tonsComparison, yearReview, yearsWithWorkouts } from './year-review';

/** Treino num dia e hora, com séries [reps, kg]. */
const at = (date: string, hour: number, name: string, sets: [number, number][], durationMin = 60): Workout => ({
  ...workout(date, name, sets, `w-${date}-${name}`), startedAt: new Date(`${date}T${String(hour).padStart(2, '0')}:00:00`).toISOString(), durationMin
});

describe('retrospectiva do ano (V6)', () => {
  it('cartão do Início: dezembro mostra o ano; janeiro, o anterior; o resto do ano, nada', () => {
    expect(reviewYearFor('2026-12-01')).toBe(2026);
    expect(reviewYearFor('2027-01-31')).toBe(2026);
    expect(reviewYearFor('2026-11-30')).toBeNull();
    expect(reviewYearFor('2027-02-01')).toBeNull();
  });

  it('toneladas em coisas conhecidas', () => {
    expect(tonsComparison(0.5)).toBeNull();
    expect(tonsComparison(1.2)).toBe('1 carro popular');
    expect(tonsComparison(4.6)).toBe('5 carros populares');
    expect(tonsComparison(52)).toBe('9 elefantes');
    expect(tonsComparison(320)).toBe('2 baleias-azuis');
  });

  it('os números do ano: treinos, dias, horas, toneladas, exercício, recordes, dia, mês e peso', () => {
    const d = sampleData();
    d.workouts = [
      at('2025-12-20', 7, 'Supino Reto (Barra)', [[10, 40], [10, 40]]), // ano anterior: só base dos recordes
      at('2026-03-02', 7, 'Supino Reto (Barra)', [[10, 40], [10, 40]]),
      at('2026-03-09', 7, 'Supino Reto (Barra)', [[10, 50], [8, 50]]),
      at('2026-03-16', 8, 'Agachamento Livre', [[10, 60], [10, 60]], 90),
      at('2026-06-01', 7, 'Supino Reto (Barra)', [[10, 52.5], [10, 52.5]])
    ];
    d.gamification.longestStreak = 9;
    d.profile.weighIns = [{ date: '2026-01-10', weight: 80 }, { date: '2026-06-10', weight: 77.6 }, { date: '2025-05-01', weight: 90 }];
    const r = yearReview(d, 2026, new Date(2026, 11, 10));
    expect(r).toMatchObject({ year: 2026, workouts: 4, days: 4, hours: 5, longestStreak: 9, favoriteWeekday: 'segunda', favoritePart: 'manhã' });
    // 800 + 900 + 1200 + 1050 kg
    expect(r.tons).toBe(4);
    expect(r.signature).toEqual({ name: 'Supino Reto (Barra)', sessions: 3, sets: 6, group: 'Peito' });
    // 50 kg e 52,5 kg são recordes de carga; o agachamento é a primeira vez (sem base, não é recorde)
    expect(r.records).toBe(2);
    expect(r.biggestRecord).toEqual({ name: 'Supino Reto (Barra)', weight: 52.5, reps: 10 });
    expect(r.bestMonth).toEqual({ name: 'março', workouts: 3 });
    expect(r.weight).toEqual({ from: 80, to: 77.6, change: -2.4 });
    expect(r.personality.title).toBe('Turma do primeiro raio');
  });

  it('as telas saem na ordem, sem as que não têm número, e o peso some quando a pessoa pede', () => {
    const d = sampleData();
    d.workouts = [at('2026-03-02', 19, 'Supino Reto (Barra)', [[10, 40]], 0)];
    const r = yearReview(d, 2026, new Date(2026, 11, 10));
    const ids = reviewSlides(r).map(s => s.id);
    // um treino só: sem horas (0), sem sequência, sem recorde, sem melhor mês, sem peso
    expect(ids).toEqual(['abertura', 'treinos', 'toneladas', 'exercicio', 'dia', 'jeito', 'resumo']);
    expect(reviewSlides(r)[1]).toMatchObject({ big: '1', text: 'treino em 1 dia.' });
    expect(reviewSlides(r)[2]).toMatchObject({ big: '0,4 t', text: 'levantadas no total.' });
    expect(reviewSlides(r)[4]!.text).toBe('foi o dia preferido para treinar, quase sempre à noite.');

    d.profile.weighIns = [{ date: '2026-01-10', weight: 70 }, { date: '2026-09-10', weight: 72.5 }];
    const withWeight = yearReview(d, 2026, new Date(2026, 11, 10));
    expect(reviewSlides(withWeight).find(s => s.id === 'peso')).toMatchObject({ big: '+2,5 kg', text: 'de 70 para 72,5 kg ao longo do ano.' });
    expect(reviewSlides(withWeight, { showWeight: false }).some(s => s.id === 'peso')).toBe(false);
  });

  it('o resumo junta os números, e as cores se alternam', () => {
    const d = sampleData();
    d.workouts = Array.from({ length: 6 }, (_, i) => at(`2026-0${i + 1}-05`, 18, 'Leg Press 45º', [[12, 100 + i * 10], [12, 100 + i * 10]]));
    d.gamification.longestStreak = 4;
    const slides = reviewSlides(yearReview(d, 2026, new Date(2026, 11, 10)));
    const resumo = slides[slides.length - 1]!;
    expect(resumo.stats).toEqual([['Treinos', '6'], ['Toneladas', '18'], ['Recordes', '5'], ['Maior sequência', '4 dias'], ['Exercício', 'Leg Press 45º']]);
    expect(new Set(slides.map(s => s.tone)).size).toBeGreaterThan(3);
  });

  it('anos com treino, do mais novo ao mais antigo', () => {
    expect(yearsWithWorkouts([workout('2024-05-01', 'X', [[1, 1]]), workout('2026-01-01', 'X', [[1, 1]]), workout('2026-02-01', 'X', [[1, 1]])])).toEqual([2026, 2024]);
  });
});
