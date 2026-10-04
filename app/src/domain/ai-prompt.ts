// Prompt para montar o plano com uma IA (porta de js/ui/ai-plan.js). O app não conversa com IA
// nenhuma: junta o que sabe num texto que a pessoa copia e cola onde quiser — sem chave, sem
// servidor e sem dado saindo do aparelho por conta própria. As regras e o formato do bloco
// vêm de respostas reais de três modelos (ver CHANGELOG 2.16.0–2.18.0).
import { DAY_KEYS } from './ai-plan';
import type { DateKey } from './dates';
import type { AppData } from './model';
import { healthSummary } from './profile-view';
import { weeklyVolume } from './stats';
import { normalizeExerciseName } from './text';
import { describeEntry, sessionsOf } from './workouts';

export const AI_GOALS = {
  hipertrofia: 'ganhar massa muscular (hipertrofia)',
  emagrecimento: 'emagrecer preservando a massa muscular que já tenho',
  recomposicao: 'perder gordura e ganhar músculo ao mesmo tempo',
  forca: 'ganhar força nos principais movimentos',
  condicionamento: 'melhorar meu condicionamento físico geral'
} as const;
export type AiGoal = keyof typeof AI_GOALS;

export interface AiPromptOptions {
  goal: AiGoal;
  days: number;
  minutes: number;
  notes: string;
  includeHealth: boolean;
  includeCurrent: boolean;
}

const ACTIVITY = { sedentario: 'sedentário', moderado: 'moderado', intenso: 'intenso' } as const;
const fmt = (n: number) => String(n).replace('.', ',');
/** 2026-10-07 → 07/10/2026 */
const br = (d: DateKey) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

/** Objetivo sugerido pela distância até o peso desejado (só um ponto de partida). */
export function suggestedGoal(data: AppData): AiGoal {
  const p = data.profile;
  const weight = p.weighIns.at(-1)?.weight ?? p.weightKg;
  const target = p.weightGoal?.targetWeight ?? p.targetWeightKg;
  if (!weight || !target) return 'hipertrofia';
  return target < weight - 1 ? 'emagrecimento' : target > weight + 1 ? 'hipertrofia' : 'recomposicao';
}

export function trainingDaysOfActive(data: AppData): number {
  const plan = data.activePlanId ? data.plans[data.activePlanId] : undefined;
  return (plan && DAY_KEYS.filter(k => plan.days[k].exercises.length > 0).length) || 3;
}

/** Plano atual com as cargas REAIS do histórico, não as metas cadastradas. */
function currentPlanLines(data: AppData): string[] {
  const plan = data.activePlanId ? data.plans[data.activePlanId] : undefined;
  if (!plan) return [];
  const out: string[] = [];
  for (const k of DAY_KEYS) {
    const day = plan.days[k];
    if (!day.exercises.length) continue;
    out.push(`${day.name || k}${day.focus ? ` — foco: ${day.focus}` : ''}`);
    for (const ex of day.exercises) {
      if (!ex.name.trim()) continue;
      const last = sessionsOf(data.workouts, normalizeExerciseName(ex.name)).at(-1);
      const detail = last ? `${describeEntry(last.entry)} (última vez em ${br(last.workout.date)})`
        : ex.mode === 'cardio' ? `${ex.minutes}min${ex.km ? ` · ${fmt(ex.km)}km` : ''} (ainda não registrado)`
        : `${ex.sets}x${ex.mode === 'time' ? `${ex.seconds ?? 30}s` : ex.reps}${ex.weight ? ` · ${fmt(ex.weight)}kg` : ''} (ainda não registrado)`;
      out.push(`  - ${ex.name}: ${detail}`);
    }
    out.push('');
  }
  while (out.at(-1) === '') out.pop();
  return out;
}

const BLOCK_EXAMPLE = [
  '[PLANO]',
  'DIA | SEG | Push A | Peito, Ombros e Tríceps',
  'EX | Supino Reto com Barra | forca | 4 | 8 | | Supino Reto com Halteres',
  'EX | Elevação Lateral com Halteres | forca | 4 | 12 | |',
  'EX | Prancha Abdominal | tempo | 3 | 45 | |',
  'DIA | TER | Pull A | Costas e Bíceps',
  'EX | Puxada Frontal na Polia | forca | 4 | 8 | |',
  '[FIM]'
];

const BLOCK_RULES = [
  'Regras do bloco:',
  '- Coloque o bloco inteiro dentro de ``` para as quebras de linha não se perderem.',
  '- Uma linha DIA para cada dia de treino, seguida das linhas EX daquele dia.',
  '- Dias de descanso não entram no bloco.',
  '- O dia da semana é uma destas siglas: SEG, TER, QUA, QUI, SEX, SAB, DOM.',
  '- Campos de DIA, nesta ordem: sigla | nome do treino | foco muscular',
  '- Campos de EX, nesta ordem: nome | tipo | séries | repetições | carga | alternativa mais segura',
  '- O tipo é "forca", "tempo" (exercícios contados em segundos, como prancha) ou "cardio" (contados em minutos).',
  '- Nos tipos "tempo" e "cardio", o campo de repetições recebe os segundos ou os minutos.',
  '- A carga vai em kg, ou fica vazia quando for para definir na prática.',
  '- A alternativa mais segura repete, aqui dentro, a mesma que você citou no plano legível; deixe vazia quando não houver.',
  '- Não use o caractere | dentro dos nomes, e não escreva mais nada dentro do bloco.'
];

