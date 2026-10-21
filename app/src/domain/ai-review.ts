// Revisão do plano pela IA (M34). O app junta o plano atual (no mesmo bloco que a IA devolve),
// o que a pessoa fez de verdade nas últimas semanas e o objetivo; a IA explica as mudanças e
// devolve o plano revisado no bloco. Na volta, o app compara com o plano atual e mostra cada
// mudança separada, para a pessoa aprovar uma a uma: nada muda sem ela marcar.
import { DAY_KEYS, type AiPlan, type DayKey } from './ai-plan';
import { aiPlanToPlan } from './ai-plan-import';
import { AI_GOALS, BLOCK_RULES, type AiGoal } from './ai-prompt';
import type { DateKey } from './dates';
import { DAY_FULL_NAMES, MAX_EXERCISES_PER_DAY, type AppData, type Plan, type PlanExercise } from './model';
import { repRange } from './progression';
import { weeklyVolume } from './stats';
import { normalizeExerciseName } from './text';
import { describeEntry, sessionsOf } from './workouts';

const fmt = (n: number) => String(n).replace('.', ',');
const br = (d: DateKey) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

function reps(ex: PlanExercise): string {
  const { min, max } = repRange(ex);
  return min === max ? String(max) : `${min}-${max}`;
}

/** O plano no formato do bloco [PLANO] (o mesmo que a IA devolve). */
export function planBlock(plan: Plan): string[] {
  const out = ['[PLANO]'];
  for (const k of DAY_KEYS) {
    const day = plan.days[k];
    if (!day.exercises.length) continue;
    out.push(`DIA | ${k} | ${day.name.replace(/\|/g, '/') || DAY_FULL_NAMES[k]} | ${day.focus.replace(/\|/g, '/')}`);
    for (const ex of day.exercises) {
      const tipo = ex.mode === 'cardio' ? 'cardio' : ex.mode === 'time' ? 'tempo' : 'forca';
      const valor = ex.mode === 'cardio' ? String(ex.minutes) : ex.mode === 'time' ? String(ex.seconds ?? 30) : reps(ex);
      const alt = ex.alternatives[0]?.name ?? '';
      out.push(`EX | ${ex.name.replace(/\|/g, '/')} | ${tipo} | ${ex.mode === 'cardio' ? 1 : ex.sets} | ${valor} | ${ex.weight ? fmt(ex.weight) : ''} | ${alt.replace(/\|/g, '/')}`);
    }
  }
  out.push('[FIM]');
  return out;
}

const REVIEW_RULES = BLOCK_RULES.flatMap(rule =>
  rule.startsWith('- Campos de EX') ? ['- Campos de EX, nesta ordem: nome | tipo | séries | repetições | carga | alternativa | motivo']
  : rule.startsWith('- A alternativa') ? ['- A alternativa repete a que o exercício já tem; deixe vazia quando não houver.']
  : rule.startsWith('- A carga') ? ['- A carga vai em kg: repita a que está no plano. Vazia quer dizer "manter a atual" (ou "definir na prática", num exercício novo).']
  : rule.startsWith('- Nos tipos') ? [rule, '- Em "forca", as repetições podem ser um número (10) ou uma faixa com hífen (8-12).',
    '- O motivo é uma frase curta, só nos exercícios que você mudou ou incluiu; nos que ficaram iguais, deixe vazio.']
  : rule.startsWith('- Não use o caractere') ? ['- Não use o caractere | dentro dos nomes nem do motivo, e não escreva mais nada dentro do bloco.']
  : [rule]
);

export interface ReviewPromptOptions { goal: AiGoal; notes: string }

