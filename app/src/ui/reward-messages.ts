// Texto dos avisos de recompensa. Um evento de XP comum não vira aviso sozinho: ele aparece
// junto do evento que o causou (recorde, nível, bônus) ou no resumo do treino.
import type { RewardEvent } from '../domain/rewards';
import { formatNumber } from './format';

export interface Toast {
  text: string;
  tone: 'trophy' | 'info';
}

export function rewardToast(event: RewardEvent): Toast | null {
  switch (event.kind) {
    case 'level-up': return { text: `Nível ${event.level} alcançado!`, tone: 'trophy' };
    case 'streak-bonus': return { text: `Sequência de ${event.streak} treinos! +${event.xp} XP de bônus`, tone: 'trophy' };
    case 'free-meal': return { text: 'Refeição livre liberada! Você bateu 80% do treino da semana.', tone: 'trophy' };
    case 'water-goal': return { text: `Meta de água batida! +${event.xp} XP`, tone: 'trophy' };
    case 'birthday': return { text: `Feliz aniversário${event.name ? `, ${event.name}` : ''}! Que o novo ano venha com mais força e saúde.`, tone: 'trophy' };
    case 'record': {
      const set = `${formatNumber(event.weight)} kg × ${event.reps}`;
      if (event.records.includes('e1rm') && event.e1rm) return { text: `Recorde em ${event.name}: 1RM estimado ${formatNumber(event.e1rm)} kg (${set})`, tone: 'trophy' };
      if (event.records.includes('weight')) return { text: `Recorde de carga em ${event.name}: ${set}`, tone: 'trophy' };
      return { text: `Recorde de volume em ${event.name}`, tone: 'trophy' };
    }
    case 'xp':
      return event.reason === 'checkin-half' ? { text: `Check-in feito: +${event.amount} XP (meio, treino incompleto)`, tone: 'info' }
        : event.reason === 'checkin-full' || event.reason === 'checkin-upgrade' ? { text: `Check-in feito: +${event.amount} XP`, tone: 'info' }
        : null;
    case 'achievement': return { text: `Conquista desbloqueada: ${event.name}`, tone: 'trophy' };
    case 'xp-removed': return { text: `Check-in desfeito: −${event.amount} XP`, tone: 'info' };
  }
}
