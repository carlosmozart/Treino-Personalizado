// W10: atividades e recuperação fora da musculação (futebol, corrida, sauna, alongamento...), com
// duração. Aparecem no histórico e na faixa da semana; não dão XP nem contam como treino. Com o
// ajuste ligado, o dia com atividade não quebra a sequência (como um dia de descanso).
import type { DateKey } from './dates';
import type { Activity, ActivityKind, AppData } from './model';
import type { ActionResult } from './actions';
import { key, tombstone, touch } from './sync';

export const ACTIVITY_KINDS: readonly { id: ActivityKind; label: string; group: 'atividade' | 'recuperacao' }[] = [
  { id: 'corrida', label: 'Corrida', group: 'atividade' },
  { id: 'caminhada', label: 'Caminhada', group: 'atividade' },
  { id: 'bicicleta', label: 'Bicicleta', group: 'atividade' },
  { id: 'futebol', label: 'Futebol', group: 'atividade' },
  { id: 'padel', label: 'Padel', group: 'atividade' },
  { id: 'natacao', label: 'Natação', group: 'atividade' },
  { id: 'luta', label: 'Luta', group: 'atividade' },
  { id: 'danca', label: 'Dança', group: 'atividade' },
  { id: 'alongamento', label: 'Alongamento', group: 'recuperacao' },
  { id: 'yoga', label: 'Yoga', group: 'recuperacao' },
  { id: 'sauna', label: 'Sauna', group: 'recuperacao' },
  { id: 'massagem', label: 'Massagem', group: 'recuperacao' },
  { id: 'outra', label: 'Outra', group: 'atividade' }
];

export const MAX_ACTIVITY_MINUTES = 600;
export const MAX_ACTIVITY_NOTE = 80;

export const activityLabel = (a: Pick<Activity, 'kind' | 'note'>): string =>
  a.kind === 'outra' && a.note ? a.note : ACTIVITY_KINDS.find(k => k.id === a.kind)?.label ?? 'Atividade';

/** "45 min" ou "1 h 30". */
export function durationText(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
}

const cloneSync = (data: AppData) => ({ changed: { ...data.sync.changed }, deleted: { ...data.sync.deleted } });

/** Registra uma atividade num dia (hoje ou passado). Minutos fora de 1 a 600 ou data futura: nada muda. */
export function addActivity(data: AppData, input: { id: string; date: DateKey; kind: ActivityKind; minutes: number; note?: string }, now: Date, today: DateKey): ActionResult {
  const minutes = Math.round(input.minutes);
  if (!ACTIVITY_KINDS.some(k => k.id === input.kind) || !(minutes >= 1 && minutes <= MAX_ACTIVITY_MINUTES) || input.date > today || data.activities?.[input.id]) return { data, events: [] };
  const note = input.note?.trim().slice(0, MAX_ACTIVITY_NOTE);
  const draft: AppData = { ...data, sync: cloneSync(data) };
  draft.activities = { ...(data.activities ?? {}), [input.id]: { id: input.id, date: input.date, kind: input.kind, minutes, ...(note ? { note } : {}) } };
  touch(draft, key.activity(input.id), now);
  return { data: draft, events: [] };
}

export function deleteActivity(data: AppData, id: string, now: Date): ActionResult {
  if (!data.activities?.[id]) return { data, events: [] };
  const draft: AppData = { ...data, sync: cloneSync(data) };
  const { [id]: _gone, ...rest } = data.activities;
  if (Object.keys(rest).length) draft.activities = rest; else delete draft.activities;
  tombstone(draft, key.activity(id), now);
  return { data: draft, events: [] };
}

/** As atividades de um dia, na ordem em que foram registradas. */
export const activitiesOn = (data: Pick<AppData, 'activities'>, date: DateKey): Activity[] =>
  Object.values(data.activities ?? {}).filter(a => a.date === date);

/** Por mês ("2026-11"), da mais recente para a mais antiga. */
export function activitiesByMonth(data: Pick<AppData, 'activities'>): Map<string, Activity[]> {
  const out = new Map<string, Activity[]>();
  for (const a of Object.values(data.activities ?? {}).sort((x, y) => y.date.localeCompare(x.date))) {
    const month = a.date.slice(0, 7);
    out.set(month, [...(out.get(month) ?? []), a]);
  }
  return out;
}

/** W10: com o ajuste ligado, o dia com atividade não quebra a sequência. */
export const activityKeepsStreak = (data: Pick<AppData, 'activities' | 'settings'>, date: DateKey): boolean =>
  !!data.settings.activitiesKeepStreak && activitiesOn(data, date).length > 0;
