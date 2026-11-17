// Treino em andamento. Funções puras: recebem a sessão e devolvem outra, sem tocar no original.
// O que vira histórico ao finalizar são só as séries marcadas (regra do O1).
// Dividido em 16/11/2026 (X13): tipos, começo, edição, andamento e fim. Quem usa continua importando daqui.
export * from './session-types';
export * from './session-flow';
export * from './session-start';
export * from './session-edit';
export * from './session-finish';
