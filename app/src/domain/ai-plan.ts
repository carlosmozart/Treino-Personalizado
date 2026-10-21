// Leitura do plano devolvido pela IA no formato combinado no prompt:
//   [PLANO]
//   DIA|SEG|Nome do dia|Foco|
//   EX|Nome|forca|séries|reps-ou-tempo|carga|alternativa|
//   [FIM]
// Tolerante só a variações previsíveis; prosa livre é recusada (o usuário vê o trecho cru).

export const DAY_KEYS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'] as const;
export type DayKey = (typeof DAY_KEYS)[number];

export type AiExerciseKind = 'forca' | 'tempo' | 'cardio';
const KINDS: readonly AiExerciseKind[] = ['forca', 'tempo', 'cardio'];

export interface AiExercise {
  nome: string;
  tipo: AiExerciseKind;
  series: number;
  /** Repetições (força), segundos (tempo) ou minutos (cardio). Numa faixa, o topo. */
  valor: number;
  /** Força com faixa ("8-12"): o mínimo; o topo fica em `valor`. */
  valorMin?: number;
  carga: number;
  alternativa: string;
  /** M34: na revisão, o porquê da mudança (7º campo, opcional). */
  motivo?: string;
}

export interface AiDay {
  dia: DayKey;
  nome: string;
  foco: string;
  exercicios: AiExercise[];
}

export interface AiPlan {
  dias: AiDay[];
  avisos: string[];
}

const isDayKey = (value: string): value is DayKey => (DAY_KEYS as readonly string[]).includes(value);

/**
 * Trechos entre PLANO e FIM. Aceita [PLANO], =PLANO= e ===PLANO===: o markdown de alguns chats
 * "mastiga" linhas de sinais de igual.
 */
export function extractPlanBlocks(text: string): string[] {
  const blocks: string[] = [];
  const re = /[=[\s]*\bPLANO\b[=\]\s]*/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const rest = text.slice(match.index + match[0].length);
    const end = rest.match(/[=[\s/]*\bFIM\b[=\]\s]*/);
    blocks.push(end ? rest.slice(0, end.index) : rest);
  }
  return blocks;
}

export function parsePlanBlock(block: string): AiPlan {
  const days: (AiDay | null)[] = [];
  const avisos: string[] = [];
  // DIA e EX delimitam os registros, não a quebra de linha: há IAs que devolvem o bloco numa
  // linha só. Aceita "DIA|", "DIA:" e "EX -", mantendo os campos separados por |.
  const parts = block.split(/(?:^|\s)(DIA|EX)\s*(?:\||:|-)\s*/i);

  for (let i = 1; i < parts.length - 1; i += 2) {
    const marker = parts[i]!.toUpperCase();
    const fields = String(parts[i + 1]).split('|').map(f => f.trim());
    while (fields.length && fields[fields.length - 1] === '') fields.pop();

    if (marker === 'DIA') {
      const key = (fields[0] ?? '').toUpperCase().slice(0, 3);
      if (!isDayKey(key)) {
        avisos.push(`Dia não reconhecido: "${fields[0] ?? ''}" — ignorado.`);
        days.push(null); // os EX seguintes ficam fora até o próximo dia válido
        continue;
      }
      days.push({ dia: key, nome: fields[1] ?? '', foco: fields[2] ?? '', exercicios: [] });
      continue;
    }

    const current = days.length ? days[days.length - 1] : null;
    const nome = fields[0] ?? '';
    if (!current) { avisos.push(`"${nome}" veio antes de qualquer dia — ignorado.`); continue; }
    if (!nome) { avisos.push('Um exercício veio sem nome e foi ignorado.'); continue; }

    let tipo = (fields[1] || 'forca').toLowerCase() as AiExerciseKind;
    if (!KINDS.includes(tipo)) {
      avisos.push(`Tipo desconhecido em "${nome}" (${fields[1] || 'vazio'}) — tratado como força.`);
      tipo = 'forca';
    }
    const num = (index: number, fallback: number) => {
      if (fields.length <= index) return fallback;
      // o primeiro número do campo ("40kg", "30-45"): juntar todos os dígitos faria "30-45" virar 3045
      const n = Number.parseFloat((/\d+(?:[.,]\d+)?/.exec(String(fields[index]))?.[0] ?? '').replace(',', '.'));
      return Number.isFinite(n) && n > 0 ? Math.round(n) : fallback;
    };
    const exercise: AiExercise = {
      nome, tipo, series: num(2, 3), valor: num(3, 10), carga: num(4, 0), alternativa: (fields[5] ?? '').trim()
    };
    if (fields[6]?.trim()) exercise.motivo = fields[6].trim();
    // faixa "8-12", "8–12" ou "8 a 12" (o pedido de conversão aceita); sem isso o "8-12" viraria 812
    const range = tipo === 'forca' ? /^(\d+)\s*(?:-|–|a|até)\s*(\d+)/i.exec(fields[3] ?? '') : null;
    if (range) {
      const a = Number(range[1]), b = Number(range[2]);
      if (a > 0 && b > 0) { exercise.valor = Math.max(a, b); if (a !== b) exercise.valorMin = Math.min(a, b); }
    }
    current.exercicios.push(exercise);
  }

  return { dias: days.filter((d): d is AiDay => !!d && d.exercicios.length > 0), avisos };
}

/**
 * Plano lido do texto da IA, ou null se nenhum bloco tiver exercícios. Com mais de um bloco,
 * vale o maior: o próprio prompt traz um exemplo curto, e quem cola a conversa inteira não pode
 * acabar importando o exemplo.
 */
export function parseAiPlan(text: string | null | undefined): AiPlan | null {
  let best: AiPlan | null = null;
  let bestCount = 0;
  for (const block of extractPlanBlocks(text ?? '')) {
    const plan = parsePlanBlock(block);
    const count = plan.dias.reduce((total, d) => total + d.exercicios.length, 0);
    if (count > bestCount) { best = plan; bestCount = count; }
  }
  return best;
}
