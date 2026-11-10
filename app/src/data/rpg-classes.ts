// Modo RPG: árvore de classes (Aprendiz → 6 primeiras → 12 segundas) com dois temas de nomes.
// As regras são as mesmas nos dois temas: trocar de tema nunca muda o progresso.
// Inspiração de estrutura em RPGs de classes; nenhum nome próprio, arte ou som de jogo existente.

export type RpgTheme = 'classico' | 'maromba';
export type StatId = 'for' | 'agi' | 'vit' | 'int' | 'des' | 'sor';
/** Caminho de treino que cada 1ª classe representa (e que as 2ªs herdam). */
export type PathId = 'forca' | 'cardio' | 'intensidade' | 'constancia' | 'metodo' | 'volume';
export type ClassTier = 0 | 1 | 2;

export interface ClassName { m: string; f: string }

export interface RpgClass {
  id: string;
  tier: ClassTier;
  /** Classe de origem (só nas 2ªs). */
  parent?: string;
  /** Ausente no Aprendiz, que não tem afinidade. */
  path?: PathId;
  /** Atributos que a classe destaca (só para mostrar). */
  stats: StatId[];
  names: Record<RpgTheme, ClassName>;
  /** O que a classe representa na academia. */
  about: string;
}

const n = (m: string, f = m): ClassName => ({ m, f });

export const RPG_CLASSES: readonly RpgClass[] = [
  { id: 'aprendiz', tier: 0, stats: [], about: 'Todo mundo começa aqui: os primeiros treinos, aprender o app e criar o hábito.',
    names: { classico: n('Aprendiz'), maromba: n('Frango') } },

  { id: 'espadachim', tier: 1, path: 'forca', stats: ['for'], about: 'Força: básicos pesados, poucas repetições e recordes de carga.',
    names: { classico: n('Espadachim'), maromba: n('Gladiador Marombeiro', 'Gladiadora Marombeira') } },
  { id: 'arqueiro', tier: 1, path: 'cardio', stats: ['agi'], about: 'Resistência: cardio, minutos e distância.',
    names: { classico: n('Arqueiro', 'Arqueira'), maromba: n('Maratonista da Esteira') } },
  { id: 'gatuno', tier: 1, path: 'intensidade', stats: ['agi', 'des'], about: 'Intensidade: treinos curtos e densos, com pouco descanso.',
    names: { classico: n('Gatuno', 'Gatuna'), maromba: n('Ninja do HIIT') } },
  { id: 'novico', tier: 1, path: 'constancia', stats: ['vit'], about: 'Constância: cumprir a meta da semana, semana após semana, respeitando o descanso.',
    names: { classico: n('Noviço', 'Noviça'), maromba: n('Rato de Academia') } },
  { id: 'mago', tier: 1, path: 'metodo', stats: ['int'], about: 'Método: seguir o plano, registrar tudo e subir a carga com cabeça.',
    names: { classico: n('Mago', 'Maga'), maromba: n('Mestre da Planilha', 'Mestra da Planilha') } },
  { id: 'mercador', tier: 1, path: 'volume', stats: ['des', 'for'], about: 'Volume: a tonelagem total levantada.',
    names: { classico: n('Mercador', 'Mercadora'), maromba: n('Carregador de Ferro', 'Carregadora de Ferro') } },

  { id: 'cavaleiro', tier: 2, parent: 'espadachim', path: 'forca', stats: ['for'], about: 'Recordes de força máxima.',
    names: { classico: n('Cavaleiro', 'Cavaleira'), maromba: n('Monstro da Carga') } },
  { id: 'templario', tier: 2, parent: 'espadachim', path: 'forca', stats: ['for', 'vit'], about: 'Força com constância.',
    names: { classico: n('Templário', 'Templária'), maromba: n('Marombeiro Raiz', 'Marombeira Raiz') } },
  { id: 'cacador', tier: 2, parent: 'arqueiro', path: 'cardio', stats: ['agi'], about: 'Volume de cardio.',
    names: { classico: n('Caçador', 'Caçadora'), maromba: n('Ultramaratonista') } },
  { id: 'menestrel', tier: 2, parent: 'arqueiro', path: 'cardio', stats: ['agi', 'sor'], about: 'Cardio variado: aula, dança, bike, corrida.',
    names: { classico: n('Menestrel'), maromba: n('Lenda do Aulão') } },
  { id: 'assassino', tier: 2, parent: 'gatuno', path: 'intensidade', stats: ['agi'], about: 'Densidade: muito trabalho em pouco tempo.',
    names: { classico: n('Assassino', 'Assassina'), maromba: n('Máquina de Bi-set') } },
  { id: 'arruaceiro', tier: 2, parent: 'gatuno', path: 'intensidade', stats: ['des'], about: 'Variedade de exercícios.',
    names: { classico: n('Arruaceiro', 'Arruaceira'), maromba: n('Inventor de Exercício', 'Inventora de Exercício') } },
  { id: 'sacerdote', tier: 2, parent: 'novico', path: 'constancia', stats: ['vit'], about: 'Sequência longa e recuperação.',
    names: { classico: n('Sacerdote', 'Sacerdotisa'), maromba: n('Morador da Academia', 'Moradora da Academia') } },
  { id: 'monge', tier: 2, parent: 'novico', path: 'constancia', stats: ['vit', 'for'], about: 'Peso do corpo e calistenia.',
    names: { classico: n('Monge', 'Monja'), maromba: n('Mestre da Barra Fixa', 'Mestra da Barra Fixa') } },
  { id: 'bruxo', tier: 2, parent: 'mago', path: 'metodo', stats: ['int'], about: 'Progressão de carga bem feita.',
    names: { classico: n('Bruxo', 'Bruxa'), maromba: n('Mestre da Progressão', 'Mestra da Progressão') } },
  { id: 'sabio', tier: 2, parent: 'mago', path: 'metodo', stats: ['int', 'des'], about: 'Planejamento e periodização.',
    names: { classico: n('Sábio', 'Sábia'), maromba: n('Personal de Si Mesmo', 'Personal de Si Mesma') } },
  { id: 'ferreiro', tier: 2, parent: 'mercador', path: 'volume', stats: ['des', 'for'], about: 'Tonelagem: volume acima de tudo.',
    names: { classico: n('Ferreiro', 'Ferreira'), maromba: n('Empilhador de Anilha', 'Empilhadora de Anilha') } },
  { id: 'alquimista', tier: 2, parent: 'mercador', path: 'volume', stats: ['int', 'vit'], about: 'Corpo e nutrição: água, peso e meta corporal.',
    names: { classico: n('Alquimista'), maromba: n('Mestre da Marmita', 'Mestra da Marmita') } }
];

