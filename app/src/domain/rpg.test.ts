import { describe, expect, it } from 'vitest';
import { RPG_CLASS_BY_ID, RPG_CLASSES } from '../data/rpg-classes';
import { addDays } from './dates';
import type { AppData, Workout } from './model';
import {
  CLASS_CAP, DAY_XP, WEEK_XP, allocateRpgPoint, chooseRpgClass, classLevel, className, markRpgCelebrated, pendingCelebration,
  pointsForBaseLevel, rpgView, setRpgEnabled, setRpgSex, setRpgSound, setRpgTheme, stageNeed
} from './rpg';
import { achievementList, unlockAchievements } from './achievements';
import { mergeAppData } from './sync';
import { sampleData, workout } from './testing';

const NOW = new Date('2026-11-08T12:00:00');

/** Treinos em dias seguidos a partir de `start` (sem duração, sem plano: só o XP base). */
function days(start: string, count: number, make: (date: string, i: number) => Workout = d => workout(d, 'Supino', [[10, 40]])): Workout[] {
  return Array.from({ length: count }, (_, i) => make(addDays(start, i), i));
}

/** Plano de 6 dias (o de exemplo): 6 treinos na semana cumprem a meta. */
const withWorkouts = (workouts: Workout[], extra: Partial<AppData> = {}) => sampleData({ workouts, ...extra });

describe('níveis de classe', () => {
  it('Aprendiz vai até 10, 1ª e 2ª classe até 50', () => {
    expect(classLevel(0, 0)).toMatchObject({ level: 1, capped: false });
    expect(classLevel(0, stageNeed(0))).toMatchObject({ level: 10, capped: true });
    expect(classLevel(0, stageNeed(0) - 1).level).toBe(9);
    expect(classLevel(1, stageNeed(1))).toMatchObject({ level: 50, capped: true });
    expect(classLevel(2, 10 ** 9).level).toBe(CLASS_CAP[2]);
  });

  it('ritmo: Aprendiz em ~8 treinos, 1ª classe em meses', () => {
    expect(stageNeed(0) / DAY_XP).toBeLessThanOrEqual(9);
    expect(stageNeed(1) / (DAY_XP * 3 + WEEK_XP)).toBeGreaterThan(12); // > 12 semanas a 3 treinos
    expect(stageNeed(2)).toBeGreaterThan(stageNeed(1) * 2);
  });
});

describe('rpgView', () => {
  it('sem treinos: Aprendiz nível 1, nada para escolher', () => {
    const v = rpgView(sampleData(), NOW);
    expect(v.current.cls.id).toBe('aprendiz');
    expect(v.current.level.level).toBe(1);
    expect(v.options).toEqual([]);
    expect(v.nextHint).toMatch(/nível de classe 10/);
  });

  it('só um treino por dia rende XP', () => {
    const one = rpgView(withWorkouts([workout('2026-11-02', 'Supino', [[10, 40]])]), NOW);
    const two = rpgView(withWorkouts([workout('2026-11-02', 'Supino', [[10, 40]]), workout('2026-11-02', 'Remada', [[10, 40]])]), NOW);
    expect(two.current.xp).toBe(one.current.xp);
  });

  it('no máximo 6 dias por semana rendem XP', () => {
    const six = rpgView(withWorkouts(days('2026-11-02', 6)), NOW); // seg a sáb
    const seven = rpgView(withWorkouts(days('2026-11-02', 7)), NOW); // + domingo
    expect(seven.current.xp + seven.banked).toBe(six.current.xp + six.banked);
  });

  it('ao passar do teto, o XP fica guardado e libera a escolha da 1ª classe', () => {
    const v = rpgView(withWorkouts(days('2026-10-01', 20)), NOW);
    expect(v.current.level.capped).toBe(true);
    expect(v.banked).toBeGreaterThan(0);
    expect(v.options.map(o => o.cls.id).sort()).toEqual(['arqueiro', 'espadachim', 'gatuno', 'mago', 'mercador', 'novico']);
    expect(v.nextHint).toBeNull();
  });

  it('sugere a classe pela afinidade do histórico (cardio → Arqueiro primeiro)', () => {
    const cardio = (date: string): Workout => ({ id: `c-${date}`, date, source: 'app', entries: [{ key: 'esteira', name: 'Esteira', mode: 'cardio', sets: [], cardio: { minutes: 40 } }] });
    const v = rpgView(withWorkouts(days('2026-10-01', 20, cardio)), NOW);
    expect(v.options[0]!.cls.id).toBe('arqueiro');
    expect(v.options[0]!.affinity).toBe(1);
  });

  it('a classe escolhida recebe o XP guardado com a afinidade dela', () => {
    const heavy = (date: string) => workout(date, 'Agachamento', [[5, 100], [5, 100], [5, 100]]);
    const data = withWorkouts(days('2026-09-01', 40, heavy));
    const before = rpgView(data, NOW);
    const chosen = chooseRpgClass(data, 'espadachim', NOW).data;
    const after = rpgView(chosen, NOW);
    expect(after.current.cls.id).toBe('espadachim');
    expect(after.stages[0]!.level.capped).toBe(true);
    // afinidade cheia com força: rende mais que o XP guardado sem afinidade
    expect(after.current.xp).toBeGreaterThan(before.banked);
  });

  it('não escolhe classe antes da hora, nem fora da árvore', () => {
    const early = withWorkouts(days('2026-11-02', 3));
    expect(chooseRpgClass(early, 'mago', NOW).data).toBe(early);
    const ready = withWorkouts(days('2026-10-01', 20));
    expect(chooseRpgClass(ready, 'cavaleiro', NOW).data).toBe(ready);
  });

  it('missão da 1ª classe conta a partir do início da etapa', () => {
    const data = chooseRpgClass(withWorkouts(days('2026-09-01', 30)), 'mercador', NOW).data;
    const v = rpgView(data, NOW);
    expect(v.current.mission).toMatchObject({ goal: 100, unit: 't', done: false });
    // 400 kg por treino; só os treinos depois do teto do Aprendiz contam
    const counted = data.workouts.filter(w => w.date >= v.current.startedOn!).length;
    expect(v.current.mission!.progress).toBe(Math.floor((counted * 400) / 1000));
  });

  it('a 2ª classe só libera com nível 50 e missão cumprida', () => {
    const heavy = (date: string, i: number) => workout(date, 'Agachamento', [[5, 100 + i], [5, 100 + i]]);
    const data = chooseRpgClass(withWorkouts(days('2025-01-06', 400, heavy)), 'espadachim', NOW).data;
    const v = rpgView(data, NOW);
    expect(v.current.level.capped).toBe(true);
    expect(v.current.mission?.done).toBe(true);
    expect(v.options.map(o => o.cls.id).sort()).toEqual(['cavaleiro', 'templario']);
    const second = rpgView(chooseRpgClass(data, 'templario', NOW).data, NOW);
    expect(second.current.cls.id).toBe('templario');
    expect(second.stages).toHaveLength(3);
  });

  it('caminho gravado inválido para no último passo válido', () => {
    const data = withWorkouts([], { rpg: { enabled: true, theme: 'classico', path: [{ classId: 'cavaleiro', at: '' }], points: {} } });
    expect(rpgView(data, NOW).current.cls.id).toBe('aprendiz');
  });
});

