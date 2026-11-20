// Z1: protocolo de hormônios, peptídeos e medicamentos. Seção opcional, desligada por padrão, só
// de registro: o que a pessoa usa, quanto, quando, onde aplicou, como se sentiu e o que os exames
// mostraram. O app nunca sugere substância nem dose; os nomes da lista servem só para digitar menos.
import { addDays, fromDateKey, type DateKey } from './dates';
import type { DayKey } from './ai-plan';
import { dayKeyOf, DAY_FULL_NAMES, type AppData, type DoseLog, type DoseRoute, type DoseSchedule, type DoseUnit, type HealthEntry, type InjectionSite, type Protocol, type ProtocolItem, type ProtocolKind, type SubstanceCategory } from './model';
import type { ActionResult } from './actions';
import { key, tombstone, touch } from './sync';

export const PROTOCOL_KINDS: readonly { id: ProtocolKind; label: string }[] = [
  { id: 'ciclo', label: 'Ciclo' },
  { id: 'trt', label: 'Reposição hormonal' },
  { id: 'emagrecimento', label: 'Emagrecimento' },
  { id: 'tratamento', label: 'Tratamento' },
  { id: 'outro', label: 'Outro' }
];

export const CATEGORIES: readonly { id: SubstanceCategory; label: string }[] = [
  { id: 'hormonio', label: 'Hormônio' },
  { id: 'peptideo', label: 'Peptídeo' },
  { id: 'medicamento', label: 'Medicamento' },
  { id: 'suplemento', label: 'Suplemento' }
];

export const ROUTES: readonly { id: DoseRoute; label: string; short: string }[] = [
  { id: 'im', label: 'Intramuscular', short: 'IM' },
  { id: 'sc', label: 'Subcutânea', short: 'SC' },
  { id: 'oral', label: 'Oral', short: 'oral' },
  { id: 'topico', label: 'Tópico (gel, creme)', short: 'tópico' },
  { id: 'outra', label: 'Outra', short: 'outra' }
];

export const UNITS: readonly DoseUnit[] = ['mg', 'mcg', 'UI', 'ml', 'comprimido', 'gota'];

export const SITES: readonly { id: InjectionSite; label: string; routes: DoseRoute[] }[] = [
  { id: 'gluteo-e', label: 'Glúteo esquerdo', routes: ['im'] },
  { id: 'gluteo-d', label: 'Glúteo direito', routes: ['im'] },
  { id: 'coxa-e', label: 'Coxa esquerda', routes: ['im', 'sc'] },
  { id: 'coxa-d', label: 'Coxa direita', routes: ['im', 'sc'] },
  { id: 'deltoide-e', label: 'Ombro esquerdo', routes: ['im'] },
  { id: 'deltoide-d', label: 'Ombro direito', routes: ['im'] },
  { id: 'abdome-e', label: 'Abdome, lado esquerdo', routes: ['sc'] },
  { id: 'abdome-d', label: 'Abdome, lado direito', routes: ['sc'] },
  { id: 'outro', label: 'Outro local', routes: ['im', 'sc'] }
];

/** Nomes comuns, só para completar a digitação (sem dose nenhuma). */
export const COMMON_SUBSTANCES: readonly string[] = [
  'Testosterona (enantato)', 'Testosterona (cipionato)', 'Testosterona (propionato)', 'Testosterona (undecilato)', 'Testosterona em gel',
  'Nandrolona (decanoato)', 'Boldenona', 'Trembolona', 'Drostanolona', 'Oxandrolona', 'Estanozolol', 'Metandrostenolona', 'Oximetolona',
  'HCG (gonadotrofina)', 'Somatropina (GH)', 'Anastrozol', 'Letrozol', 'Exemestano', 'Tamoxifeno', 'Clomifeno', 'Cabergolina',
  'Semaglutida', 'Tirzepatida', 'Liraglutida', 'BPC-157', 'TB-500', 'Ipamorelina', 'CJC-1295',
  'Finasterida', 'Dutasterida', 'Metformina', 'Levotiroxina', 'Ômega 3', 'Vitamina D', 'Creatina'
];

export const SYMPTOMS: readonly string[] = [
  'Acne', 'Retenção de líquido', 'Insônia', 'Irritabilidade', 'Ansiedade', 'Humor para baixo', 'Libido alta', 'Libido baixa',
  'Dor no local da aplicação', 'Dor de cabeça', 'Sensibilidade no mamilo', 'Queda de cabelo', 'Suor noturno', 'Cansaço',
  'Falta de ar', 'Náusea', 'Pouco apetite', 'Muito apetite', 'Prisão de ventre', 'Palpitação'
];

