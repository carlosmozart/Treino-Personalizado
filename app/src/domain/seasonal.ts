// Temas de época (Halloween e Natal, V5). Decide qual tema vale num dia e o que ele muda (cores,
// decorações no treino, calendário do advento). As decorações em si ficam em features/seasonal.
import type { DateKey } from './dates';
import type { AppData, Settings } from './model';
import { volumeOptions, workoutVolume } from './workouts';

export type SeasonalPref = 'auto' | 'on' | 'off';
export type Season = 'halloween' | 'natal';

/** Janelas do automático (mês-dia, inclusive): cada tema some sozinho no dia seguinte ao fim. */
export const SEASON_WINDOWS: Record<Season, { from: string; to: string }> = {
  halloween: { from: '10-20', to: '10-31' },
  natal: { from: '12-01', to: '12-31' }
};

/** O tema cuja janela inclui a data, ou nenhum. */
export function seasonOf(date: DateKey): Season | null {
  const md = date.slice(5);
  for (const s of Object.keys(SEASON_WINDOWS) as Season[]) {
    if (md >= SEASON_WINDOWS[s].from && md <= SEASON_WINDOWS[s].to) return s;
  }
  return null;
}

export const isHalloweenWindow = (date: DateKey) => seasonOf(date) === 'halloween';

export const seasonalPref = (settings: Pick<Settings, 'seasonalTheme'>): SeasonalPref => settings.seasonalTheme ?? 'auto';

/**
 * O tema que vale hoje. "Automático": o da janela. "Sempre": o da janela e, fora delas, o Natal de
 * novembro a janeiro e o Halloween no resto do ano. "Desligado": nenhum.
 */
export function activeSeason(settings: Pick<Settings, 'seasonalTheme'>, date: DateKey): Season | null {
  const pref = seasonalPref(settings);
  if (pref === 'off') return null;
  const inWindow = seasonOf(date);
  if (pref === 'auto' || inWindow) return inWindow;
  return ['11', '12', '01'].includes(date.slice(5, 7)) ? 'natal' : 'halloween';
}

export const halloweenOn = (settings: Pick<Settings, 'seasonalTheme'>, date: DateKey) => activeSeason(settings, date) === 'halloween';

/** Cores do tema (abóbora ou Natal) no lugar da cor de destaque e do fundo. Ausente = sim. */
export function seasonColors(settings: Pick<Settings, 'seasonalTheme' | 'seasonalColors'>, date: DateKey): Season | null {
  return settings.seasonalColors === false ? null : activeSeason(settings, date);
}
export const halloweenColors = (settings: Pick<Settings, 'seasonalTheme' | 'seasonalColors'>, date: DateKey) => seasonColors(settings, date) === 'halloween';

/** Versão calma durante o treino (um enfeite parado). Ausente = sim. */
export const seasonInWorkout = (settings: Pick<Settings, 'seasonalTheme' | 'seasonalInWorkout'>, date: DateKey) =>
  !!activeSeason(settings, date) && settings.seasonalInWorkout !== false;
export const halloweenInWorkout = (settings: Pick<Settings, 'seasonalTheme' | 'seasonalInWorkout'>, date: DateKey) =>
  halloweenOn(settings, date) && settings.seasonalInWorkout !== false;

/** A surpresa escondida no Início (abóbora, presente) sai uma vez por dia. */
export const pumpkinAvailable = (lastFound: string | null | undefined, today: DateKey) => lastFound !== today;
export const giftAvailable = pumpkinAvailable;

/** O que aparece quando a abóbora é achada. */
export const PUMPKIN_LINES = [
  'Doce ou treino? Os dois!',
  'Achou! Hoje o agachamento vem com abóbora.',
  'Gostosuras liberadas depois da última série.',
  'Nem bruxa pula o dia de perna.',
  'Abóbora achada: a sequência agradece.',
  'Bu! Assustou mais que o supino de segunda?'
] as const;

/** O que aparece quando o presente escondido é achado. */
export const GIFT_LINES = [
  'Ho ho ho! Achou o presente.',
  'Presente aberto: dentro, energia para mais uma série.',
  'Achou! Hoje vale um treino caprichado.',
  'Presente do dia: dois minutos de descanso sem culpa na série pesada.',
  'O Papai Noel deixou um recado: não pule o dia de perna.'
] as const;

/** O que o gatinho de bruxa diz ao ser tocado. */
export const CAT_LINES = ['Miau!', 'Miau? Bora treinar.', 'Prrr…', 'Miau! Cadê meu chapéu?', 'Miau, só mais uma série.'] as const;
/** O gatinho de gorro, no Natal. */
export const XMAS_CAT_LINES = ['Miau! Feliz Natal!', 'Ho ho miau!', 'Prrr… cadê meu presente?', 'Miau! Esse gorro coça.', 'Miau, só mais uma série antes da ceia.'] as const;

/** Escolhe uma frase pelo número (o componente passa um aleatório; o teste, um fixo). */
export const pickLine = <T extends readonly string[]>(lines: T, n: number): T[number] =>
  lines[Math.abs(Math.floor(n)) % lines.length]!;

// ---------------------------------------------------------------- calendário do advento

/** Dia do calendário do advento (1 a 24 de dezembro), ou null fora dele. */
export function adventDay(date: DateKey): number | null {
  if (date.slice(5, 7) !== '12') return null;
  const d = Number(date.slice(8, 10));
  return d >= 1 && d <= 24 ? d : null;
}

/** Porta pode abrir: hoje ou um dia que já passou (as do futuro ficam fechadas). */
export const canOpenDoor = (door: number, today: DateKey) => {
  const d = adventDay(today);
  return d !== null && door >= 1 && door <= d;
};

