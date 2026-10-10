// Primeira abertura guiada: poucas perguntas escolhem um modelo pronto (data/plan-templates.ts).
// Função pura; a tela só mostra a escolha e cria o plano.

export type Goal = 'massa' | 'forca' | 'emagrecer' | 'saude';
export type Place = 'academia' | 'casa';
export type Level = 'iniciante' | 'intermediario' | 'avancado';
export type Schedule = 'fixo' | 'flexivel';

export interface SetupAnswers { goal: Goal; days: number; place: Place; level: Level; schedule: Schedule }

export interface SetupChoice {
  templateId: string;
  /** Dias "quando der": o plano já vem em rotação A/B/C. */
  rotation: boolean;
  /** Progressão linear (sobe a cada treino completo): iniciantes e o 5×5. */
  linear: boolean;
  /** Uma frase explicando a escolha. */
  why: string;
}

export function recommendPlan(a: SetupAnswers): SetupChoice {
  const days = Math.min(6, Math.max(2, Math.round(a.days)));
  const rotation = a.schedule === 'flexivel';
  const beginner = a.level === 'iniciante';
  const pick = (templateId: string, why: string, linear = beginner): SetupChoice => ({ templateId, rotation, linear, why });

  if (a.place === 'casa') return pick('em-casa', 'Treino com o peso do corpo, sem precisar de academia; a progressão sobe as repetições.');
  if (a.goal === 'forca' && a.level !== 'avancado' && days <= 4) {
    return pick('forca-5x5', 'Poucos exercícios básicos e pesados, com a carga subindo a cada treino completo.', true);
  }
  if (beginner || days <= 2) {
    return pick('corpo-inteiro', 'Dois treinos alternados que trabalham o corpo todo: cada músculo várias vezes por semana, ideal para começar.');
  }
  if (days === 3) return pick('abc', 'Empurrar, puxar e pernas: cada grupo com um dia só dele.');
  if (days === 4 || a.level === 'intermediario') {
    return pick('superior-inferior', 'Superior e inferior alternados: cada grupo duas vezes por semana.');
  }
  return pick('ppl', 'Empurrar, puxar e pernas duas vezes por semana, para quem já treina há tempo.');
}
