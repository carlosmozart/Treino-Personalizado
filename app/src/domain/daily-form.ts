// W2: check-in do dia antes do treino. Sono e energia: 5 é ótimo; dor e estresse: 5 é muito.
import type { DailyForm } from './model';

export const FORM_FIELDS = [
  { key: 'sono', label: 'Sono', low: 'péssimo', high: 'ótimo', goodHigh: true },
  { key: 'energia', label: 'Energia', low: 'baixa', high: 'alta', goodHigh: true },
  { key: 'dor', label: 'Dor muscular', low: 'nenhuma', high: 'muita', goodHigh: false },
  { key: 'estresse', label: 'Estresse', low: 'baixo', high: 'alto', goodHigh: false }
] as const;

/** Sinais ruins do check-in: sono ou energia em 1–2, dor ou estresse em 4–5. */
export function badSigns(form: DailyForm): number {
  let n = 0;
  if (form.sono !== undefined && form.sono <= 2) n++;
  if (form.energia !== undefined && form.energia <= 2) n++;
  if (form.dor !== undefined && form.dor >= 4) n++;
  if (form.estresse !== undefined && form.estresse >= 4) n++;
  return n;
}

/**
 * Dia puxado: dois sinais ruins, ou um no extremo (dormiu muito mal, sem energia nenhuma, dor
 * forte). O app só oferece ir mais leve; nunca decide pela pessoa.
 */
export function roughDay(form: DailyForm): boolean {
  return badSigns(form) >= 2 || form.sono === 1 || form.energia === 1 || form.dor === 5;
}