describe('atributos e pontos', () => {
  it('atributos ficam entre 1 e 99 e crescem com o treino', () => {
    const none = rpgView(sampleData(), NOW).stats;
    expect(none.every(s => s.total === 1)).toBe(true);
    const lots = rpgView(withWorkouts(days('2024-01-01', 900, (d, i) => workout(d, `Ex ${i % 30}`, [[5, 100 + i], [5, 100], [5, 100]]))), NOW).stats;
    expect(lots.every(s => s.total >= 1 && s.total <= 99)).toBe(true);
    expect(lots.find(s => s.id === 'for')!.total).toBeGreaterThan(20);
  });

  it('pontos de bônus: 1 a cada 2 níveis de base, sem passar do que ganhou', () => {
    expect(pointsForBaseLevel(1)).toBe(0);
    expect(pointsForBaseLevel(5)).toBe(2);
    let data = sampleData();
    data.gamification.totalXP = 500; // nível 5
    data = allocateRpgPoint(data, 'for', 1, NOW).data;
    data = allocateRpgPoint(data, 'for', 1, NOW).data;
    const full = allocateRpgPoint(data, 'agi', 1, NOW).data;
    expect(full).toBe(data);
    const v = rpgView(data, NOW);
    expect(v.stats.find(s => s.id === 'for')).toMatchObject({ bonus: 2, total: 3 });
    expect(v.points).toEqual({ earned: 2, spent: 2, free: 0 });
    expect(rpgView(allocateRpgPoint(data, 'for', -1, NOW).data, NOW).points.free).toBe(1);
  });
});

describe('temas, ligar e comemorar', () => {
  it('todas as classes têm nome nos dois temas e nos dois sexos', () => {
    for (const c of RPG_CLASSES) for (const t of ['classico', 'maromba'] as const) {
      expect(c.names[t].m.length).toBeGreaterThan(2);
      expect(c.names[t].f.length).toBeGreaterThan(2);
    }
    expect(className(RPG_CLASS_BY_ID.espadachim!, 'maromba', 'f')).toBe('Gladiadora Marombeira');
    expect(RPG_CLASSES).toHaveLength(19);
  });

  it('trocar o tema não muda o progresso', () => {
    const data = chooseRpgClass(withWorkouts(days('2026-09-01', 30)), 'novico', NOW).data;
    const themed = setRpgTheme(data, 'maromba', NOW).data;
    const a = rpgView(data, NOW), b = rpgView(themed, NOW);
    expect(b.theme).toBe('maromba');
    expect(b.current).toEqual(a.current);
    expect(themed.sync.changed.rpg).toBe(NOW.toISOString());
  });

  it('ao ligar, o histórico não dispara a animação; um treino novo dispara', () => {
    const data = setRpgEnabled(withWorkouts(days('2026-11-01', 3)), true, NOW).data;
    expect(pendingCelebration(rpgView(data, NOW))).toBeNull();
    const more = { ...data, workouts: [...data.workouts, ...days('2026-11-04', 2)] };
    expect(pendingCelebration(rpgView(more, NOW))).toMatchObject({ kind: 'level' });
    const seen = markRpgCelebrated(more, NOW).data;
    expect(pendingCelebration(rpgView(seen, NOW))).toBeNull();
  });

  it('desligado, nunca comemora', () => {
    const data = setRpgEnabled(withWorkouts(days('2026-11-01', 3)), false, NOW).data;
    expect(pendingCelebration(rpgView({ ...data, workouts: [...data.workouts, ...days('2026-11-04', 5)] }, NOW))).toBeNull();
  });
});

