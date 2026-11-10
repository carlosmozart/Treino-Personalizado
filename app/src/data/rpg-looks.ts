// Modo RPG (R2): aparência do personagem e a roupa de cada classe.
// As peças são as do retrato em camadas do openworld (arte CC0, public/rpg/retrato/); as cores com
// nome e os padrões de cada peça vêm da tabela de visuais dele (content/src/looks.ts, MIT,
// Copyright (c) 2026 The OpenWorld authors).
import type { RpgSex } from '../domain/rpg';

export type LookSlot = 'outfit' | 'armour' | 'cloak' | 'hat' | 'legs' | 'shoes';

/** Escolhas do criador de personagem (ids das listas abaixo). */
export interface RpgLook {
  skin: string;
  hair: string;
  hairColor: string;
  eyes: string;
  face: string;
  /** Só no corpo masculino; ausente = sem barba. */
  beard?: string | undefined;
  glasses?: boolean | undefined;
  /** Sardas ou cicatriz; ausente = nada. */
  mark?: string | undefined;
}

export interface Swatch { id: string; label: string; hex: string }
export interface Choice { id: string; label: string; sexes?: RpgSex[] }

export const SKIN_TONES: readonly Swatch[] = [
  { id: 'porcelain', label: 'Porcelana', hex: '#f7e4d8' },
  { id: 'fair', label: 'Clara', hex: '#f2d3be' },
  { id: 'light', label: 'Clara rosada', hex: '#e8bf9f' },
  { id: 'warm', label: 'Morena clara', hex: '#d9a47f' },
  { id: 'tan', label: 'Morena', hex: '#bf855f' },
  { id: 'brown', label: 'Parda', hex: '#93603f' },
  { id: 'deep', label: 'Negra', hex: '#6b4430' }
];

export const HAIR_COLORS: readonly Swatch[] = [
  { id: 'black', label: 'Preto', hex: '#2a2830' },
  { id: 'raven', label: 'Preto-azulado', hex: '#232842' },
  { id: 'umber', label: 'Castanho-escuro', hex: '#4a3226' },
  { id: 'chestnut', label: 'Castanho', hex: '#7a4a2e' },
  { id: 'auburn', label: 'Ruivo-escuro', hex: '#8c3a28' },
  { id: 'copper', label: 'Ruivo', hex: '#b8602e' },
  { id: 'honey', label: 'Mel', hex: '#c79348' },
  { id: 'gold', label: 'Loiro', hex: '#e2c070' },
  { id: 'ash', label: 'Loiro-acinzentado', hex: '#c4b99c' },
  { id: 'silver', label: 'Grisalho', hex: '#c8cbd6' },
  { id: 'snow', label: 'Branco', hex: '#ebe8e2' },
  { id: 'lilac', label: 'Lilás', hex: '#a28ac4' },
  { id: 'rose', label: 'Rosa', hex: '#c97b8c' }
];

export const EYE_COLORS: readonly Swatch[] = [
  { id: 'bark', label: 'Castanhos', hex: '#6b4129' },
  { id: 'hazel', label: 'Mel', hex: '#7b6a34' },
  { id: 'amber', label: 'Âmbar', hex: '#b9772a' },
  { id: 'leaf', label: 'Verdes', hex: '#4f8a4f' },
  { id: 'sky', label: 'Azuis', hex: '#4a74b0' },
  { id: 'storm', label: 'Cinzentos', hex: '#6f7a88' },
  { id: 'violet', label: 'Violeta', hex: '#7c5aa6' },
  { id: 'ember', label: 'Vermelhos', hex: '#b03a32' }
];

export const HAIR_STYLES: readonly Choice[] = [
  { id: 'hair.short', label: 'Curto' },
  { id: 'hair.cropped', label: 'Raspado' },
  { id: 'hair.swept', label: 'De lado' },
  { id: 'hair.messy', label: 'Bagunçado' },
  { id: 'hair.wavy', label: 'Ondulado' },
  { id: 'hair.bob', label: 'Chanel' },
  { id: 'hair.long', label: 'Longo' },
  { id: 'hair.ponytail', label: 'Rabo de cavalo' },
  { id: 'hair.tied', label: 'Preso' },
  { id: 'hair.braid', label: 'Trança' },
  { id: 'hair.bun', label: 'Coque' },
  { id: 'hair.thin', label: 'Ralo', sexes: ['m'] }
];

export const FACES: readonly Choice[] = [
  { id: 'face.soft', label: 'Suave' },
  { id: 'face.bright', label: 'Alegre' },
  { id: 'face.keen', label: 'Atento' },
  { id: 'face.stern', label: 'Sério' },
  { id: 'face.weary', label: 'Cansado' }
];

