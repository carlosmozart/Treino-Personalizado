// Cálculos de saúde. São estimativas populacionais: a interface deve apresentá-las como tal.
export type Sex = 'masculino' | 'feminino' | '';
export type ActivityLevel = 'sedentario' | 'moderado' | 'intenso';
export type TmbFormulaId = 'mifflin' | 'harris' | 'katch';

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = { sedentario: 1.2, moderado: 1.55, intenso: 1.725 };

const valid = (n: number | null | undefined): n is number => typeof n === 'number' && Number.isFinite(n);

export function tmbMifflin(weightKg: number, heightCm: number, age: number | null, sex: Sex): number | null {
  if (!weightKg || !heightCm || !valid(age)) return null;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (sex === 'masculino') return base + 5;
  if (sex === 'feminino') return base - 161;
  return base + (5 - 161) / 2; // sexo não informado: média das duas constantes
}

/** Harris-Benedict revisada (Roza & Shizgal, 1984). */
export function tmbHarrisBenedict(weightKg: number, heightCm: number, age: number | null, sex: Sex): number | null {
  if (!weightKg || !heightCm || !valid(age)) return null;
  const male = 88.362 + 13.397 * weightKg + 4.799 * heightCm - 5.677 * age;
  const female = 447.593 + 9.247 * weightKg + 3.098 * heightCm - 4.33 * age;
  if (sex === 'masculino') return male;
  if (sex === 'feminino') return female;
  return (male + female) / 2;
}

export function tmbKatchMcArdle(weightKg: number, bodyFatPercent: number | null): number | null {
  if (!weightKg || !valid(bodyFatPercent)) return null;
  if (bodyFatPercent < 0 || bodyFatPercent > 70) return null; // faixa fisiologicamente plausível
  return 370 + 21.6 * weightKg * (1 - bodyFatPercent / 100);
}

export interface TmbInput {
  weightKg: number;
  heightCm: number;
  age: number | null;
  sex: Sex;
  bodyFatPercent: number | null;
}

export interface TmbFormula {
  label: string;
  recommended: boolean;
  needsBodyFat: boolean;
  compute: (input: TmbInput) => number | null;
  explain: string;
}

export const TMB_FORMULAS: Record<TmbFormulaId, TmbFormula> = {
  mifflin: {
    label: 'Mifflin-St Jeor',
    recommended: true,
    needsBodyFat: false,
    compute: i => tmbMifflin(i.weightKg, i.heightCm, i.age, i.sex),
    explain: 'Considerada pela maioria dos estudos comparativos atuais a fórmula mais precisa para a população em geral, incluindo pessoas com sobrepeso. Usa peso, altura, idade e sexo.'
  },
  harris: {
    label: 'Harris-Benedict',
    recommended: false,
    needsBodyFat: false,
    compute: i => tmbHarrisBenedict(i.weightKg, i.heightCm, i.age, i.sex),
    explain: 'Versão revisada de 1984, por décadas a referência em nutrição clínica. Tende a superestimar levemente em quem tem mais gordura corporal.'
  },
  katch: {
    label: 'Katch-McArdle',
    recommended: false,
    needsBodyFat: true,
    compute: i => tmbKatchMcArdle(i.weightKg, i.bodyFatPercent),
    explain: 'Parte da massa magra em vez do peso total. Costuma ser a mais precisa para quem treina, mas exige saber o percentual de gordura.'
  }
};

export function tdee(tmb: number | null, activity: ActivityLevel | undefined): number | null {
  if (!valid(tmb)) return null;
  return tmb * (activity ? ACTIVITY_MULTIPLIERS[activity] : 1.2);
}

export function bmi(weightKg: number, heightCm: number): number | null {
  const h = heightCm / 100;
  if (!weightKg || !h) return null;
  return weightKg / (h * h);
}

export type BmiTone = 'info' | 'success' | 'warning' | 'danger';

export interface BmiClass {
  label: string;
  tone: BmiTone;
  /** Posição (0–100) na barra de faixas. */
  position: number;
  explain: string;
}

export function classifyBmi(value: number): BmiClass {
  if (value < 18.5) return { label: 'Abaixo do peso', tone: 'info', position: (value / 18.5) * 20,
    explain: 'Abaixo da faixa considerada saudável. Ganhar peso de forma gradual, com foco em massa muscular, costuma ser o objetivo recomendado.' };
  if (value < 25) return { label: 'Peso normal', tone: 'success', position: 20 + ((value - 18.5) / 6.5) * 30,
    explain: 'Dentro da faixa considerada saudável para a maioria dos adultos.' };
  if (value < 30) return { label: 'Sobrepeso', tone: 'warning', position: 50 + ((value - 25) / 5) * 25,
    explain: 'Faixa de sobrepeso. Não significa necessariamente excesso de gordura — muita massa muscular também cai aqui —, então vale acompanhar a composição corporal junto com o peso.' };
  if (value < 35) return { label: 'Obesidade grau I', tone: 'danger', position: 75 + ((value - 30) / 5) * 15,
    explain: 'Faixa de obesidade grau I. Treino de força com déficit calórico moderado ajuda a reduzi-la preservando massa magra.' };
  return { label: 'Obesidade grau II/III', tone: 'danger', position: 95,
    explain: 'Faixa elevada. Procure acompanhamento profissional (médico ou nutricionista) para um plano seguro e individualizado.' };
}

/** Faixa de peso com IMC entre 18,5 e 24,9, arredondada a 0,1 kg. */
export function idealWeightRange(heightCm: number): { min: number; max: number } | null {
  const h = (heightCm || 0) / 100;
  if (!h) return null;
  const round = (n: number) => Math.round(n * 10) / 10;
  return { min: round(18.5 * h * h), max: round(24.9 * h * h) };
}

/** Meta diária de água: 35 ml/kg + extra pela atividade, arredondada a 50 ml. */
export function waterTargetMl(weightKg: number, activity: ActivityLevel | undefined): number {
  if (!weightKg) return 0;
  let base = weightKg * 35;
  if (activity === 'moderado') base += 350;
  else if (activity === 'intenso') base += 700;
  return Math.round(base / 50) * 50;
}