/** Exames de sangue comuns, com a unidade em que os laboratórios costumam dar o resultado. */
export const EXAM_MARKERS: readonly { name: string; unit: string }[] = [
  { name: 'Testosterona total', unit: 'ng/dL' }, { name: 'Testosterona livre', unit: 'ng/dL' }, { name: 'Estradiol', unit: 'pg/mL' },
  { name: 'LH', unit: 'mUI/mL' }, { name: 'FSH', unit: 'mUI/mL' }, { name: 'Prolactina', unit: 'ng/mL' }, { name: 'SHBG', unit: 'nmol/L' },
  { name: 'Hematócrito', unit: '%' }, { name: 'Hemoglobina', unit: 'g/dL' }, { name: 'TGO (AST)', unit: 'U/L' }, { name: 'TGP (ALT)', unit: 'U/L' },
  { name: 'GGT', unit: 'U/L' }, { name: 'Colesterol HDL', unit: 'mg/dL' }, { name: 'Colesterol LDL', unit: 'mg/dL' }, { name: 'Triglicerídeos', unit: 'mg/dL' },
  { name: 'Glicemia de jejum', unit: 'mg/dL' }, { name: 'Hemoglobina glicada', unit: '%' }, { name: 'Creatinina', unit: 'mg/dL' },
  { name: 'PSA total', unit: 'ng/mL' }, { name: 'TSH', unit: 'µUI/mL' }, { name: 'IGF-1', unit: 'ng/mL' }
];

export const MAX_NAME = 60;
export const MAX_NOTE = 300;
export const MAX_ITEMS = 12;
export const MAX_DOSE = 100_000;
/** Z3: até 6 doses no mesmo dia. */
export const MAX_TIMES_PER_DAY = 6;
/** Z3: unidades em que a concentração por ml faz sentido. */
export const CONCENTRATION_UNITS: readonly DoseUnit[] = ['mg', 'mcg', 'UI'];

const cloneSync = (data: AppData) => ({ changed: { ...data.sync.changed }, deleted: { ...data.sync.deleted } });
const daysBetween = (a: DateKey, b: DateKey) => Math.round((fromDateKey(b).getTime() - fromDateKey(a).getTime()) / 86_400_000);
const clean = (s: string | undefined, max: number) => s?.trim().slice(0, max) || undefined;
const DAY_ORDER: readonly DayKey[] = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'];

const kindLabel = (k: ProtocolKind) => PROTOCOL_KINDS.find(x => x.id === k)?.label ?? 'Protocolo';
export const routeLabel = (r: DoseRoute) => ROUTES.find(x => x.id === r)?.label ?? 'Outra';
export const routeShort = (r: DoseRoute) => ROUTES.find(x => x.id === r)?.short ?? 'outra';
export const siteLabel = (s: InjectionSite) => SITES.find(x => x.id === s)?.label ?? 'Outro local';
export const protocolKindLabel = kindLabel;
export const isInjection = (r: DoseRoute) => r === 'im' || r === 'sc';

/** "250 mg", "0,5 ml", "1 comprimido", "2 gotas". */
export function doseText(dose: number, unit: DoseUnit): string {
  const n = String(Math.round(dose * 1000) / 1000).replace('.', ',');
  if (unit === 'comprimido' || unit === 'gota') return `${n} ${dose === 1 ? unit : `${unit}s`}`;
  return `${n} ${unit}`;
}

/** "todo dia", "a cada 7 dias", "segunda e quinta"; com várias no dia, "2 vezes por dia". */
export function scheduleText(s: DoseSchedule, times = 1): string {
  const days = 'every' in s ? null : DAY_ORDER.filter(d => s.weekdays.includes(d)).map(d => DAY_FULL_NAMES[d].toLowerCase());
  const base = 'every' in s ? (s.every === 1 ? 'todo dia' : `a cada ${s.every} dias`)
    : days!.length === 7 ? 'todo dia' : days!.length <= 1 ? days![0] ?? 'sem dia' : `${days!.slice(0, -1).join(', ')} e ${days!.at(-1)}`;
  if (times <= 1) return base;
  return base === 'todo dia' ? `${times} vezes por dia` : `${base}, ${times} vezes no dia`;
}

/** Z3: doses no dia previsto (1 quando não informado). */
export const timesOf = (i: Pick<ProtocolItem, 'timesPerDay'>): number => (i.timesPerDay && i.timesPerDay > 1 ? Math.min(MAX_TIMES_PER_DAY, i.timesPerDay) : 1);
/** Z4: horário da dose `slot` do dia ("08:00"), se informado. */
export function doseTime(i: Pick<ProtocolItem, 'times'>, slot: number): { hour: number; minute: number; text: string } | null {
  const m = /^(\d{2}):(\d{2})$/.exec(i.times?.[slot] ?? '');
  if (!m) return null;
  const hour = Number(m[1]), minute = Number(m[2]);
  return hour <= 23 && minute <= 59 ? { hour, minute, text: `${m[1]}:${m[2]}` } : null;
}

/** "às 08:00", "às 08:00 e 20:00" (só os horários informados). */
export function timesText(i: ProtocolItem): string {
  const list = Array.from({ length: timesOf(i) }, (_, k) => doseTime(i, k)?.text).filter((t): t is string => !!t);
  return list.length ? `às ${list.length === 1 ? list[0] : `${list.slice(0, -1).join(', ')} e ${list.at(-1)}`}` : '';
}

