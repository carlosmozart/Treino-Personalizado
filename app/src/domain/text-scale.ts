// W17: tamanho do texto em passos. Quase tudo no app é medido em rem, então mudar o tamanho da
// fonte da raiz aumenta ou diminui texto, botões e espaços juntos, sem quebrar a proporção.
import type { Settings } from './model';

export const TEXT_SCALES = [
  { id: 'menor', label: 'Menor', percent: 90 },
  { id: 'padrao', label: 'Padrão', percent: 100 },
  { id: 'maior', label: 'Maior', percent: 110 },
  { id: 'grande', label: 'Bem maior', percent: 120 }
] as const;

export type TextScale = (typeof TEXT_SCALES)[number]['id'];

export const textScaleOf = (settings: Pick<Settings, 'textScale'>): TextScale =>
  TEXT_SCALES.some(t => t.id === settings.textScale) ? settings.textScale! : 'padrao';

/** Porcentagem da fonte da raiz; 100 = o tamanho que o celular já usa. */
export const textPercent = (settings: Pick<Settings, 'textScale'>): number =>
  TEXT_SCALES.find(t => t.id === textScaleOf(settings))!.percent;
