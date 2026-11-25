// Partes do treino em andamento da 3.27.0: prévia antes de começar (W11), "Ainda treinando?" do
// treino esquecido (W4) e "Terminou cedo?" com os exercícios que ficaram para trás (W13).
import { useEffect, useState } from 'react';
import { addLeftovers, canReopen, forgottenEnd, forgottenState, reopenSession, startFromPreview, type ActiveSession } from '../../domain/session';
import type { Workout } from '../../domain/model';
import { useNow } from '../../hooks/use-now';
import { useAppStore } from '../../store';
import { useUiStore } from '../../store/ui-store';
import { useWorkoutUi } from './workout-ui';
import { Sheet } from '../../ui/Sheet';
import { formatNumber, plural, shortDate } from '../../ui/format';
import { useRestStore } from './rest-store';
import { LockMark } from '../../ui/LockMark';

/** W11: o treino aberto na prévia: exercícios, séries e cargas, com "Começar" embaixo. */
export function WorkoutPreview({ session }: { session: ActiveSession }) {
  const update = useAppStore(s => s.updateSession);
  const discard = useAppStore(s => s.discardWorkout);
  return (
    <section aria-label="Prévia do treino" className="pt-6">
      <p className="text-sm font-semibold text-muted">Prévia</p>
      <h1 className="text-2xl font-black">{session.dayName || 'Treino'}</h1>
      <p className="text-sm text-muted">{plural(session.exercises.length, 'exercício', 'exercícios')} · {plural(session.exercises.reduce((n, ex) => n + ex.sets.filter(x => x.kind === 'work').length, 0), 'série', 'séries')}</p>
      <ol className="mt-4 space-y-2">
        {session.exercises.map((ex, i) => {
          const work = ex.sets.filter(x => x.kind === 'work');
          const warm = ex.sets.length - work.length;
          const reps = [...new Set(work.map(x => x.reps))];
          const kg = [...new Set(work.map(x => x.weight))];
          const detail = ex.mode === 'cardio' && ex.cardio
            ? `${ex.cardio.minutes} min`
            : `${work.length} × ${reps.join('/')}${ex.mode === 'time' ? ' s' : ''}${kg.some(k => k > 0) ? ` · ${kg.map(formatNumber).join('/')} kg` : ''}${warm ? ` · ${warm} aquec.` : ''}`;
          return (
            <li key={`${ex.slotId}-${i}`} className="rounded-2xl border border-line bg-surface p-3">
              <p className="flex items-center gap-1.5 font-semibold"><span><span className="mr-2 text-faint">{i + 1}</span>{ex.name}</span>{ex.lockWeight && <LockMark className="size-4" />}</p>
              <p className="text-sm text-muted">{detail}</p>
              {ex.progression?.reason && <p className="text-xs text-muted">{ex.progression.reason}</p>}
            </li>
          );
        })}
      </ol>
      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] mt-4 grid gap-2 bg-page pt-2">
        <button type="button" onClick={() => update(s => startFromPreview(s, new Date()))} className="h-12 rounded-xl bg-primary text-base font-bold text-white">Começar</button>
        <button type="button" onClick={() => { discard(); useRestStore.getState().stop(); }} className="h-11 rounded-xl font-semibold text-muted">Voltar sem começar</button>
      </div>
    </section>
  );
}

/**
 * W4: vigia o treino aberto em qualquer aba. Parado há N minutos, pergunta "Ainda treinando?";
 * sem resposta em mais 5, salva sozinho (terminando na última mexida mais um descanso) e mostra o
 * resumo na aba Treino.
 */
export function ForgottenWatcher() {
  const session = useAppStore(s => s.session);
  const settings = useAppStore(s => s.data?.settings);
  const update = useAppStore(s => s.updateSession);
  const finish = useAppStore(s => s.finishWorkout);
  const now = useNow(5000, !!session);
  const minutes = settings?.forgottenMinutes ?? 45;
  const state = session ? forgottenState(session, new Date(now), minutes) : 'ok';
  const finishAt = (at: Date) => {
    if (!session) return;
    const id = session.id;
    if (finish(at, true) === 'saved') {
      useRestStore.getState().stop();
      useWorkoutUi.getState().showSummary(id);
      useUiStore.getState().setTab('treino');
    }
  };
  useEffect(() => {
    if (state === 'finish' && session) finishAt(forgottenEnd(session, settings?.restSeconds ?? 90, new Date()));
    // só reage quando o estado do treino esquecido muda
    // eslint-disable-next-line react-hooks/exhaustive-deps -- de propósito: só reage quando o estado do treino esquecido muda
  }, [state]);
  if (!session) return null;
  return (
    <ForgottenSheet open={state === 'ask'} minutes={minutes}
      onKeep={() => update(s => ({ ...s }))}
      onFinish={() => finishAt(forgottenEnd(session, settings?.restSeconds ?? 90, new Date()))} />
  );
}