export const itemSchedule = (i: ProtocolItem): string => [scheduleText(i.schedule, timesOf(i)), timesText(i)].filter(Boolean).join(' ');
/** "1ª de 2". */
export const slotLabel = (slot: number, of: number) => `${slot + 1}ª de ${of}`;

/** Z3: quantos ml dá uma dose com a concentração do frasco (null sem concentração). */
export function doseVolume(dose: number, unit: DoseUnit, perMl: number | undefined): number | null {
  if (!perMl || perMl <= 0 || !CONCENTRATION_UNITS.includes(unit)) return null;
  return dose / perMl;
}

/** "0,4 ml"; abaixo de 0,1 ml, com três casas. */
export function volumeText(ml: number): string {
  const r = ml < 0.1 ? Math.round(ml * 1000) / 1000 : Math.round(ml * 100) / 100;
  return `${String(r).replace('.', ',')} ml`;
}

/** Marcações na seringa de insulina de 100 unidades (1 ml = 100), de meia em meia. */
export const syringeUnits = (ml: number): number => Math.round(ml * 200) / 2;

/** Z3: concentração a partir da diluição: quanto tem no frasco ÷ ml de diluente. */
export const concentrationFrom = (amount: number, ml: number): number | null => (amount > 0 && ml > 0 ? Math.round((amount / ml) * 1000) / 1000 : null);

/** Último dia do protocolo (encerrado ou previsto). Ausente = contínuo e em andamento. */
export function protocolEnd(p: Protocol): DateKey | undefined {
  if (p.endedOn) return p.endedOn;
  return p.weeks ? addDays(p.startDate, p.weeks * 7 - 1) : undefined;
}

export function isActive(p: Protocol, today: DateKey): boolean {
  const end = protocolEnd(p);
  return p.startDate <= today && !(end && end < today);
}
export const isFuture = (p: Protocol, today: DateKey) => p.startDate > today && !p.endedOn;

/** Primeiro e último dia de uma substância dentro do protocolo. */
function itemWindow(p: Protocol, item: ProtocolItem): { from: DateKey; to: DateKey | undefined } {
  const from = addDays(p.startDate, ((item.fromWeek ?? 1) - 1) * 7);
  const ownEnd = item.toWeek ? addDays(p.startDate, item.toWeek * 7 - 1) : undefined;
  const end = protocolEnd(p);
  const to = ownEnd && end ? (ownEnd < end ? ownEnd : end) : ownEnd ?? end;
  return { from, to };
}

/** A substância tem dose prevista neste dia? */
export function isDue(p: Protocol, item: ProtocolItem, date: DateKey): boolean {
  const { from, to } = itemWindow(p, item);
  if (date < from || (to && date > to)) return false;
  if ('every' in item.schedule) return daysBetween(from, date) % Math.max(1, item.schedule.every) === 0;
  return item.schedule.weekdays.includes(dayKeyOf(fromDateKey(date)));
}

/** Quanto dá por semana, na unidade da dose ("250 mg por semana"). */
export function weeklyAmount(item: ProtocolItem): number {
  const per = 'every' in item.schedule ? 7 / Math.max(1, item.schedule.every) : item.schedule.weekdays.length;
  return Math.round(item.dose * per * timesOf(item) * 100) / 100;
}

export interface ProtocolStatus {
  /** Semana atual (1 = a primeira); 0 antes de começar. */
  week: number;
  totalWeeks: number | null;
  ended: boolean;
  future: boolean;
  end: DateKey | undefined;
  daysLeft: number | null;
}

export function protocolStatus(p: Protocol, today: DateKey): ProtocolStatus {
  const end = protocolEnd(p);
  const future = p.startDate > today;
  const ended = !!end && end < today;
  const last = ended ? end! : today;
  return {
    week: future ? 0 : Math.floor(daysBetween(p.startDate, last) / 7) + 1,
    totalWeeks: p.weeks ?? null,
    ended, future, end,
    daysLeft: end && !ended ? daysBetween(today, end) : null
  };
}

export const doseList = (data: Pick<AppData, 'doses'>): DoseLog[] =>
  Object.values(data.doses ?? {}).sort((a, b) => (a.date !== b.date ? b.date.localeCompare(a.date) : b.at.localeCompare(a.at)));

const takenOn = (data: Pick<AppData, 'doses'>, protocolId: string, itemId: string, date: DateKey, slot = 0) =>
  Object.values(data.doses ?? {}).find(d => d.protocolId === protocolId && d.itemId === itemId && d.date === date && (d.slot ?? 0) === slot);

/** Uma dose prevista: `slot` é qual das `of` doses do dia (0 = a primeira). */
export interface DueDose { protocol: Protocol; item: ProtocolItem; date: DateKey; slot: number; of: number; taken: DoseLog | undefined }

/** Doses previstas num dia, de todos os protocolos, com a registrada (se houver). */
export function dosesDue(data: Pick<AppData, 'protocols' | 'doses'>, date: DateKey): DueDose[] {
  const out: DueDose[] = [];
  for (const p of Object.values(data.protocols ?? {}).sort((a, b) => a.startDate.localeCompare(b.startDate))) {
    for (const item of p.items) {
      if (!isDue(p, item, date)) continue;
      const of = timesOf(item);
      for (let slot = 0; slot < of; slot++) out.push({ protocol: p, item, date, slot, of, taken: takenOn(data, p.id, item.id, date, slot) });
    }
  }
  return out;
}