export const BEARDS: readonly Choice[] = [
  { id: 'beard.stubble', label: 'Por fazer' },
  { id: 'beard.moustache', label: 'Bigode' },
  { id: 'beard.full', label: 'Cheia' }
];

export const MARKS: readonly Choice[] = [
  { id: 'mark.freckles', label: 'Sardas' },
  { id: 'mark.scar', label: 'Cicatriz' }
];

export const GLASSES_PART = 'glasses.round';

export function defaultLook(sex: RpgSex): RpgLook {
  return sex === 'f'
    ? { skin: 'light', hair: 'hair.long', hairColor: 'chestnut', eyes: 'hazel', face: 'face.soft' }
    : { skin: 'light', hair: 'hair.short', hairColor: 'umber', eyes: 'bark', face: 'face.keen' };
}

/** Cores com nome do openworld usadas como padrão das peças (zonas que a classe não define). */
const NAMED: Readonly<Record<string, string>> = {
  linen: '#d9cfb6', undyed: '#b5a585', leather: '#7a5132', darkleather: '#47301f', umber: '#4a3226', iron: '#878d97',
  steel: '#aab1bc', gold: '#e2c070', ivory: '#ece6d6', madder: '#a23a3a', bronze: '#a6733a', charcoal: '#393940',
  slate: '#5a6370', black: '#2a2830', ochre: '#c0993c', russet: '#94492c', moss: '#66784a', woad: '#4a6290',
  indigo: '#323f5e', forest: '#3f5a3a', plum: '#6a3f5e', teal: '#3d7472', rose: '#c97b8c'
};

/** Padrões de cor de cada peça, pela zona (openworld, content/src/looks.ts). */
const PART_DEFAULTS: Readonly<Record<string, Record<number, string>>> = {
  'hat.straw': { 1: 'ochre' }, 'hat.kerchief': { 1: 'russet' }, 'hat.hood': { 1: 'charcoal' }, 'hat.helm': { 1: 'iron' },
  'hat.cap': { 1: 'umber', 2: 'darkleather' }, 'hat.circlet': { 1: 'gold' }, 'glasses.round': { 1: 'bronze' },
  'armour.plate': { 1: 'iron' }, 'cloak.cloak': { 1: 'undyed' }, 'cloak.pauldrons': { 1: 'iron' },
  'outfit.dress': { 1: 'woad', 2: 'linen' }, 'outfit.workdress': { 1: 'moss', 2: 'linen', 3: 'leather' },
  'outfit.shawl': { 1: 'plum', 2: 'undyed' }, 'outfit.oilcloth': { 1: 'ochre', 2: 'umber' },
  'outfit.robe': { 1: 'forest', 2: 'linen', 3: 'leather' }, 'outfit.coat': { 1: 'indigo', 2: 'ivory', 3: 'bronze' },
  'outfit.vestment': { 1: 'ivory', 2: 'madder', 3: 'gold' }, 'outfit.tunic': { 1: 'moss', 2: 'umber', 3: 'leather' },
  'outfit.workshirt': { 1: 'linen', 2: 'umber', 3: 'leather' }, 'outfit.apron': { 1: 'darkleather', 2: 'linen', 3: 'umber' },
  'outfit.travel': { 1: 'russet', 2: 'linen', 3: 'leather' }, 'outfit.gambeson': { 1: 'madder', 2: 'undyed', 3: 'iron' },
  'outfit.plate': { 1: 'ivory', 2: 'gold', 3: 'steel' }, 'outfit.gi': { 1: 'undyed', 2: 'umber' },
  'outfit.cloak': { 1: 'charcoal', 2: 'slate', 3: 'leather' }, 'outfit.adventurer': { 1: 'teal', 2: 'linen', 3: 'leather' },
  'legs.stockings': { 1: 'charcoal' }, 'legs.hose': { 1: 'undyed' }, 'legs.wraps': { 1: 'linen' },
  'shoes.boots': { 1: 'leather', 2: 'umber' }, 'shoes.shoes': { 1: 'darkleather' }, 'shoes.buckled': { 1: 'black', 3: 'iron' },
  'shoes.tall': { 1: 'darkleather' }, 'shoes.sandals': { 1: 'leather' }
};
/** Zona sem padrão: tecido cru na 2ª, couro na 3ª. */
const ZONE_FALLBACK: Readonly<Record<number, string>> = { 1: 'undyed', 2: 'linen', 3: 'leather' };

/** Cor de uma zona de uma peça: a da classe, senão o padrão da peça. */
export function partColor(partId: string, zone: number, own?: string): string {
  return own ?? NAMED[PART_DEFAULTS[partId]?.[zone] ?? ZONE_FALLBACK[zone] ?? 'undyed'] ?? '#b5a585';
}

export interface Costume {
  parts: Partial<Record<LookSlot, string>>;
  /** Cores por "slot.zona" (ex.: 'outfit.1'); o resto vem do padrão da peça. */
  colors?: Record<string, string>;
}