/** W4: um treino salvo sozinho pode ser reaberto (as séries voltam marcadas). */
export function ReopenButton({ w, className = '' }: { w: Workout; className?: string }) {
  const data = useAppStore(s => s.data);
  const running = useAppStore(s => !!s.session);
  const open = useAppStore(s => s.openSession);
  if (!data || running || !canReopen(w, new Date())) return null;
  const reopen = () => {
    const s = reopenSession(data, w, new Date());
    if (s && open(s)) { useWorkoutUi.getState().showSummary(null); useUiStore.getState().setTab('treino'); }
  };
  return <button type="button" onClick={reopen} className={`h-11 rounded-xl bg-surface-2 px-4 font-semibold ${className}`}>Reabrir o treino</button>;
}

/** W4: o treino parado há muito tempo pergunta se continua. */
export function ForgottenSheet({ open, minutes, onKeep, onFinish }: { open: boolean; minutes: number; onKeep: () => void; onFinish: () => void }) {
  return (
    <Sheet title="Ainda treinando?" open={open} onClose={onKeep}>
      <p className="px-1 pb-3 text-muted">Nada marcado há {minutes} minutos. Sem resposta em 5 minutos, o treino é salvo sozinho, terminando na última série mais o descanso; nada se perde.</p>
      <div className="grid gap-2">
        <button type="button" onClick={onKeep} className="h-12 rounded-xl bg-primary text-base font-bold text-white">Continuar treinando</button>
        <button type="button" onClick={onFinish} className="h-12 rounded-xl bg-surface-2 text-base font-bold">Finalizar agora</button>
      </div>
    </Sheet>
  );
}

const keyOf = (id: string) => `tp-sobras-${id}`;
const offered = (id: string) => { try { return localStorage.getItem(keyOf(id)) === '1'; } catch { return false; } };
const markOffered = (id: string) => { try { localStorage.setItem(keyOf(id), '1'); } catch { /* sem armazenamento: pode oferecer de novo */ } };

/**
 * W13: o treino anterior (dos últimos 14 dias) deixou exercícios para trás: oferece uma vez pôr no
 * começo deste. Os que já estão no treino de hoje ficam de fora.
 */
export function LeftoversNotice({ session }: { session: ActiveSession }) {
  const data = useAppStore(s => s.data);
  const update = useAppStore(s => s.updateSession);
  const [closed, setClosed] = useState(false);
  if (!data || closed || session.backdated || !session.planId || data.settings.offerLeftovers === false) return null;
  if (session.exercises.some(ex => ex.sets.some(x => x.done))) return null;
  const last = [...data.workouts].reverse().find(w => w.id !== session.id && w.date <= session.date);
  if (!last?.skipped?.length || offered(last.id)) return null;
  const days = (Date.parse(session.date) - Date.parse(last.date)) / 86400000;
  if (days > 14) return null;
  const here = new Set(session.exercises.map(ex => ex.key));
  const names = last.skipped.filter(n => !here.has(n.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ')));
  if (!names.length) return null;
  const close = () => { markOffered(last.id); setClosed(true); };
  return (
    <section aria-label="Terminou cedo" className="mt-3 rounded-2xl border border-line bg-surface p-4">
      <h2 className="font-bold">Terminou cedo da última vez?</h2>
      <p className="mt-1 text-sm text-muted">
        Em {shortDate(last.date)} ficaram para trás: {names.join(', ')}. Quer começar por {names.length === 1 ? 'ele' : 'eles'} hoje?
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => { update(s => addLeftovers(s, data, names)); close(); }} className="h-11 rounded-xl bg-primary px-4 font-bold text-white">Começar por {names.length === 1 ? 'ele' : 'eles'}</button>
        <button type="button" onClick={close} className="h-11 rounded-xl bg-surface-2 px-4 font-semibold">Só o de hoje</button>
      </div>
    </section>
  );
}