/** Os próximos dias com dose (sem hoje), até `days` dias à frente. */
export function upcomingDoses(data: Pick<AppData, 'protocols' | 'doses'>, today: DateKey, days = 7): { date: DateKey; doses: DueDose[] }[] {
  const out: { date: DateKey; doses: DueDose[] }[] = [];
  for (let i = 1; i <= days; i++) {
    const date = addDays(today, i);
    const doses = dosesDue(data, date);
    if (doses.length) out.push({ date, doses });
  }
  return out;
}

/** Doses atrasadas: previstas nos últimos `days` dias (sem hoje) e não registradas. */
export function missedDoses(data: Pick<AppData, 'protocols' | 'doses'>, today: DateKey, days = 3): DueDose[] {
  const out: DueDose[] = [];
  for (let i = days; i >= 1; i--) out.push(...dosesDue(data, addDays(today, -i)).filter(d => !d.taken));
  return out;
}

/** Doses previstas até hoje e quantas delas foram registradas. */
export function adherence(data: Pick<AppData, 'doses'>, p: Protocol, today: DateKey): { due: number; taken: number } {
  const end = protocolEnd(p);
  const last = end && end < today ? end : today;
  let due = 0, taken = 0;
  for (let d = p.startDate; d <= last; d = addDays(d, 1)) {
    for (const item of p.items) {
      if (!isDue(p, item, d)) continue;
      for (let slot = 0; slot < timesOf(item); slot++) {
        due++;
        if (takenOn(data, p.id, item.id, d, slot)) taken++;
      }
    }
  }
  return { due, taken };
}

/** Local sugerido para a próxima aplicação: o seguinte ao último usado nesta via. */
export function nextSite(data: Pick<AppData, 'doses'>, route: DoseRoute): InjectionSite | undefined {
  if (!isInjection(route)) return undefined;
  const options = SITES.filter(s => s.routes.includes(route) && s.id !== 'outro').map(s => s.id);
  const last = doseList(data).find(d => d.site && isInjection(d.route) && d.route === route)?.site;
  if (!last) return options[0];
  const i = options.indexOf(last);
  return options[(i + 1) % options.length];
}

export const lastSite = (data: Pick<AppData, 'doses'>, route: DoseRoute): DoseLog | undefined =>
  doseList(data).find(d => d.site && d.route === route);

// ---- ações ----

function validItem(i: ProtocolItem): boolean {
  const schedule = 'every' in i.schedule ? Number.isInteger(i.schedule.every) && i.schedule.every >= 1 && i.schedule.every <= 90 : i.schedule.weekdays.length > 0;
  const weeks = (i.fromWeek === undefined || i.fromWeek >= 1) && (i.toWeek === undefined || i.toWeek >= (i.fromWeek ?? 1));
  const half = i.halfLifeHours === undefined || (i.halfLifeHours >= 0.5 && i.halfLifeHours <= 90 * 24);
  const times = i.timesPerDay === undefined || (Number.isInteger(i.timesPerDay) && i.timesPerDay >= 1 && i.timesPerDay <= MAX_TIMES_PER_DAY);
  const conc = i.perMl === undefined || (i.perMl > 0 && i.perMl <= MAX_DOSE && CONCENTRATION_UNITS.includes(i.unit));
  const clock = i.times === undefined || (i.times.length <= MAX_TIMES_PER_DAY && i.times.every(t => t === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(t)));
  return !!i.name.trim() && i.dose > 0 && i.dose <= MAX_DOSE && UNITS.includes(i.unit) && ROUTES.some(r => r.id === i.route)
    && CATEGORIES.some(c => c.id === i.category) && schedule && weeks && half && times && conc && clock;
}

/** Cria ou atualiza um protocolo. Sem nome, sem substância ou com algum campo fora do lugar: nada muda. */
export function saveProtocol(data: AppData, p: Protocol, now: Date): ActionResult {
  const name = clean(p.name, MAX_NAME);
  if (!name || !p.items.length || p.items.length > MAX_ITEMS || !p.items.every(validItem) || !/^\d{4}-\d{2}-\d{2}$/.test(p.startDate)
    || (p.weeks !== undefined && !(Number.isInteger(p.weeks) && p.weeks >= 1 && p.weeks <= 520))) return { data, events: [] };
  const note = clean(p.note, MAX_NOTE);
  const items = p.items.map(i => {
    const itemNote = clean(i.note, MAX_NOTE);
    const { note: _n, times: _t, ...rest } = i;
    // Z4: um horário por dose do dia; sem nenhum, o campo some
    const times = (i.times ?? []).slice(0, timesOf(i));
    return { ...rest, name: i.name.trim().slice(0, MAX_NAME), ...(itemNote ? { note: itemNote } : {}), ...(times.some(Boolean) ? { times } : {}) };
  });
  const { note: _note, ...base } = p;
  const draft: AppData = { ...data, sync: cloneSync(data) };
  draft.protocols = { ...(data.protocols ?? {}), [p.id]: { ...base, name, items, ...(note ? { note } : {}) } };
  touch(draft, key.protocol(p.id), now);
  return { data: draft, events: [] };
}

