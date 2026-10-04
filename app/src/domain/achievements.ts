// Conquistas e meta de peso: progresso calculado e desbloqueio depois de cada ação.
import { ACHIEVEMENTS } from '../data/achievements';
import type { ActionResult } from './actions';
import { toDateKey, type DateKey } from './dates';
import type { AppData } from './model';
import { key, touch } from './sync';

export interface AchievementView {
  id: string;
  name: string;
  desc: string;
  target: number;
  current: number;
  /** Data do desbloqueio; null se ainda não. */
  unlockedAt: DateKey | null;
}

export function achievementList(data: AppData): AchievementView[] {
  return ACHIEVEMENTS.map(a => ({
    id: a.id, name: a.name, desc: a.desc, target: a.target,
    current: Math.min(a.target, a.current(data)), unlockedAt: data.gamification.achievements[a.id] ?? null
  }));
}

/** Desbloqueia o que foi atingido; devolve os mesmos dados quando nada muda. */
export function unlockAchievements(data: AppData, now: Date): ActionResult {
  const reached = ACHIEVEMENTS.filter(a => !data.gamification.achievements[a.id] && a.current(data) >= a.target);
  if (!reached.length) return { data, events: [] };
  const today = toDateKey(now);
  const achievements = { ...data.gamification.achievements };
  for (const a of reached) achievements[a.id] = today;
  return {
    data: { ...data, gamification: { ...data.gamification, achievements } },
    events: reached.map(a => ({ kind: 'achievement' as const, name: a.name }))
  };
}

/** Começa uma meta de peso nova a partir do peso atual. */
export function startWeightGoal(data: AppData, targetWeight: number, now: Date): ActionResult {
  const p = data.profile;
  const current = p.weighIns[p.weighIns.length - 1]?.weight ?? p.weightKg;
  if (!current || !(targetWeight > 0)) return { data, events: [] };
  const draft: AppData = {
    ...data,
    profile: { ...p, targetWeightKg: targetWeight, weightGoal: { startWeight: current, targetWeight, startedAt: toDateKey(now), checkpoints: {} } },
    sync: { changed: { ...data.sync.changed }, deleted: { ...data.sync.deleted } }
  };
  touch(draft, key.profile, now);
  return { data: draft, events: [] };
}
