import { useState } from 'react';
import { deleteWorkout } from '../../domain/actions';
import { fromDateKey } from '../../domain/dates';
import type { Workout } from '../../domain/model';
import { heatmap, historyByMonth, muscleBalance, statsSummary, weeklyVolume, type HeatLevel } from '../../domain/stats';
import { describeEntry, workoutVolume } from '../../domain/workouts';
import { useAppStore } from '../../store';
import { useUiStore } from '../../store/ui-store';
import { askRestAlarmPermission } from '../workout/rest-alarm-instance';
import { useNow } from '../../hooks/use-now';
import { Icon } from '../../ui/Icon';
import { GoalsView } from './GoalsView';
import { EntryEditor } from './EntryEditor';
import { ExerciseProgressCard } from './ExerciseProgressCard';
import { PastWorkoutButton } from './PastWorkoutSheet';
import { formatNumber, plural, shortDate } from '../../ui/format';

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const monthTitle = (ym: string) => `${MONTH_NAMES[Number(ym.slice(5, 7)) - 1]} de ${ym.slice(0, 4)}`;
const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

const NO_WORKOUTS: Workout[] = [];

type View = 'stats' | 'goals' | 'history';
const VIEW_LABEL: Record<View, string> = { stats: 'Estatísticas', goals: 'Metas', history: 'Histórico' };

/** Estatísticas (N9, M16, M28) e histórico dos treinos. */
export function ProgressScreen() {
  const [view, setView] = useState<View>('stats');
  return (
    <>
      <h1 className="pt-6 text-3xl font-black tracking-tight">Progresso</h1>
      <div role="tablist" className="mt-4 grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1">
        {(['stats', 'goals', 'history'] as const).map(v => (
          <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)}
            className={`h-10 rounded-lg font-semibold ${view === v ? 'bg-surface text-ink' : 'text-muted'}`}>
            {VIEW_LABEL[v]}
          </button>
        ))}
      </div>
      {view === 'stats' ? <Stats /> : view === 'goals' ? <GoalsView /> : <History />}
    </>
  );
}