/** Pedido de revisão: plano atual no bloco, histórico real e objetivo. */
export function buildReviewPrompt(data: AppData, plan: Plan, o: ReviewPromptOptions, now: Date): string {
  const L: string[] = ['Quero que você revise o meu plano de treino atual com base no que eu realmente fiz nas últimas semanas.', ''];
  L.push('## MEU OBJETIVO', `Quero ${AI_GOALS[o.goal]}.`, '');
  L.push('## MEU PLANO ATUAL', '```', ...planBlock(plan), '```', '');

  const weeks = weeklyVolume(data, now, 4);
  L.push('## O QUE EU FIZ NAS ÚLTIMAS SEMANAS');
  L.push(`- Treinos por semana: ${weeks.map(w => `${br(w.start)} a ${br(w.end)}: ${w.workouts}`).join(' · ')}`);
  const seen = new Set<string>();
  for (const k of DAY_KEYS) {
    for (const ex of plan.days[k].exercises) {
      const key = normalizeExerciseName(ex.name);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const last = sessionsOf(data.workouts, key).slice(-4);
      L.push(`- ${ex.name}: ${last.length ? last.map(s => `${br(s.workout.date)} ${describeEntry(s.entry)}`).join(' | ') : 'ainda não registrado'}`);
    }
  }
  L.push('Cada sessão mostra séries x repetições e a carga usada, só das séries de trabalho (sem aquecimento).', '');

  L.push('## OBSERVAÇÕES IMPORTANTES', o.notes.trim() || 'Não informei limitações físicas. Se algum exercício exigir mais técnica ou carregar mais a coluna, o joelho ou o ombro, avise.', '');

  L.push('## O QUE EU PRECISO QUE VOCÊ FAÇA',
    '1. Primeiro, liste as mudanças que você recomenda, cada uma com o motivo em uma frase, apontando no meu histórico o que levou a ela (carga parada, repetições caindo, exercício que eu não faço, volume demais ou de menos para um grupo).',
    '2. Mude só o que tiver um motivo claro. Se o plano estiver bom, diga isso e mude pouco ou nada.',
    '3. Mantenha os mesmos dias da semana e, de preferência, os mesmos exercícios; troque um exercício só quando houver um bom motivo.',
    '4. Não invente cargas: mantenha as que eu uso. Para um exercício novo, deixe a carga vazia.',
    '5. Use os nomes de exercícios como são conhecidos em academia no Brasil.', '');
  L.push('Por último, repita o plano INTEIRO revisado (inclusive o que não mudou) no formato abaixo, DENTRO de um bloco de código (```), para eu importar no meu app e aprovar cada mudança:');
  L.push('Se você não conseguir seguir esse formato, responda exatamente "NÃO CONSEGUI GERAR BLOCO IMPORTÁVEL: " e explique o motivo.', '');
  L.push(...REVIEW_RULES);
  return L.join('\n');
}

export type ReviewKind = 'change' | 'swap' | 'add' | 'remove';

export interface ReviewChange {
  id: string;
  day: DayKey;
  kind: ReviewKind;
  before?: PlanExercise;
  after?: PlanExercise;
  /** O que muda, em texto ("Séries: 3 → 4"). */
  details: string[];
  reason?: string | undefined;
}

export interface Review {
  changes: ReviewChange[];
  /** Nome e foco do dia na resposta, para um dia vazio que ganha exercícios. */
  dayNames: Partial<Record<DayKey, { name: string; focus: string }>>;
}

/** "4 × 8–12 · 40 kg", "3 × 30 s", "20 min". */
export function targetText(ex: PlanExercise): string {
  if (ex.mode === 'cardio') return `${ex.minutes} min`;
  if (ex.mode === 'time') return `${ex.sets} × ${ex.seconds ?? 30} s${ex.weight ? ` · ${fmt(ex.weight)} kg` : ''}`;
  const { min, max } = repRange(ex);
  return `${ex.sets} × ${min === max ? max : `${min}–${max}`}${ex.weight ? ` · ${fmt(ex.weight)} kg` : ''}`;
}

const MODE_NAME = { reps: 'repetições', time: 'tempo', cardio: 'cardio' } as const;

function diff(a: PlanExercise, b: PlanExercise): string[] {
  const out: string[] = [];
  if (a.mode !== b.mode) out.push(`Tipo: ${MODE_NAME[a.mode]} → ${MODE_NAME[b.mode]}`);
  if (b.mode !== 'cardio' && a.sets !== b.sets) out.push(`Séries: ${a.sets} → ${b.sets}`);
  if (b.mode === 'reps') {
    const ra = repRange(a), rb = repRange(b);
    const t = (r: { min: number; max: number }) => (r.min === r.max ? String(r.max) : `${r.min}–${r.max}`);
    if (a.mode === 'reps' && (ra.min !== rb.min || ra.max !== rb.max)) out.push(`Repetições: ${t(ra)} → ${t(rb)}`);
  }
  if (b.mode === 'time' && a.mode === 'time' && (a.seconds ?? 30) !== (b.seconds ?? 30)) out.push(`Segundos: ${a.seconds ?? 30} → ${b.seconds ?? 30}`);
  if (b.mode === 'cardio' && a.mode === 'cardio' && a.minutes !== b.minutes) out.push(`Minutos: ${a.minutes} → ${b.minutes}`);
  // carga vazia na resposta = manter a atual
  if (b.mode !== 'cardio' && b.weight > 0 && a.weight !== b.weight) out.push(`Carga: ${a.weight ? `${fmt(a.weight)} kg` : 'sem carga'} → ${fmt(b.weight)} kg`);
  return out;
}

