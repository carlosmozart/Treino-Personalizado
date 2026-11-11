// Retrospectiva do ano (V6): os números de um ano de treino, calculados no aparelho a partir do
// histórico. A tela (features/year-review) mostra cada número como uma tela de stories.
import { groupOf } from '../data/exercise-library';
import { fromDateKey, type DateKey } from './dates';
import type { AppData, Workout } from './model';
import { recordKinds } from './strength';
import { bestSet, volumeOptions, workoutVolume, workSets } from './workouts';

/** O cartão do Início aparece de 1º de dezembro até o fim de janeiro (em janeiro, o ano anterior). */
export function reviewYearFor(today: DateKey): number | null {
  const m = today.slice(5, 7), y = Number(today.slice(0, 4));
  if (m === '12') return y;
  if (m === '01') return y - 1;
  return null;
}

export type DayPart = 'manhã' | 'tarde' | 'noite' | 'madrugada';
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'] as const;
const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'] as const;

export interface Personality { title: string; text: string }

export interface YearReview {
  year: number;
  workouts: number;
  /** Dias diferentes com treino. */
  days: number;
  /** Horas registradas (treinos com duração). */
  hours: number;
  /** Carga total levantada, em toneladas. */
  tons: number;
  /** Comparação divertida da carga: "8 elefantes". */
  tonsLike: string | null;
  longestStreak: number;
  /** O exercício que mais apareceu, com quantos treinos, séries e o grupo. */
  signature: { name: string; sessions: number; sets: number; group: string | null } | null;
  records: number;
  /** O maior recorde de carga do ano. */
  biggestRecord: { name: string; weight: number; reps: number } | null;
  favoriteWeekday: string | null;
  favoritePart: DayPart | null;
  bestMonth: { name: string; workouts: number } | null;
  /** Primeira e última pesagem do ano (só com duas ou mais). */
  weight: { from: number; to: number; change: number } | null;
  personality: Personality;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Toneladas em coisas conhecidas: carros populares, elefantes, baleias-azuis. */
export function tonsComparison(tons: number): string | null {
  if (tons < 1) return null;
  if (tons >= 150) { const n = Math.round(tons / 150); return n === 1 ? '1 baleia-azul' : `${n} baleias-azuis`; }
  if (tons >= 6) { const n = Math.round(tons / 6); return n === 1 ? '1 elefante' : `${n} elefantes`; }
  const n = Math.round(tons);
  return n === 1 ? '1 carro popular' : `${n} carros populares`;
}

function partOf(w: Workout): DayPart | null {
  if (!w.startedAt) return null;
  const h = new Date(w.startedAt).getHours();
  return h < 5 ? 'madrugada' : h < 12 ? 'manhã' : h < 18 ? 'tarde' : 'noite';
}

const most = <K extends string>(counts: Map<K, number>): [K, number] | null => {
  let best: [K, number] | null = null;
  for (const [k, n] of counts) if (!best || n > best[1]) best = [k, n];
  return best;
};

/** Um apelido pelo jeito de treinar, sem julgar ninguém. */
function personalityOf(r: Omit<YearReview, 'personality'>, legShare: number, weeksShare: number): Personality {
  if (weeksShare >= 0.75) return { title: 'Constância é o seu sobrenome', text: 'Você treinou em quase todas as semanas do ano. É assim que o resultado vem.' };
  if (r.favoritePart === 'manhã') return { title: 'Turma do primeiro raio', text: 'A maioria dos seus treinos foi de manhã: o dia já começa vencido.' };
  if (r.favoritePart === 'noite' || r.favoritePart === 'madrugada') return { title: 'Coruja da academia', text: 'Seus treinos preferidos foram à noite, quando o resto já foi dormir.' };
  if (legShare >= 0.3) return { title: 'Dia de perna é sagrado', text: 'Perna foi o que você mais treinou. O resto do mundo pula; você não.' };
  if (r.records >= 10) return { title: 'Colecionador de recordes', text: `Foram ${r.records} recordes no ano. A barra que se cuide.` };
  return { title: 'Em construção', text: 'Cada treino somou. O próximo ano começa daqui.' };
}

/** A retrospectiva de um ano. Sem treino no ano, `workouts` é 0 e a tela não abre. */
export function yearReview(data: Pick<AppData, 'workouts' | 'gamification' | 'profile' | 'settings'>, year: number, now: Date = new Date()): YearReview {
  const prefix = `${year}-`;
  const inYear = data.workouts.filter(w => w.date.startsWith(prefix));
  const days = new Set(inYear.map(w => w.date)).size;
  const minutes = inYear.reduce((n, w) => n + (w.durationMin ?? 0), 0);
  const opts = volumeOptions(data);
  const tons = round1(inYear.reduce((n, w) => n + workoutVolume(w, opts), 0) / 1000);

  // exercício assinatura e a parte do corpo mais treinada (séries por grupo)
  const byExercise = new Map<string, { name: string; sessions: number; sets: number }>();
  const setsByGroup = new Map<string, number>();
  let allSets = 0;
  for (const w of inYear) {
    for (const e of w.entries) {
      const sets = e.mode === 'cardio' ? 1 : workSets(e).length;
      const cur = byExercise.get(e.key) ?? { name: e.name, sessions: 0, sets: 0 };
      byExercise.set(e.key, { name: e.name, sessions: cur.sessions + 1, sets: cur.sets + sets });
      const g = groupOf(e.name, data.settings.customExercises);
      if (g) setsByGroup.set(g, (setsByGroup.get(g) ?? 0) + sets);
      allSets += sets;
    }
  }
  const sig = [...byExercise.values()].sort((a, b) => b.sessions - a.sessions || b.sets - a.sets)[0];
  const legSets = [...setsByGroup].filter(([g]) => g.startsWith('Pernas')).reduce((n, [, s]) => n + s, 0);

  // recordes do ano (contra todo o histórico anterior) e o maior de carga
  let records = 0;
  let biggestRecord: YearReview['biggestRecord'] = null;
  for (const w of inYear) {
    for (const e of w.entries) {
      const kinds = recordKinds(data.workouts, w, e);
      if (!kinds.length) continue;
      records++;
      const top = bestSet(e);
      if (kinds.includes('weight') && top && (!biggestRecord || top.weight > biggestRecord.weight)) biggestRecord = { name: e.name, weight: top.weight, reps: top.reps };
    }
  }

  const weekdays = new Map<string, number>();
  const parts = new Map<DayPart, number>();
  const months = new Map<string, number>();
  const weeks = new Set<string>();
  for (const w of inYear) {
    const d = fromDateKey(w.date);
    weekdays.set(WEEKDAYS[d.getDay()]!, (weekdays.get(WEEKDAYS[d.getDay()]!) ?? 0) + 1);
    const p = partOf(w);
    if (p) parts.set(p, (parts.get(p) ?? 0) + 1);
    const m = MONTHS[d.getMonth()]!;
    months.set(m, (months.get(m) ?? 0) + 1);
    // semana pelo número de dias desde 1º de janeiro
    weeks.add(String(Math.floor((d.getTime() - new Date(year, 0, 1).getTime()) / (7 * 86_400_000))));
  }
  const bestMonth = most(months);

  const weighIns = data.profile.weighIns.filter(x => x.date.startsWith(prefix)).sort((a, b) => (a.date < b.date ? -1 : 1));
  const weight = weighIns.length >= 2
    ? { from: weighIns[0]!.weight, to: weighIns[weighIns.length - 1]!.weight, change: round1(weighIns[weighIns.length - 1]!.weight - weighIns[0]!.weight) }
    : null;

  // semanas do ano até hoje (ou o ano inteiro, se já passou)
  const end = now < new Date(year + 1, 0, 1) ? now : new Date(year + 1, 0, 1);
  const weeksSoFar = Math.max(1, Math.ceil((end.getTime() - new Date(year, 0, 1).getTime()) / (7 * 86_400_000)));

  const base: Omit<YearReview, 'personality'> = {
    year, workouts: inYear.length, days, hours: Math.round(minutes / 60), tons, tonsLike: tonsComparison(tons),
    longestStreak: data.gamification.longestStreak,
    signature: sig ? { ...sig, group: groupOf(sig.name, data.settings.customExercises) } : null,
    records, biggestRecord,
    favoriteWeekday: most(weekdays)?.[0] ?? null,
    favoritePart: most(parts)?.[0] ?? null,
    bestMonth: bestMonth ? { name: bestMonth[0], workouts: bestMonth[1] } : null,
    weight
  };
  return { ...base, personality: personalityOf(base, allSets ? legSets / allSets : 0, Math.min(1, weeks.size / weeksSoFar)) };
}

/** Anos com pelo menos um treino, do mais novo ao mais antigo (para escolher no Progresso). */
export function yearsWithWorkouts(workouts: readonly Workout[]): number[] {
  return [...new Set(workouts.map(w => Number(w.date.slice(0, 4))))].sort((a, b) => b - a);
}

// ---------------------------------------------------------------- telas

/** Uma tela da retrospectiva: o número grande, o que ele quer dizer e, no resumo, a lista. */
export interface ReviewSlide {
  id: string;
  eyebrow: string;
  big: string;
  text: string;
  stats?: [string, string][];
  /** Índice da paleta de cores da tela (a imagem e a tela usam a mesma). */
  tone: number;
}

const num = (n: number) => String(n).replace('.', ',');
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const PART_TEXT: Record<DayPart, string> = { manhã: 'de manhã', tarde: 'à tarde', noite: 'à noite', madrugada: 'de madrugada' };

/** As telas, na ordem; as sem número (ano sem pesagem, sem recorde…) ficam de fora. */
export function reviewSlides(r: YearReview, opts: { showWeight: boolean } = { showWeight: true }): ReviewSlide[] {
  const s: Omit<ReviewSlide, 'tone'>[] = [];
  s.push({ id: 'abertura', eyebrow: String(r.year), big: 'Seu ano de treino', text: 'Toque na tela para ver os números do seu ano.' });
  s.push({
    id: 'treinos', eyebrow: 'Treinos', big: num(r.workouts),
    text: `${r.workouts === 1 ? 'treino' : 'treinos'} em ${r.days === 1 ? '1 dia' : `${r.days} dias diferentes`}.`
  });
  if (r.hours >= 1) s.push({ id: 'horas', eyebrow: 'Tempo', big: `${r.hours} h`, text: 'treinando, contando os treinos com o tempo registrado.' });
  if (r.tons >= 0.1) s.push({ id: 'toneladas', eyebrow: 'Carga', big: `${num(r.tons)} t`, text: r.tonsLike ? `levantadas no total. É o peso de ${r.tonsLike}.` : 'levantadas no total.' });
  if (r.longestStreak >= 2) s.push({ id: 'sequencia', eyebrow: 'Sequência', big: `${r.longestStreak} dias`, text: 'foi a sua maior sequência de treinos.' });
  if (r.signature) {
    s.push({
      id: 'exercicio', eyebrow: 'Seu exercício', big: r.signature.name,
      text: `${r.signature.sessions === 1 ? '1 treino' : `${r.signature.sessions} treinos`} e ${r.signature.sets === 1 ? '1 série' : `${r.signature.sets} séries`}${r.signature.group ? ` · ${r.signature.group}` : ''}.`
    });
  }
  if (r.records >= 1) {
    const big = r.biggestRecord;
    s.push({
      id: 'recordes', eyebrow: 'Recordes', big: num(r.records),
      text: `${r.records === 1 ? 'recorde' : 'recordes'} no ano.${big ? ` O maior: ${big.name}, ${num(big.weight)} kg × ${big.reps}.` : ''}`
    });
  }
  if (r.favoriteWeekday) {
    s.push({ id: 'dia', eyebrow: 'Seu dia', big: cap(r.favoriteWeekday), text: `foi o dia preferido para treinar${r.favoritePart ? `, quase sempre ${PART_TEXT[r.favoritePart]}` : ''}.` });
  }
  if (r.bestMonth && r.workouts >= 3) s.push({ id: 'mes', eyebrow: 'Melhor mês', big: cap(r.bestMonth.name), text: `com ${r.bestMonth.workouts} treinos.` });
  if (r.weight && opts.showWeight) {
    const sign = r.weight.change > 0 ? '+' : r.weight.change < 0 ? '−' : '';
    s.push({ id: 'peso', eyebrow: 'Peso', big: `${sign}${num(Math.abs(r.weight.change))} kg`, text: `de ${num(r.weight.from)} para ${num(r.weight.to)} kg ao longo do ano.` });
  }
  s.push({ id: 'jeito', eyebrow: 'Seu jeito de treinar', big: r.personality.title, text: r.personality.text });
  const stats: [string, string][] = [['Treinos', num(r.workouts)]];
  if (r.tons >= 0.1) stats.push(['Toneladas', num(r.tons)]);
  if (r.records) stats.push(['Recordes', num(r.records)]);
  if (r.longestStreak >= 2) stats.push(['Maior sequência', `${r.longestStreak} dias`]);
  if (r.signature) stats.push(['Exercício', r.signature.name]);
  s.push({ id: 'resumo', eyebrow: `Resumo de ${r.year}`, big: 'Que ano!', text: `Bora fazer ${r.year + 1} ainda melhor.`, stats });
  return s.map((x, i) => ({ ...x, tone: i % 6 }));
}