export function buildAiPrompt(data: AppData, o: AiPromptOptions, now: Date): string {
  const days = Math.min(7, Math.max(1, Math.round(o.days) || 3));
  const minutes = Math.max(10, Math.round(o.minutes) || 60);
  const notes = o.notes.trim();
  const dias = `${days} ${days === 1 ? 'dia' : 'dias'}`;
  const L: string[] = ['Quero que você monte um plano de treino de musculação para mim.', ''];

  if (o.includeHealth) {
    const p = data.profile;
    const h = healthSummary(p, now);
    const target = p.weightGoal?.targetWeight ?? p.targetWeightKg;
    const d: string[] = [];
    if (h.age !== null) d.push(`- Idade: ${h.age} anos`);
    if (p.sex) d.push(`- Sexo: ${p.sex}`);
    if (p.heightCm) d.push(`- Altura: ${fmt(p.heightCm)} cm`);
    if (h.weightKg) d.push(`- Peso atual: ${fmt(h.weightKg)} kg`);
    if (target) d.push(`- Peso que quero atingir: ${fmt(target)} kg`);
    if (h.bmi && h.bmiClass) d.push(`- IMC: ${fmt(Math.round(h.bmi * 10) / 10)} (${h.bmiClass.label.toLowerCase()})`);
    if (p.bodyFatPercent) d.push(`- Gordura corporal: ${fmt(p.bodyFatPercent)}%`);
    d.push(`- Nível de atividade no dia a dia: ${ACTIVITY[p.activityLevel] ?? 'moderado'}`);
    if (h.tdee && h.tmb) d.push(`- Gasto calórico diário estimado: ${h.tdee} kcal (metabolismo basal ${h.tmb} kcal)`);
    L.push('## SOBRE MIM', ...d, '');
  }

  L.push('## MEU OBJETIVO', `Quero ${AI_GOALS[o.goal]}.`, '');
  L.push('## MINHA DISPONIBILIDADE', `- ${dias} de treino por semana`, `- Cerca de ${minutes} minutos por treino`, '');

  let hasCurrent = false;
  if (o.includeCurrent) {
    const plan = currentPlanLines(data);
    hasCurrent = plan.length > 0;
    if (hasCurrent) {
      L.push('## O QUE EU TREINO HOJE', ...plan, '');
      L.push('Onde aparece uma data, essa é a carga que eu realmente usei da última vez. Onde está escrito "ainda não registrado", é a carga que está planejada mas que eu ainda não confirmei na prática.', '');
    }
    const volume = weeklyVolume(data, now, 4).filter(w => w.workouts > 0);
    if (volume.length) {
      L.push('## MEU VOLUME DAS ÚLTIMAS SEMANAS');
      for (const w of volume) {
        L.push(`- ${br(w.start).slice(0, 5)} a ${br(w.end).slice(0, 5)}: ${w.volume.toLocaleString('pt-BR')} kg levantados em ${w.workouts} ${w.workouts === 1 ? 'treino' : 'treinos'}`);
      }
      L.push('');
    }
  }

  L.push('## OBSERVAÇÕES IMPORTANTES');
  // Sem observações a IA não sabe de lesão nenhuma: o prompt pede o cuidado no lugar da pessoa.
  L.push(notes || 'Não informei limitações físicas. Parta do princípio de que você não sabe nada sobre lesões, dores ou restrições que eu possa ter: para todo exercício que exija mais técnica ou que carregue mais a coluna, o joelho ou o ombro, avise e ofereça uma alternativa mais segura.');
  L.push('');

  L.push('## O QUE EU PRECISO QUE VOCÊ FAÇA', `Monte um plano semanal com ${dias} de treino.`, '');
  L.push('Primeiro escreva o plano de forma legível, dia a dia, com:',
    '- o dia da semana, um nome curto para o treino e o foco muscular',
    '- a lista de exercícios, cada um com o número de séries e de repetições',
    '- uma frase explicando por que você dividiu a semana desse jeito', '');
  const rules: string[] = [];
  if (hasCurrent) rules.push('NÃO invente cargas para os exercícios que eu já faço — mantenha as que eu já venho usando.');
  rules.push('Para exercícios novos, não chute um peso: escreva "definir na prática" e explique em uma linha como eu encontro a carga certa.');
  rules.push('Use UM número de repetições por exercício, nunca uma faixa. Em vez de "8 a 10 repetições", escreva 8.');
  rules.push(`Distribua os exercícios para caberem nos ${minutes} minutos que eu tenho: cada série consome cerca de 2 minutos entre execução e descanso, e reserve 10 minutos para aquecimento.`);
  rules.push(notes ? 'Respeite as limitações, lesões e equipamentos que eu citei nas observações.'
    : 'Trate as observações acima como parte do pedido: aponte os exercícios mais exigentes e ofereça alternativa para cada um.');
  rules.push('Use os nomes de exercícios como são conhecidos em academia no Brasil.');
  rules.push('Se algum dado meu indicar que eu deveria falar com um médico ou educador físico antes de começar, me diga isso primeiro.');
  L.push('Siga estas regras:', ...rules.map((r, i) => `${i + 1}. ${r}`), '');

  L.push('Por último, repita o plano inteiro no formato abaixo, DENTRO de um bloco de código (```), para eu conseguir importar no meu app:');
  L.push('Se você não conseguir seguir esse formato, não invente um bloco incompleto: responda exatamente "NÃO CONSEGUI GERAR BLOCO IMPORTÁVEL: " e explique o motivo em seguida.', '');
  L.push(...BLOCK_EXAMPLE, '', ...BLOCK_RULES);
  return L.join('\n');
}

/** Texto curto para pedir só o bloco de novo, quando a resposta veio sem ele. */
export const AI_FORMAT_REMINDER = 'Repita apenas o plano neste formato:\n[PLANO]\nDIA|SEG|Nome do treino|Foco|\nEX|Nome do exercício|forca|3|10|20|Alternativa opcional|\n[FIM]';