function Stats() {
  const data = useAppStore(s => s.data);
  const now = new Date(useNow(60_000));
  if (!data) return null;
  const s = statsSummary(data, now);
  const balance = muscleBalance(data, now);
  const max = balance[0]?.sets ?? 1;
  const w = s.weight30d;
  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Block label="Treinos" value={String(s.totalWorkouts)} />
        <Block label="Este mês" value={String(s.thisMonth)} hint="dias treinados" />
        <Block label="Sequência" value={String(s.streak)} hint={`recorde ${s.longestStreak}`} />
        <Block label="Peso em 30 dias" value={w === null ? '—' : `${w > 0 ? '+' : ''}${formatNumber(w)} kg`} />
      </div>
      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="font-bold">Últimos 6 meses</h2>
        <Heatmap />
      </section>
      <WeeklyVolume />
      <ExerciseProgressCard />
      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="font-bold">Séries por grupo (30 dias)</h2>
        {balance.length === 0 ? <p className="mt-2 text-sm text-muted">Sem séries registradas no período.</p> : (
          <ul className="mt-3 space-y-2">
            {balance.map(g => (
              <li key={g.group} className="grid grid-cols-[6rem_1fr_2.5rem] items-center gap-2 text-sm">
                <span className="font-semibold">{g.group}</span>
                <span className="h-3 rounded-full bg-surface-2"><span className="block h-3 rounded-full bg-primary" style={{ width: `${(g.sets / max) * 100}%` }} /></span>
                <span className="text-right text-muted">{g.sets}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Block({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="text-3xl font-black tracking-tight">{value}</p>
      {hint && <p className="text-xs text-faint">{hint}</p>}
    </div>
  );
}

const HEAT: Record<HeatLevel, string> = { 0: 'bg-surface-2', 1: 'bg-primary/35', 2: 'bg-primary/70', 3: 'bg-primary' };

function Heatmap() {
  const data = useAppStore(s => s.data);
  const now = new Date(useNow(60_000));
  if (!data) return null;
  const grid = heatmap(data, now);
  const trained = grid.flat().filter(c => c.level > 0).length;
  return (
    <>
      <div className="mt-3 flex gap-[3px]" role="img" aria-label={`Mapa de treinos: ${plural(trained, 'dia treinado', 'dias treinados')} nos últimos 6 meses`}>
        {grid.map((week, c) => (
          <div key={c} className="flex flex-1 flex-col gap-[3px]">
            {week.map(cell => <span key={cell.date} title={cell.date} className={`aspect-square rounded-[3px] ${cell.future ? 'opacity-0' : HEAT[cell.level]}`} />)}
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-faint">{plural(trained, 'dia treinado', 'dias treinados')}</p>
    </>
  );
}

function History() {
  const workouts = useAppStore(s => s.data?.workouts) ?? NO_WORKOUTS;
  const run = useAppStore(s => s.run);
  const [open, setOpen] = useState<string | null>(null);
  const groups = historyByMonth(workouts);
  if (!groups.length) {
    return (
      <div className="mt-6 space-y-3">
        <p className="rounded-2xl border border-line bg-surface p-4 text-muted">Nenhum treino registrado ainda. Os treinos concluídos aparecem aqui.</p>
        <PastWorkoutButton />
      </div>
    );
  }
  return (
    <div className="mt-4 space-y-5">
      <PastWorkoutButton />
      {groups.map(g => (
        <section key={g.month}>
          <h2 className="text-sm font-bold text-muted">{monthTitle(g.month)} · {plural(g.workouts.length, 'treino', 'treinos')}</h2>
          <ul className="mt-2 space-y-2">
            {g.workouts.map(w => (
              <WorkoutItem key={w.id} w={w} open={open === w.id} onToggle={() => setOpen(open === w.id ? null : w.id)}
                onDelete={() => { if (confirm(`Apagar o treino de ${shortDate(w.date)}?`)) run((d, now) => deleteWorkout(d, w.id, now)); }} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function WorkoutItem({ w, open, onToggle, onDelete }: { w: Workout; open: boolean; onToggle: () => void; onDelete: () => void }) {
  const [editing, setEditing] = useState<number | null>(null);
  const volume = workoutVolume(w);
  const meta = [plural(w.entries.length, 'exercício', 'exercícios'), w.durationMin ? `${w.durationMin} min` : '', volume ? `${formatNumber(volume)} kg` : ''].filter(Boolean).join(' · ');
  return (
    <li className="rounded-2xl border border-line bg-surface">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left">
        <span className="w-10 shrink-0 text-center">
          <span className="block text-xl font-black leading-none">{Number(w.date.slice(8, 10))}</span>
          <span className="text-xs text-muted">{WEEKDAYS[fromDateKey(w.date).getDay()]}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{w.dayName || 'Treino'}</span>
          <span className="block text-sm text-muted">{meta}</span>
        </span>
        <Icon name={open ? 'subir' : 'descer'} className="size-5 shrink-0 text-faint" />
      </button>
      {open && (
        <div className="border-t border-line px-4 pb-3 pt-2">
          <ul className="space-y-1">
            {w.entries.map((e, i) => (
              <li key={`${e.key}-${i}`}>
                <button type="button" onClick={() => setEditing(i)} aria-label={`Corrigir ${e.name}`}
                  className="flex min-h-11 w-full items-center justify-between gap-3 text-left text-sm">
                  <span className="min-w-0 truncate">{e.name}</span>
                  <span className="flex shrink-0 items-center gap-2 text-muted">{describeEntry(e)}<Icon name="editar" className="size-4" /></span>
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <RepeatButton w={w} />
            <button type="button" onClick={onDelete} className="flex h-11 items-center gap-2 rounded-xl px-2 font-semibold text-danger">
              <Icon name="lixo" className="size-5" /> Apagar treino
            </button>
          </div>
          {editing !== null && w.entries[editing] && <EntryEditor workout={w} index={editing} onClose={() => setEditing(null)} />}
        </div>
      )}
    </li>
  );
}

/** Repetir hoje (R4): começa um treino com os mesmos exercícios e números. */
function RepeatButton({ w }: { w: Workout }) {
  const running = useAppStore(s => !!s.session);
  const repeat = useAppStore(s => s.repeatWorkout);
  const setTab = useUiStore(s => s.setTab);
  if (running) return <p className="text-sm text-muted">Termine o treino em andamento para repetir este.</p>;
  return (
    <button type="button" onClick={() => { askRestAlarmPermission(); if (repeat(w.id)) setTab('treino'); }}
      className="h-11 rounded-xl bg-primary px-4 font-bold text-white">
      Repetir hoje
    </button>
  );
}

function WeeklyVolume() {
  const data = useAppStore(s => s.data);
  const now = new Date(useNow(60_000));
  if (!data) return null;
  const weeks = weeklyVolume(data, now, 8);
  const current = weeks.at(-1)!;
  const previous = weeks.at(-2)!;
  const max = Math.max(1, ...weeks.map(w => w.volume));
  const change = previous.volume ? Math.round(((current.volume - previous.volume) / previous.volume) * 100) : null;
  const kg = (n: number) => `${n.toLocaleString('pt-BR')} kg`;
  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <h2 className="font-bold">Volume semanal</h2>
      <p className="mt-1 text-sm text-muted">
        Esta semana: <strong className="text-ink">{kg(current.volume)}</strong> · semana passada: {kg(previous.volume)}
        {change !== null && <span className={change >= 0 ? 'text-success' : 'text-warning'}> ({change > 0 ? '+' : ''}{change}%)</span>}
      </p>
      <div className="mt-3 flex h-24 items-end gap-1.5" role="img"
        aria-label={`Volume das últimas 8 semanas: ${weeks.map(w => kg(w.volume)).join(', ')}`}>
        {weeks.map(w => (
          <div key={w.start} className="flex flex-1 flex-col items-center gap-1">
            <span className={`w-full rounded-t ${w === current ? 'bg-primary' : 'bg-primary/40'}`} style={{ height: `${Math.max(2, (w.volume / max) * 80)}px` }} />
            <span className="text-[10px] text-faint">{w.start.slice(8, 10)}/{w.start.slice(5, 7)}</span>
          </div>
        ))}
      </div>
      <p className="mt-1 text-xs text-faint">Semanas de segunda a domingo; semana sem treino aparece como zero.</p>
    </section>
  );
}