/**
 * Encerra hoje (as doses registradas ficam). Protocolo que ainda não começou não se encerra (o
 * certo é apagar ou mudar a data): encerrar no dia do início deixaria um dia de dose sobrando.
 */
export function endProtocol(data: AppData, id: string, today: DateKey, now: Date): ActionResult {
  const p = data.protocols?.[id];
  if (!p || p.startDate > today || (protocolEnd(p) && protocolEnd(p)! < today)) return { data, events: [] };
  return saveProtocol(data, { ...p, endedOn: today }, now);
}

/** Dá para reabrir: foi encerrado à mão e, sem o encerramento, ainda estaria em andamento. */
export function canReopen(p: Protocol, today: DateKey): boolean {
  if (!p.endedOn) return false;
  const { endedOn: _e, ...open } = p;
  return isActive(open, today);
}

/** Desfaz o "Encerrar hoje". */
export function reopenProtocol(data: AppData, id: string, today: DateKey, now: Date): ActionResult {
  const p = data.protocols?.[id];
  if (!p || !canReopen(p, today)) return { data, events: [] };
  const { endedOn: _e, ...open } = p;
  return saveProtocol(data, open, now);
}

/** Id fixo da dose marcada de uma vez: a mesma em qualquer aparelho, então a junção não duplica. */
export const backfillId = (protocolId: string, itemId: string, date: DateKey, slot = 0) => `prev-${protocolId}-${itemId}-${date}${slot ? `-${slot + 1}` : ''}`;
/** Até onde "marcar as anteriores" volta (2 anos). */
const MAX_BACKFILL_DAYS = 730;

/** Quantas doses previstas antes de hoje ainda não têm registro (para a pergunta do editor). */
export function pendingBefore(data: Pick<AppData, 'doses'>, p: Protocol, today: DateKey): number {
  let n = 0;
  const end = protocolEnd(p);
  const from = p.startDate < addDays(today, -MAX_BACKFILL_DAYS) ? addDays(today, -MAX_BACKFILL_DAYS) : p.startDate;
  for (let d = from; d < today && !(end && d > end); d = addDays(d, 1)) {
    for (const item of p.items) {
      if (!isDue(p, item, d)) continue;
      for (let slot = 0; slot < timesOf(item); slot++) if (!takenOn(data, p.id, item.id, d, slot)) n++;
    }
  }
  return n;
}

/**
 * Para quem cadastra um protocolo que já está fazendo: marca como feitas as doses previstas antes
 * de hoje que ainda não têm registro, com a dose do plano. Hoje fica para registrar na hora.
 */
export function backfillDoses(data: AppData, id: string, today: DateKey, now: Date): ActionResult {
  const p = data.protocols?.[id];
  if (!p) return { data, events: [] };
  const end = protocolEnd(p);
  const from = p.startDate < addDays(today, -MAX_BACKFILL_DAYS) ? addDays(today, -MAX_BACKFILL_DAYS) : p.startDate;
  const doses = { ...(data.doses ?? {}) };
  const draft: AppData = { ...data, sync: cloneSync(data) };
  let added = 0;
  for (let d = from; d < today && !(end && d > end); d = addDays(d, 1)) {
    for (const item of p.items) {
      if (!isDue(p, item, d)) continue;
      for (let slot = 0; slot < timesOf(item); slot++) {
        if (takenOn({ doses }, p.id, item.id, d, slot)) continue;
        const doseId = backfillId(p.id, item.id, d, slot);
        const when = fromDateKey(d);
        doses[doseId] = {
          id: doseId, date: d, at: when.toISOString(), name: item.name, dose: item.dose, unit: item.unit, route: item.route, protocolId: p.id, itemId: item.id,
          ...(slot ? { slot } : {}), note: 'marcada ao cadastrar o protocolo'
        };
        touch(draft, key.dose(doseId), now);
        added++;
      }
    }
  }
  if (!added) return { data, events: [] };
  draft.doses = doses;
  return { data: draft, events: [] };
}

/** Apaga o protocolo; as doses já registradas continuam no diário, como avulsas. */
export function deleteProtocol(data: AppData, id: string, now: Date): ActionResult {
  if (!data.protocols?.[id]) return { data, events: [] };
  const draft: AppData = { ...data, sync: cloneSync(data) };
  const { [id]: _gone, ...rest } = data.protocols;
  if (Object.keys(rest).length) draft.protocols = rest; else delete draft.protocols;
  tombstone(draft, key.protocol(id), now);
  return { data: draft, events: [] };
}

export interface DoseInput {
  id: string; date: DateKey; name: string; dose: number; unit: DoseUnit; route: DoseRoute;
  protocolId?: string; itemId?: string; site?: InjectionSite; note?: string;
  /** Z3: qual das doses do dia. */
  slot?: number;
}