type Pair = Record<RpgSex, Costume>;
const both = (c: Costume): Pair => ({ m: c, f: c });

/** Roupa de cada classe, por sexo (o corpo feminino não tem gi, gibão nem placas inteiras; o masculino, vestido). */
export const COSTUMES: Readonly<Record<string, Pair>> = {
  aprendiz: {
    m: { parts: { outfit: 'outfit.tunic', legs: 'legs.hose', shoes: 'shoes.shoes' }, colors: { 'outfit.1': '#8a6a45' } },
    f: { parts: { outfit: 'outfit.dress', shoes: 'shoes.shoes' }, colors: { 'outfit.1': '#8a6a45' } }
  },
  espadachim: {
    m: { parts: { outfit: 'outfit.gambeson', armour: 'armour.plate', legs: 'legs.hose', shoes: 'shoes.boots' }, colors: { 'outfit.1': '#3f6fb5' } },
    f: { parts: { outfit: 'outfit.adventurer', armour: 'armour.plate', legs: 'legs.hose', shoes: 'shoes.tall' }, colors: { 'outfit.1': '#3f6fb5' } }
  },
  cavaleiro: {
    m: { parts: { outfit: 'outfit.plate', cloak: 'cloak.pauldrons', shoes: 'shoes.tall' }, colors: { 'outfit.1': '#2e4f8a' } },
    f: { parts: { outfit: 'outfit.coat', armour: 'armour.plate', cloak: 'cloak.pauldrons', shoes: 'shoes.tall' }, colors: { 'outfit.1': '#2e4f8a' } }
  },
  templario: {
    m: { parts: { outfit: 'outfit.plate', cloak: 'cloak.cloak', hat: 'hat.circlet', shoes: 'shoes.tall' }, colors: { 'cloak.1': '#1f3f7a' } },
    f: { parts: { outfit: 'outfit.vestment', armour: 'armour.plate', cloak: 'cloak.cloak', hat: 'hat.circlet', shoes: 'shoes.tall' },
      colors: { 'outfit.2': '#1f3f7a', 'cloak.1': '#1f3f7a' } }
  },
  arqueiro: {
    m: { parts: { outfit: 'outfit.travel', cloak: 'cloak.cloak', hat: 'hat.hood', legs: 'legs.wraps', shoes: 'shoes.boots' },
      colors: { 'outfit.1': '#3d8a53', 'cloak.1': '#2f6b40', 'hat.1': '#2f6b40' } },
    f: { parts: { outfit: 'outfit.travel', cloak: 'cloak.cloak', hat: 'hat.hood', legs: 'legs.stockings', shoes: 'shoes.boots' },
      colors: { 'outfit.1': '#3d8a53', 'cloak.1': '#2f6b40', 'hat.1': '#2f6b40' } }
  },
  cacador: {
    m: { parts: { outfit: 'outfit.oilcloth', hat: 'hat.cap', legs: 'legs.wraps', shoes: 'shoes.tall' }, colors: { 'outfit.1': '#66784a' } },
    f: { parts: { outfit: 'outfit.oilcloth', legs: 'legs.stockings', shoes: 'shoes.tall' }, colors: { 'outfit.1': '#66784a' } }
  },
  menestrel: {
    m: { parts: { outfit: 'outfit.coat', hat: 'hat.straw', shoes: 'shoes.shoes' }, colors: { 'outfit.1': '#b04a7a', 'outfit.3': '#e2c070' } },
    f: { parts: { outfit: 'outfit.dress', hat: 'hat.circlet', shoes: 'shoes.buckled' }, colors: { 'outfit.1': '#b04a7a' } }
  },
  gatuno: {
    m: { parts: { outfit: 'outfit.workshirt', hat: 'hat.hood', legs: 'legs.wraps', shoes: 'shoes.boots' }, colors: { 'outfit.1': '#4a4458', 'hat.1': '#2a2830' } },
    f: { parts: { outfit: 'outfit.coat', hat: 'hat.hood', legs: 'legs.hose', shoes: 'shoes.boots' },
      colors: { 'outfit.1': '#4a4458', 'legs.1': '#393940', 'hat.1': '#2a2830' } }
  },
  assassino: both({ parts: { outfit: 'outfit.cloak', hat: 'hat.hood', shoes: 'shoes.boots' }, colors: { 'outfit.1': '#2a2830', 'outfit.2': '#b23a48', 'hat.1': '#2a2830' } }),
  arruaceiro: {
    m: { parts: { outfit: 'outfit.adventurer', hat: 'hat.cap', shoes: 'shoes.boots' }, colors: { 'outfit.1': '#94492c' } },
    f: { parts: { outfit: 'outfit.adventurer', hat: 'hat.cap', legs: 'legs.hose', shoes: 'shoes.boots' }, colors: { 'outfit.1': '#94492c' } }
  },
  novico: {
    m: { parts: { outfit: 'outfit.vestment', shoes: 'shoes.sandals' }, colors: { 'outfit.2': '#e2c070' } },
    f: { parts: { outfit: 'outfit.robe', shoes: 'shoes.sandals' }, colors: { 'outfit.1': '#ece6d6', 'outfit.2': '#e2c070' } }
  },
  sacerdote: {
    m: { parts: { outfit: 'outfit.vestment', cloak: 'cloak.cloak', hat: 'hat.circlet', shoes: 'shoes.shoes' }, colors: { 'outfit.2': '#4a74b0', 'cloak.1': '#e2c070' } },
    f: { parts: { outfit: 'outfit.vestment', cloak: 'cloak.cloak', hat: 'hat.circlet', shoes: 'shoes.buckled' }, colors: { 'outfit.2': '#4a74b0', 'cloak.1': '#e2c070' } }
  },
  monge: {
    m: { parts: { outfit: 'outfit.gi', shoes: 'shoes.sandals' }, colors: { 'outfit.1': '#c26b2a', 'outfit.2': '#7a3a14' } },
    f: { parts: { outfit: 'outfit.robe', shoes: 'shoes.sandals' }, colors: { 'outfit.1': '#c26b2a', 'outfit.2': '#f2d38a' } }
  },
  mago: {
    m: { parts: { outfit: 'outfit.vestment', cloak: 'cloak.cloak', shoes: 'shoes.shoes' }, colors: { 'outfit.1': '#5a3fa8', 'outfit.2': '#f4c04e', 'cloak.1': '#3a2a78' } },
    f: { parts: { outfit: 'outfit.robe', cloak: 'cloak.cloak', shoes: 'shoes.shoes' }, colors: { 'outfit.1': '#5a3fa8', 'outfit.2': '#f4c04e', 'cloak.1': '#3a2a78' } }
  },
  bruxo: {
    m: { parts: { outfit: 'outfit.coat', cloak: 'cloak.cloak', hat: 'hat.hood', shoes: 'shoes.tall' },
      colors: { 'outfit.1': '#3a2a78', 'outfit.3': '#9fe3ff', 'cloak.1': '#1b1440', 'hat.1': '#1b1440' } },
    f: { parts: { outfit: 'outfit.dress', cloak: 'cloak.cloak', hat: 'hat.hood', shoes: 'shoes.tall' }, colors: { 'outfit.1': '#3a2a78', 'cloak.1': '#1b1440', 'hat.1': '#1b1440' } }
  },
  sabio: {
    m: { parts: { outfit: 'outfit.vestment', hat: 'hat.circlet', shoes: 'shoes.shoes' }, colors: { 'outfit.1': '#2f5f6b', 'outfit.2': '#f4c04e' } },
    f: { parts: { outfit: 'outfit.robe', hat: 'hat.circlet', shoes: 'shoes.buckled' }, colors: { 'outfit.1': '#2f5f6b', 'outfit.2': '#f4c04e' } }
  },
  mercador: {
    m: { parts: { outfit: 'outfit.workshirt', legs: 'legs.hose', shoes: 'shoes.boots' }, colors: { 'outfit.1': '#e2c070', 'outfit.2': '#b0702c' } },
    f: { parts: { outfit: 'outfit.workdress', hat: 'hat.kerchief', shoes: 'shoes.buckled' }, colors: { 'outfit.1': '#b0702c', 'hat.1': '#a23a3a' } }
  },
  ferreiro: {
    m: { parts: { outfit: 'outfit.apron', shoes: 'shoes.boots' }, colors: { 'outfit.1': '#47301f' } },
    f: { parts: { outfit: 'outfit.oilcloth', hat: 'hat.kerchief', shoes: 'shoes.boots' }, colors: { 'outfit.1': '#7a4a24', 'hat.1': '#393940' } }
  },
  alquimista: {
    m: { parts: { outfit: 'outfit.coat', shoes: 'shoes.shoes' }, colors: { 'outfit.1': '#3f7a6b', 'outfit.3': '#e8d36a' } },
    f: { parts: { outfit: 'outfit.shawl', shoes: 'shoes.buckled' }, colors: { 'outfit.1': '#3f7a6b' } }
  }
};

/** Todas as peças que o app usa (o script da arte só leva estas). */
export function usedParts(): string[] {
  const set = new Set<string>([...HAIR_STYLES, ...FACES, ...BEARDS, ...MARKS].map(c => c.id));
  set.add(GLASSES_PART);
  for (const pair of Object.values(COSTUMES)) for (const c of [pair.m, pair.f]) Object.values(c.parts).forEach(p => p && set.add(p));
  return [...set].sort();
}
