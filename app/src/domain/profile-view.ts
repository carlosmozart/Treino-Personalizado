// O que as telas de Perfil e Saúde mostram, calculado a partir do cadastro.
import { fromDateKey, toDateKey } from './dates';
import { bmi, classifyBmi, idealWeightRange, TMB_FORMULAS, tdee, waterTargetMl, type BmiClass } from './health';
import { stampAll } from './sync';
import type { ActionResult } from './actions';
import type { AppData, UserProfile } from './model';

/** Idade em anos completos; null sem data válida. */
export function ageFrom(birthdate: string, now: Date): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthdate)) return null;
  const born = fromDateKey(birthdate);
  let age = now.getFullYear() - born.getFullYear();
  if (toDateKey(now).slice(5) < birthdate.slice(5)) age--;
  return age >= 0 && age < 130 ? age : null;
}

export interface HealthSummary {
  age: number | null;
  weightKg: number | null;
  bmi: number | null;
  bmiClass: BmiClass | null;
  ideal: { min: number; max: number } | null;
  /** Taxa metabólica basal pela fórmula escolhida. */
  tmb: number | null;
  tmbLabel: string;
  /** Gasto diário com a atividade. */
  tdee: number | null;
  waterMl: number;
  /** O que falta no cadastro para os cálculos. */
  missing: string[];
}

export function healthSummary(profile: UserProfile, now: Date): HealthSummary {
  const age = ageFrom(profile.birthdate, now);
  const weight = profile.weighIns[profile.weighIns.length - 1]?.weight ?? profile.weightKg;
  const height = profile.heightCm;
  const formula = TMB_FORMULAS[profile.tmbFormula] ?? TMB_FORMULAS.mifflin;
  const value = weight && height ? bmi(weight, height) : null;
  const tmb = weight && height ? formula.compute({ weightKg: weight, heightCm: height, age, sex: profile.sex, bodyFatPercent: profile.bodyFatPercent }) : null;
  const missing = [
    !weight && 'peso', !height && 'altura', age === null && 'data de nascimento', !profile.sex && 'sexo',
    formula.needsBodyFat && !profile.bodyFatPercent && '% de gordura'
  ].filter((m): m is string => !!m);
  return {
    age, weightKg: weight ?? null,
    bmi: value, bmiClass: value ? classifyBmi(value) : null,
    ideal: height ? idealWeightRange(height) : null,
    tmb: tmb === null ? null : Math.round(tmb), tmbLabel: formula.label,
    tdee: (() => { const t = tdee(tmb, profile.activityLevel); return t === null ? null : Math.round(t); })(),
    waterMl: waterTargetMl(weight ?? 0, profile.activityLevel),
    missing
  };
}

/**
 * Restaura um backup: substitui tudo e carimba cada registro com agora (mesmo os que já tinham
 * carimbo antigo), para a versão restaurada prevalecer sobre a nuvem.
 */
export function restoreBackup(_data: AppData, restored: AppData, now: Date): ActionResult {
  return { data: stampAll({ ...restored, sync: { changed: {}, deleted: { ...restored.sync.deleted } } }, now), events: [] };
}
