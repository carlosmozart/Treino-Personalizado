// Temas de época: por enquanto só o Halloween. Decide se o tema está ligado num dia e o que ele
// muda (cores, decorações no treino). As decorações em si ficam em features/seasonal.
import type { DateKey } from './dates';
import type { Settings } from './model';

export type SeasonalPref = 'auto' | 'on' | 'off';

/** Janela do Halloween no automático: de 20 a 31 de outubro, e some sozinho em 1º de novembro. */
export const HALLOWEEN_FROM = '10-20';
export const HALLOWEEN_TO = '10-31';

export const isHalloweenWindow = (date: DateKey) => {
  const md = date.slice(5);
  return md >= HALLOWEEN_FROM && md <= HALLOWEEN_TO;
};

export const seasonalPref = (settings: Pick<Settings, 'seasonalTheme'>): SeasonalPref => settings.seasonalTheme ?? 'auto';

/** O tema está valendo hoje: "Sempre" o ano todo, "Automático" só na janela. */
export function halloweenOn(settings: Pick<Settings, 'seasonalTheme'>, date: DateKey): boolean {
  const pref = seasonalPref(settings);
  return pref === 'on' || (pref === 'auto' && isHalloweenWindow(date));
}

/** Cores de abóbora: no lugar da cor de destaque e do fundo enquanto o tema vale. Ausente = sim. */
export const halloweenColors = (settings: Pick<Settings, 'seasonalTheme' | 'seasonalColors'>, date: DateKey) =>
  halloweenOn(settings, date) && settings.seasonalColors !== false;

/** Versão calma durante o treino (teia e abóbora paradas). Ausente = sim. */
export const halloweenInWorkout = (settings: Pick<Settings, 'seasonalTheme' | 'seasonalInWorkout'>, date: DateKey) =>
  halloweenOn(settings, date) && settings.seasonalInWorkout !== false;

/** A abóbora escondida no Início dá a surpresa uma vez por dia. */
export const pumpkinAvailable = (lastFound: string | null | undefined, today: DateKey) => lastFound !== today;

/** O que aparece quando a abóbora é achada. */
export const PUMPKIN_LINES = [
  'Doce ou treino? Os dois!',
  'Achou! Hoje o agachamento vem com abóbora.',
  'Gostosuras liberadas depois da última série.',
  'Nem bruxa pula o dia de perna.',
  'Abóbora achada: a sequência agradece.',
  'Bu! Assustou mais que o supino de segunda?'
] as const;

/** O que o gatinho de bruxa diz ao ser tocado. */
export const CAT_LINES = ['Miau!', 'Miau? Bora treinar.', 'Prrr…', 'Miau! Cadê meu chapéu?', 'Miau, só mais uma série.'] as const;

/** Escolhe uma frase pelo número (o componente passa um aleatório; o teste, um fixo). */
export const pickLine = <T extends readonly string[]>(lines: T, n: number): T[number] =>
  lines[Math.abs(Math.floor(n)) % lines.length]!;