/** Monta a dose já limpa; null se algum campo está fora do lugar (ou a data é futura). */
function buildDose(input: DoseInput, at: string, today: DateKey): DoseLog | null {
  const name = clean(input.name, MAX_NAME);
  if (!name || !(input.dose > 0 && input.dose <= MAX_DOSE) || !UNITS.includes(input.unit) || !/^\d{4}-\d{2}-\d{2}$/.test(input.date) || input.date > today) return null;
  const note = clean(input.note, MAX_NOTE);
  return {
    id: input.id, date: input.date, at, name, dose: input.dose, unit: input.unit, route: input.route,
    ...(input.protocolId ? { protocolId: input.protocolId } : {}), ...(input.itemId ? { itemId: input.itemId } : {}),
    ...(input.site && isInjection(input.route) ? { site: input.site } : {}), ...(note ? { note } : {}),
    ...(input.slot ? { slot: input.slot } : {})
  };
}

/** Registra uma dose (do protocolo ou avulsa). Data futura ou dose inválida: nada muda. */
export function logDose(data: AppData, input: DoseInput, now: Date, today: DateKey): ActionResult {
  const log = buildDose(input, now.toISOString(), today);
  if (!log || data.doses?.[input.id]) return { data, events: [] };
  if (input.protocolId && input.itemId && takenOn(data, input.protocolId, input.itemId, input.date, input.slot ?? 0)) return { data, events: [] };
  const draft: AppData = { ...data, sync: cloneSync(data) };
  draft.doses = { ...(data.doses ?? {}), [input.id]: log };
  touch(draft, key.dose(input.id), now);
  return { data: draft, events: [] };
}

export function deleteDose(data: AppData, id: string, now: Date): ActionResult {
  if (!data.doses?.[id]) return { data, events: [] };
  const draft: AppData = { ...data, sync: cloneSync(data) };
  const { [id]: _gone, ...rest } = data.doses;
  if (Object.keys(rest).length) draft.doses = rest; else delete draft.doses;
  tombstone(draft, key.dose(id), now);
  return { data: draft, events: [] };
}

/**
 * Z6: corrige uma dose registrada (dia, dose, unidade, via, local, nota; o nome só na avulsa). Continua
 * ligada ao mesmo item e à mesma dose do dia; se o dia novo já tem essa dose registrada, nada muda.
 */
export function updateDose(data: AppData, id: string, patch: Pick<DoseInput, 'date' | 'dose' | 'unit' | 'route' | 'name'> & { site?: InjectionSite; note?: string }, now: Date, today: DateKey): ActionResult {
  const old = data.doses?.[id];
  if (!old) return { data, events: [] };
  const log = buildDose({
    id, ...patch, name: old.protocolId ? old.name : patch.name,
    ...(old.protocolId ? { protocolId: old.protocolId } : {}), ...(old.itemId ? { itemId: old.itemId } : {}), ...(old.slot ? { slot: old.slot } : {})
  }, old.at, today);
  if (!log) return { data, events: [] };
  if (old.protocolId && old.itemId) {
    const other = takenOn(data, old.protocolId, old.itemId, log.date, old.slot ?? 0);
    if (other && other.id !== id) return { data, events: [] };
  }
  const draft: AppData = { ...data, sync: cloneSync(data) };
  draft.doses = { ...data.doses, [id]: log };
  touch(draft, key.dose(id), now);
  return { data: draft, events: [] };
}

/** Limpa um registro do diário; null se estiver vazio ou fora do lugar. */
function normalizeHealth(e: HealthEntry, today: DateKey): HealthEntry | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date) || e.date > today) return null;
  const text = clean(e.text, MAX_NOTE);
  const symptoms = (e.symptoms ?? []).map(s => s.trim().slice(0, MAX_NAME)).filter(Boolean);
  const exam = (e.exam ?? []).map(x => ({ name: x.name.trim().slice(0, MAX_NAME), value: x.value, unit: x.unit.trim().slice(0, 12) }))
    .filter(x => x.name && Number.isFinite(x.value) && x.value >= 0);
  const p = e.pressure;
  const pressure = p && p.sys >= 50 && p.sys <= 300 && p.dia >= 30 && p.dia <= 200 && p.dia < p.sys
    ? { sys: Math.round(p.sys), dia: Math.round(p.dia), ...(p.pulse && p.pulse >= 20 && p.pulse <= 250 ? { pulse: Math.round(p.pulse) } : {}) } : undefined;
  const ok = e.kind === 'sintomas' ? symptoms.length > 0 || !!text : e.kind === 'pressao' ? !!pressure : e.kind === 'exame' ? exam.length > 0 : !!text;
  if (!ok) return null;
  return {
    id: e.id, date: e.date, kind: e.kind, ...(text ? { text } : {}),
    ...(e.kind === 'sintomas' && symptoms.length ? { symptoms } : {}),
    ...(e.kind === 'pressao' && pressure ? { pressure } : {}),
    ...(e.kind === 'exame' ? { exam } : {})
  };
}