/** Compara o plano atual com o revisado pela IA: cada diferença vira uma mudança para aprovar. */
export function reviewChanges(plan: Plan, ai: AiPlan, opts: { makeId: () => string; isCardioName: (name: string) => boolean }): Review {
  const proposed = aiPlanToPlan(ai, { id: 'revisao', name: '', today: '2000-01-01', makeId: opts.makeId, isCardioName: opts.isCardioName }).plan;
  const changes: ReviewChange[] = [];
  const dayNames: Review['dayNames'] = {};
  let n = 0;
  const id = () => `mudanca-${++n}`;

  for (const k of DAY_KEYS) {
    const old = plan.days[k].exercises;
    const neu = proposed.days[k].exercises;
    const aiDay = ai.dias.find(d => d.dia === k);
    const reasonAt = (i: number) => aiDay?.exercicios[i]?.motivo;
    if (neu.length) dayNames[k] = { name: proposed.days[k].name, focus: proposed.days[k].focus };

    const used = new Set<string>();
    const adds: { after: PlanExercise; reason?: string | undefined }[] = [];
    neu.forEach((after, i) => {
      const before = old.find(e => !used.has(e.id) && normalizeExerciseName(e.name) === normalizeExerciseName(after.name));
      if (!before) { adds.push({ after, reason: reasonAt(i) }); return; }
      used.add(before.id);
      const details = diff(before, after);
      if (details.length) changes.push({ id: id(), day: k, kind: 'change', before, after, details, reason: reasonAt(i) });
    });
    const removes = old.filter(e => !used.has(e.id));
    // um que sai e um que entra no mesmo dia, na ordem: é uma troca
    const pairs = Math.min(removes.length, adds.length);
    for (let i = 0; i < pairs; i++) {
      const before = removes[i]!, { after, reason } = adds[i]!;
      changes.push({ id: id(), day: k, kind: 'swap', before, after, details: [`${before.name} → ${after.name}`, targetText(after)], reason });
    }
    for (const { after, reason } of adds.slice(pairs)) changes.push({ id: id(), day: k, kind: 'add', after, details: [targetText(after)], reason });
    for (const before of removes.slice(pairs)) changes.push({ id: id(), day: k, kind: 'remove', before, details: [targetText(before)] });
  }
  return { changes, dayNames };
}

/**
 * Aplica só as mudanças aprovadas. Alterar mexe apenas no que mudou (descanso, dica, incremento e
 * reservas ficam); trocar põe o novo no lugar do antigo; incluir vai para o fim do dia.
 */
export function applyReview(plan: Plan, review: Review, approved: ReadonlySet<string>): { plan: Plan; skipped: number } {
  const days = structuredClone(plan.days);
  const chosen = review.changes.filter(c => approved.has(c.id));
  let skipped = 0;
  for (const c of chosen) {
    const day = days[c.day];
    const i = c.before ? day.exercises.findIndex(e => e.id === c.before!.id) : -1;
    if (c.kind === 'remove' && i >= 0) day.exercises.splice(i, 1);
    if (c.kind === 'swap' && i >= 0 && c.after) day.exercises[i] = structuredClone(c.after);
    if (c.kind === 'change' && i >= 0 && c.after) {
      const cur = day.exercises[i]!, a = c.after;
      const next: PlanExercise = { ...cur, mode: a.mode, sets: a.sets, reps: a.reps, minutes: a.mode === 'cardio' ? a.minutes : cur.minutes };
      if (a.weight > 0) next.weight = a.weight;
      if (a.mode === 'time') next.seconds = a.seconds ?? 30; else delete next.seconds;
      if (a.repMin !== undefined && a.repMax !== undefined) { next.repMin = a.repMin; next.repMax = a.repMax; } else { delete next.repMin; delete next.repMax; }
      day.exercises[i] = next;
    }
  }
  for (const c of chosen) {
    if (c.kind !== 'add' || !c.after) continue;
    const day = days[c.day];
    if (day.exercises.length >= MAX_EXERCISES_PER_DAY) { skipped++; continue; }
    // dia de descanso que ganha o primeiro exercício: nome e foco vêm da resposta
    if (!day.exercises.length) {
      const names = review.dayNames[c.day];
      if (names) { day.name = names.name; day.focus = names.focus; }
    }
    day.exercises.push(structuredClone(c.after));
  }
  return { plan: { ...plan, days }, skipped };
}