export type DoorKind = 'Dica' | 'Curiosidade' | 'Desafio' | 'Piada' | 'Alongamento' | 'Seu ano' | 'Especial';
export interface AdventDoor { kind: DoorKind; text: string }

/** Números do ano para as portas "Seu ano": treinos, toneladas e a maior sequência. */
export interface YearNumbers { year: number; workouts: number; tons: number; longestStreak: number }

export function yearNumbers(data: Pick<AppData, 'workouts' | 'gamification'> & Partial<Pick<AppData, 'settings' | 'profile'>>, year: number): YearNumbers {
  const inYear = data.workouts.filter(w => w.date.startsWith(`${year}-`));
  const opts = volumeOptions(data);
  const kg = inYear.reduce((n, w) => n + workoutVolume(w, opts), 0);
  return { year, workouts: inYear.length, tons: Math.round(kg / 100) / 10, longestStreak: data.gamification.longestStreak };
}

const tonsText = (t: number) => `${String(t).replace('.', ',')} ${t === 1 ? 'tonelada' : 'toneladas'}`;
// uma rena adulta pesa por volta de 150 kg
const reindeer = (t: number) => Math.max(1, Math.round((t * 1000) / 150));

/** As 24 portas. As de "Seu ano" usam os números do próprio histórico. */
export function adventDoors(n: YearNumbers): AdventDoor[] {
  const workouts = n.workouts === 1 ? '1 treino' : `${n.workouts} treinos`;
  return [
    { kind: 'Curiosidade', text: 'Dezembro é o mês em que as academias ficam mais vazias, e janeiro, o mais cheio. Quem treina agora chega em janeiro na frente.' },
    { kind: 'Dica', text: 'Festa à vista? Um copo de água antes de cada prato ajuda a não exagerar e a acordar melhor no dia seguinte.' },
    { kind: 'Desafio', text: 'Hoje: 15 agachamentos sem peso cada vez que levantar do sofá. Três rodadas já valem.' },
    { kind: 'Piada', text: 'Por que o Papai Noel não treina costas? Porque quem puxa o trenó são as renas. 🦌' },
    { kind: 'Alongamento', text: 'Peitoral na porta: antebraço apoiado no batente, gire o corpo devagar para o outro lado. 30 segundos de cada lado.' },
    {
      kind: 'Seu ano',
      text: n.workouts ? `Você já fez ${workouts} em ${n.year}. Cada um deles conta.` : `Ainda dá tempo de começar ${n.year} com o pé direito: que tal o primeiro treino hoje?`
    },
    { kind: 'Dica', text: 'Viajando? Vinte minutos de flexão, agachamento e prancha seguram o ritmo até você voltar para a academia.' },
    { kind: 'Curiosidade', text: 'Faltar um treino não muda nada; o que pesa é faltar dois seguidos. Se faltou ontem, o de hoje vale ouro.' },
    { kind: 'Desafio', text: 'Prancha: junte 2 minutos ao longo do dia, em quantas partes quiser.' },
    { kind: 'Piada', text: 'Me pediram para cortar os doces. Cortei em pedaços menores. 🍫' },
    { kind: 'Dica', text: 'Sono também é treino: dormir bem recupera o músculo mais do que qualquer suplemento.' },
    {
      kind: 'Seu ano',
      text: n.tons ? `Em ${n.year} você levantou ${tonsText(n.tons)}. É o peso de umas ${reindeer(n.tons)} renas. 🦌` : 'As renas estão esperando você registrar a primeira carga do ano. 🦌'
    },
    { kind: 'Alongamento', text: 'Quadril travado de tanto ficar sentado? Afundo parado, joelho de trás no chão, empurrando o quadril para a frente. 30 segundos de cada lado.' },
    { kind: 'Desafio', text: 'Hoje é dia de escada: troque o elevador por ela todas as vezes.' },
    { kind: 'Curiosidade', text: 'Uma caminhada leve de 15 minutos depois de uma refeição grande ajuda na digestão.' },
    { kind: 'Dica', text: 'Antes de subir a carga, capriche na execução: a mesma carga num movimento mais controlado já é progresso.' },
    { kind: 'Piada', text: 'Qual é o exercício preferido do boneco de neve? Agachamento… até derreter. ⛄' },
    {
      kind: 'Seu ano',
      text: n.longestStreak ? `Sua maior sequência até hoje: ${n.longestStreak} ${n.longestStreak === 1 ? 'dia' : 'dias'}. Bora bater esse número em ${n.year + 1}?` : `A sua primeira sequência pode começar hoje. ${n.year + 1} agradece.`
    },
    { kind: 'Alongamento', text: 'Posterior de coxa: calcanhar num degrau baixo, perna esticada, incline o tronco com as costas retas. 30 segundos de cada lado.' },
    { kind: 'Desafio', text: 'Dez flexões hoje (vale com os joelhos no chão). Amanhã, onze?' },
    { kind: 'Curiosidade', text: 'Por volta de 21 de dezembro começa o verão: são os dias mais longos do ano no Brasil, com mais luz para treinar ao ar livre.' },
    { kind: 'Dica', text: 'Monte agora o plano de janeiro: quem chega na academia com o treino pronto não desiste na segunda semana.' },
    { kind: 'Piada', text: 'As renas fazem cardio o ano inteiro para uma única noite de trabalho. Respeito. 🛷' },
    {
      kind: 'Especial',
      text: `Feliz Natal! 🎄 Obrigado por treinar com a gente${n.workouts ? `: foram ${workouts} em ${n.year}` : ' este ano'}. Aproveite a ceia sem culpa, porque o treino continua depois.`
    }
  ];
}