/** Registra sintomas, pressão, exame ou nota. Registro vazio ou fora do lugar: nada muda. */
export function addHealthEntry(data: AppData, e: HealthEntry, now: Date, today: DateKey): ActionResult {
  const entry = data.healthLog?.[e.id] ? null : normalizeHealth(e, today);
  if (!entry) return { data, events: [] };
  const draft: AppData = { ...data, sync: cloneSync(data) };
  draft.healthLog = { ...(data.healthLog ?? {}), [e.id]: entry };
  touch(draft, key.health(e.id), now);
  return { data: draft, events: [] };
}

/** Z6: corrige um registro do diário (o tipo não muda). Vazio ou fora do lugar: nada muda. */
export function updateHealthEntry(data: AppData, e: HealthEntry, now: Date, today: DateKey): ActionResult {
  const old = data.healthLog?.[e.id];
  const entry = old && old.kind === e.kind ? normalizeHealth(e, today) : null;
  if (!entry) return { data, events: [] };
  const draft: AppData = { ...data, sync: cloneSync(data) };
  draft.healthLog = { ...data.healthLog, [e.id]: entry };
  touch(draft, key.health(e.id), now);
  return { data: draft, events: [] };
}

export function deleteHealthEntry(data: AppData, id: string, now: Date): ActionResult {
  if (!data.healthLog?.[id]) return { data, events: [] };
  const draft: AppData = { ...data, sync: cloneSync(data) };
  const { [id]: _gone, ...rest } = data.healthLog;
  if (Object.keys(rest).length) draft.healthLog = rest; else delete draft.healthLog;
  tombstone(draft, key.health(id), now);
  return { data: draft, events: [] };
}

/** Apaga tudo o que é do protocolo (protocolos, doses e diário), com exclusão sincronizada. */
export function clearProtocolData(data: AppData, now: Date): ActionResult {
  if (!data.protocols && !data.doses && !data.healthLog) return { data, events: [] };
  const draft: AppData = { ...data, sync: cloneSync(data) };
  Object.keys(data.protocols ?? {}).forEach(id => tombstone(draft, key.protocol(id), now));
  Object.keys(data.doses ?? {}).forEach(id => tombstone(draft, key.dose(id), now));
  Object.keys(data.healthLog ?? {}).forEach(id => tombstone(draft, key.health(id), now));
  delete draft.protocols; delete draft.doses; delete draft.healthLog;
  return { data: draft, events: [] };
}

// ---- leitura do diário ----

export const healthList = (data: Pick<AppData, 'healthLog'>): HealthEntry[] =>
  Object.values(data.healthLog ?? {}).sort((a, b) => b.date.localeCompare(a.date));

/** Cada marcador de exame com o último valor e o anterior (para ver para onde foi). */
export function examMarkers(data: Pick<AppData, 'healthLog'>): { name: string; unit: string; last: { date: DateKey; value: number }; previous?: { date: DateKey; value: number } }[] {
  const by = new Map<string, { name: string; unit: string; values: { date: DateKey; value: number }[] }>();
  for (const e of healthList(data).filter(x => x.kind === 'exame')) {
    for (const m of e.exam ?? []) {
      const k = m.name.toLowerCase();
      const cur = by.get(k) ?? { name: m.name, unit: m.unit, values: [] };
      cur.values.push({ date: e.date, value: m.value });
      by.set(k, cur);
    }
  }
  return [...by.values()].map(m => ({ name: m.name, unit: m.unit, last: m.values[0]!, ...(m.values[1] ? { previous: m.values[1] } : {}) }));
}

export const lastExamDate = (data: Pick<AppData, 'healthLog'>): DateKey | undefined => healthList(data).find(e => e.kind === 'exame')?.date;

/** Z5: intervalos oferecidos para refazer os exames, em semanas. */
export const EXAM_INTERVALS: readonly number[] = [4, 6, 8, 12, 16, 24];

export interface ExamSchedule { last: DateKey | undefined; due: DateKey | undefined; overdue: boolean; daysLeft: number | null }

/** Z5: quando refazer os exames, pelo último registrado e o intervalo escolhido. Sem intervalo ou sem exame: sem data. */
export function examSchedule(data: Pick<AppData, 'healthLog' | 'settings'>, today: DateKey): ExamSchedule {
  const last = lastExamDate(data);
  const weeks = data.settings.examEveryWeeks ?? 0;
  if (!last || weeks <= 0) return { last, due: undefined, overdue: false, daysLeft: null };
  const due = addDays(last, weeks * 7);
  return { last, due, overdue: due <= today, daysLeft: daysBetween(today, due) };
}
export const lastPressure = (data: Pick<AppData, 'healthLog'>): HealthEntry | undefined => healthList(data).find(e => e.kind === 'pressao');

/** Pressão a partir de 14 por 9 (140/90 mmHg): o app só destaca, sem diagnosticar. */
export const pressureHigh = (p: { sys: number; dia: number }) => p.sys >= 140 || p.dia >= 90;