describe('sincronização', () => {
  it('vence a escolha mais recente; quem não tem rpg recebe a do outro', () => {
    const base = withWorkouts(days('2026-10-01', 20));
    const a = chooseRpgClass(base, 'mago', new Date('2026-11-01T10:00:00')).data;
    const b = setRpgTheme(base, 'maromba', new Date('2026-11-02T10:00:00')).data;
    expect(mergeAppData(a, b).rpg?.theme).toBe('maromba');
    expect(mergeAppData(b, a).rpg?.path).toEqual([]);
    expect(mergeAppData(base, a).rpg?.path[0]?.classId).toBe('mago');
    expect(mergeAppData(base, base).rpg).toBeUndefined();
  });
});

describe('afinidade das 2ªs classes e ajustes', () => {
  const base = withWorkouts(days('2025-01-06', 400, (d, i) => workout(d, 'Agachamento', [[5, 100 + i], [5, 100 + i]])));
  const firstOptions = (path: string) => rpgView(chooseRpgClass(base, path, NOW).data, NOW);

  it('Monge prefere peso do corpo; Cavaleiro, recordes', () => {
    const v = firstOptions('novico');
    // treino todo dia num plano de 6: a meta da semana sai sempre, e a missão do Noviço também
    expect(v.options.map(o => o.cls.id).sort()).toEqual(['monge', 'sacerdote']);
    const espadachim = firstOptions('espadachim');
    const cav = espadachim.options.find(o => o.cls.id === 'cavaleiro')!;
    expect(cav.affinity).toBeGreaterThan(0.9);
  });

  it('Alquimista ganha afinidade com água e pesagem no dia do treino', () => {
    const list = days('2026-01-01', 150);
    const plain = withWorkouts(list);
    const healthy = withWorkouts(list);
    healthy.gamification.waterBonus = Object.fromEntries(list.map(w => [w.date, 10]));
    healthy.profile.weighIns = list.map(w => ({ date: w.date, weight: 80 }));
    // caminho gravado direto (sem checar a missão) para medir só o XP da 2ª classe
    const rpg = { enabled: true, theme: 'classico' as const, points: {}, path: [{ classId: 'mercador', at: '' }, { classId: 'alquimista', at: '' }] };
    const a = rpgView({ ...healthy, rpg }, NOW).current;
    const b = rpgView({ ...plain, rpg }, NOW).current;
    expect(a.cls.id).toBe('alquimista');
    expect(a.xp).toBeGreaterThan(b.xp);
  });

  it('o sexo escolhido no modo vence o do perfil', () => {
    const data = sampleData();
    data.profile.sex = 'masculino';
    expect(rpgView(data, NOW).sex).toBe('m');
    const f = setRpgSex(data, 'f', NOW).data;
    expect(rpgView(f, NOW).sex).toBe('f');
    expect(className(RPG_CLASS_BY_ID.novico!, 'classico', rpgView(f, NOW).sex)).toBe('Noviça');
  });

  it('som do level up liga por padrão e desliga pelo ajuste', () => {
    expect(rpgView(sampleData(), NOW).state.sound ?? true).toBe(true);
    expect(rpgView(setRpgSound(sampleData(), false, NOW).data, NOW).state.sound).toBe(false);
  });
});

describe('conquistas do modo RPG', () => {
  it('só aparecem e desbloqueiam com o modo ligado', () => {
    const ready = chooseRpgClass(withWorkouts(days('2026-10-01', 20)), 'mago', NOW).data;
    const off = { ...ready, rpg: { ...ready.rpg!, enabled: false } };
    expect(achievementList(off).some(a => a.id === 'rpg_primeira_classe')).toBe(false);
    expect(unlockAchievements(off, NOW).data.gamification.achievements.rpg_primeira_classe).toBeUndefined();
    const on = setRpgEnabled(ready, true, NOW).data;
    expect(achievementList(on).some(a => a.id === 'rpg_primeira_classe')).toBe(true);
    expect(unlockAchievements(on, NOW).data.gamification.achievements.rpg_primeira_classe).toBe('2026-11-08');
  });
});
