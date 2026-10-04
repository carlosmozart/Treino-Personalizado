// Catálogo de conquistas (o mesmo do app antigo, data/achievements.js; ids preservados).
import { levelInfo } from '../domain/gamification';
import type { AppData } from '../domain/model';
import { workoutVolume } from '../domain/workouts';

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  target: number;
  current: (data: AppData) => number;
}

const checkins = (d: AppData) => Object.keys(d.checkins).length;
const longest = (d: AppData) => d.gamification.longestStreak;
const level = (d: AppData) => levelInfo(d.gamification.totalXP).level;
const water = (d: AppData) => Object.keys(d.gamification.waterBonus).length;
const volume = (d: AppData) => d.workouts.reduce((n, w) => n + workoutVolume(w), 0);
const flag = (b: boolean) => (b ? 1 : 0);

export const ACHIEVEMENTS: readonly Achievement[] = [
  { id: 'primeiro_checkin', name: 'Primeiro Passo', desc: 'Complete seu primeiro check-in.', target: 1, current: checkins },
  { id: 'checkins_10', name: 'Ganhando Ritmo', desc: 'Complete 10 check-ins no total.', target: 10, current: checkins },
  { id: 'checkins_30', name: 'A Vontade do Fogo', desc: 'Alcance 30 check-ins no total.', target: 30, current: checkins },
  { id: 'checkins_50', name: '50 Treinos', desc: 'Complete 50 check-ins no total.', target: 50, current: checkins },
  { id: 'checkins_100', name: 'Centurião', desc: 'Complete 100 check-ins no total.', target: 100, current: checkins },
  { id: 'streak_7', name: 'Uma Semana de Foco', desc: '7 treinos seguidos sem falhar (descanso não conta).', target: 7, current: longest },
  { id: 'streak_14', name: 'Chama Acesa', desc: '14 treinos seguidos sem falhar (descanso não conta).', target: 14, current: longest },
  { id: 'streak_30', name: 'Inabalável', desc: '30 treinos seguidos sem falhar (descanso não conta).', target: 30, current: longest },
  { id: 'streak_100', name: 'One For All: 100%', desc: '100 treinos seguidos sem falhar (descanso não conta).', target: 100, current: longest },
  { id: 'xp_8000', name: 'É de mais de 8000!', desc: 'Acumule 8.000 XP.', target: 8000, current: d => d.gamification.totalXP },
  { id: 'level_10', name: 'Posso Fazer Isso o Dia Todo', desc: 'Alcance o nível 10.', target: 10, current: level },
  { id: 'level_25', name: 'Vá Além... Plus Ultra!', desc: 'Alcance o nível 25.', target: 25, current: level },
  { id: 'level_50', name: 'Bankai!', desc: 'Alcance o nível 50.', target: 50, current: level },
  { id: 'level_90', name: 'Kurohitsugi', desc: 'Alcance o nível 90.', target: 90, current: level },
  { id: 'level_100', name: 'Uma Repetição Para Todos Governar', desc: 'Alcance o nível máximo: 100.', target: 100, current: level },
  { id: 'water_hidratado', name: 'Hidratado(a)', desc: 'Bata a meta de água pela primeira vez.', target: 1, current: water },
  { id: 'water_30', name: 'Hábito Líquido', desc: 'Bata a meta de água em 30 dias (não precisam ser seguidos).', target: 30, current: water },
  { id: 'perfis_2', name: 'Com Grandes Poderes...', desc: 'Ative um segundo plano de treino.', target: 2, current: d => Object.keys(d.gamification.activatedPlans).length },
  { id: 'peso_5x', name: 'Compromisso de Peso', desc: 'Registre seu peso 5 vezes.', target: 5, current: d => d.profile.weighIns.length },
  { id: 'refeicao_livre', name: 'Refeição Conquistada', desc: 'Desbloqueie sua primeira refeição livre.', target: 1, current: d => Object.keys(d.gamification.freeMealRewards).length },
  { id: 'aniversario', name: 'Mais um Ano de Treino', desc: 'Faça aniversário usando o app.', target: 1, current: d => Object.keys(d.gamification.birthdayGreeted).length },
  { id: 'star_wars_day', name: 'Que a Força Esteja Com Você', desc: 'Faça check-in no dia 4 de maio.', target: 1, current: d => flag(Object.keys(d.checkins).some(k => k.slice(5) === '05-04')) },
  { id: 'night_checkin', name: 'Eu Sou a Noite', desc: 'Faça check-in entre 21h e 7h.', target: 1, current: d => flag(Object.keys(d.gamification.nightCheckins).length > 0) },
  { id: 'rock_lee_weights', name: 'Os Pesos de Rock Lee', desc: 'Aumente a carga de um exercício em 10 kg ou mais de uma vez.', target: 1, current: d => flag(d.gamification.bigWeightJump) },
  { id: 'volume_10k', name: 'Kaioken', desc: 'Acumule 10.000 kg de volume levantado.', target: 10_000, current: volume },
  { id: 'volume_30k', name: 'Kaioken x3', desc: 'Acumule 30.000 kg de volume levantado.', target: 30_000, current: volume },
  { id: 'volume_100k', name: 'Kaioken x10', desc: 'Acumule 100.000 kg de volume levantado.', target: 100_000, current: volume },
  { id: 'volume_1m', name: 'Super Saiyajin', desc: 'Acumule 1.000.000 kg de volume levantado.', target: 1_000_000, current: volume }
];