/** Sintomas marcados nos últimos `days` dias, do mais frequente ao menos. */
export function recentSymptoms(data: Pick<AppData, 'healthLog'>, today: DateKey, days = 30): { name: string; count: number }[] {
  const since = addDays(today, -days + 1);
  const count = new Map<string, number>();
  for (const e of healthList(data)) if (e.kind === 'sintomas' && e.date >= since) for (const s of e.symptoms ?? []) count.set(s, (count.get(s) ?? 0) + 1);
  return [...count].map(([name, n]) => ({ name, count: n })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

const fmt = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const dateText = (k: DateKey) => { const d = fromDateKey(k); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };

export function itemLine(item: ProtocolItem): string {
  const weeks = item.fromWeek || item.toWeek ? ` (semanas ${item.fromWeek ?? 1}${item.toWeek ? ` a ${item.toWeek}` : ' em diante'})` : '';
  const weekly = 'every' in item.schedule && item.schedule.every === 7 && timesOf(item) === 1 ? '' : `, ${doseText(weeklyAmount(item), item.unit)} por semana`;
  const ml = doseVolume(item.dose, item.unit, item.perMl);
  const conc = ml !== null ? ` (frasco com ${doseText(item.perMl!, item.unit)}/ml: ${volumeText(ml)} por dose)` : '';
  return `${item.name}: ${doseText(item.dose, item.unit)} ${itemSchedule(item)}, ${routeLabel(item.route).toLowerCase()}${weekly}${conc}${weeks}`;
}

/** Resumo em texto para levar à consulta (copiar e colar). */
export function doctorSummary(data: Pick<AppData, 'protocols' | 'doses' | 'healthLog'>, today: DateKey): string {
  const lines: string[] = [`Resumo do protocolo, ${dateText(today)}`];
  const protocols = Object.values(data.protocols ?? {}).sort((a, b) => b.startDate.localeCompare(a.startDate));
  const current = protocols.filter(p => isActive(p, today) || isFuture(p, today));
  const past = protocols.filter(p => !current.includes(p));
  const describe = (p: Protocol) => {
    const s = protocolStatus(p, today);
    const when = s.future ? `começa em ${dateText(p.startDate)}` : s.ended ? `de ${dateText(p.startDate)} a ${dateText(s.end!)}` : `desde ${dateText(p.startDate)}, semana ${s.week}${s.totalWeeks ? ` de ${s.totalWeeks}` : ''}`;
    const a = adherence(data, p, today);
    lines.push('', `${p.name} (${kindLabel(p.kind).toLowerCase()}, ${when})`);
    p.items.forEach(i => lines.push(`- ${itemLine(i)}`));
    if (a.due) lines.push(`Doses registradas: ${a.taken} de ${a.due} previstas`);
    if (p.note) lines.push(`Obs.: ${p.note}`);
  };
  if (current.length) { lines.push('', 'EM USO'); current.forEach(describe); }
  if (past.length) { lines.push('', 'ANTERIORES'); past.slice(0, 3).forEach(describe); }
  const loose = doseList(data).filter(d => !d.protocolId && d.date >= addDays(today, -29));
  if (loose.length) {
    lines.push('', 'DOSES AVULSAS (30 DIAS)');
    loose.forEach(d => lines.push(`- ${dateText(d.date)}: ${d.name} ${doseText(d.dose, d.unit)}, ${routeLabel(d.route).toLowerCase()}`));
  }
  const markers = examMarkers(data);
  if (markers.length) {
    lines.push('', 'EXAMES (ÚLTIMO RESULTADO)');
    markers.forEach(m => lines.push(`- ${m.name}: ${fmt(m.last.value)} ${m.unit} em ${dateText(m.last.date)}${m.previous ? ` (antes ${fmt(m.previous.value)} em ${dateText(m.previous.date)})` : ''}`));
  }
  const bp = healthList(data).filter(e => e.kind === 'pressao').slice(0, 5);
  if (bp.length) {
    lines.push('', 'PRESSÃO');
    bp.forEach(e => lines.push(`- ${dateText(e.date)}: ${e.pressure!.sys}/${e.pressure!.dia} mmHg${e.pressure!.pulse ? `, pulso ${e.pressure!.pulse}` : ''}`));
  }
  const symptoms = recentSymptoms(data, today);
  if (symptoms.length) lines.push('', `SINTOMAS (30 DIAS): ${symptoms.map(s => `${s.name.toLowerCase()} (${s.count}x)`).join(', ')}`);
  const notes = healthList(data).filter(e => e.text && e.kind !== 'exame' && e.date >= addDays(today, -29));
  if (notes.length) { lines.push('', 'ANOTAÇÕES (30 DIAS)'); notes.forEach(e => lines.push(`- ${dateText(e.date)}: ${e.text}`)); }
  lines.push('', 'Registro feito pela própria pessoa no app Treino Personalizado.');
  return lines.join('\n');
}

export const hasProtocolData = (data: Pick<AppData, 'protocols' | 'doses' | 'healthLog'>) => !!(data.protocols || data.doses || data.healthLog);

/** Unidade sugerida de um marcador de exame conhecido. */
export const markerUnit = (name: string) => EXAM_MARKERS.find(m => m.name.toLowerCase() === name.trim().toLowerCase())?.unit;