export const RPG_CLASS_BY_ID: Readonly<Record<string, RpgClass>> = Object.fromEntries(RPG_CLASSES.map(c => [c.id, c]));

export const FIRST_CLASSES = RPG_CLASSES.filter(c => c.tier === 1);
export const secondClassesOf = (parentId: string) => RPG_CLASSES.filter(c => c.parent === parentId);

export const THEME_LABEL: Record<RpgTheme, string> = { classico: 'Clássico', maromba: 'Maromba' };
export const THEME_ABOUT: Record<RpgTheme, string> = {
  classico: 'Classes de RPG: Espadachim, Arqueiro, Mago…',
  maromba: 'Classes da academia: Gladiador Marombeiro, Rato de Academia, Ninja do HIIT…'
};

export const STATS: readonly { id: StatId; short: string; name: string; about: string }[] = [
  { id: 'for', short: 'FOR', name: 'Força', about: 'Séries pesadas (até 8 repetições com carga) e recordes de 1RM.' },
  { id: 'agi', short: 'AGI', name: 'Agilidade', about: 'Minutos de cardio e treinos curtos e densos.' },
  { id: 'vit', short: 'VIT', name: 'Vitalidade', about: 'Semanas com a meta cumprida e a maior sequência.' },
  { id: 'int', short: 'INT', name: 'Inteligência', about: 'Treinos do plano e cargas que subiram.' },
  { id: 'des', short: 'DES', name: 'Destreza', about: 'Exercícios diferentes e séries completas.' },
  { id: 'sor', short: 'SOR', name: 'Sorte', about: 'Conquistas desbloqueadas.' }
];
