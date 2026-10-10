import { useState } from 'react';
import { DAY_KEYS } from '../../domain/ai-plan';
import { isExerciseDone, sessionProgress, type ActiveSession } from '../../domain/session';
import { updateMeta, updateSettings } from '../../domain/actions';
import { Icon } from '../../ui/Icon';
import { useNow } from '../../hooks/use-now';
import { useWakeLock } from '../../hooks/use-wake-lock';
import { useAppStore } from '../../store';
import { Sheet } from '../../ui/Sheet';
import { dayTitle, formatClock, plural, shortDate } from '../../ui/format';
import { ExerciseCard } from './ExerciseCard';
import { useRestStore } from './rest-store';
import { useWorkoutUi } from './workout-ui';
import { WorkoutSettingsFields } from '../profile/SettingsSection';
import { AddToWorkoutSheet } from './AddToWorkoutSheet';

export function ActiveWorkout({ session }: { session: ActiveSession }) {
  const now = useNow(1000);
  const [finishing, setFinishing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [switching, setSwitching] = useState(false);
  const keepScreenOn = useAppStore(s => s.data?.settings.keepScreenOn ?? true);
  useWakeLock(keepScreenOn);
  const progress = sessionProgress(session);
  const run = useAppStore(s => s.run);
  const focus = useAppStore(s => s.data?.settings.focusMode ?? false);
  const total = session.exercises.length;
  const firstOpen = Math.max(0, session.exercises.findIndex(ex => !isExerciseDone(ex)));
  const [current, setCurrent] = useState(firstOpen);
  const at = Math.min(current, total - 1);
  // S1: no modo foco troca o exercício; na lista, rola até o cartão (o cabeçalho fixo fica por cima)
  const goTo = (i: number) => {
    if (focus) { setCurrent(i); return; }
    document.getElementById(`exercicio-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const elapsed = (now - Date.parse(session.startedAt)) / 1000;
  const pct = progress.setsTotal ? (progress.setsDone / progress.setsTotal) * 100 : 0;

  return (
    <div>
      {/* N3: cabeçalho fixo com tempo, séries e o botão de concluir sempre à mão */}
      <header className="safe-top sticky top-0 z-20 -mx-4 border-b border-line bg-page/95 px-4 pb-3 pt-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-black">{session.dayName || 'Treino'}</h1>
            <p className="text-sm text-muted tabular-nums">
              {session.backdated ? `Treino de ${shortDate(session.date)} · ${session.backdated.durationMin} min` : formatClock(elapsed)} · {progress.setsDone}/{progress.setsTotal} séries
            </p>
          </div>
          <button type="button" onClick={() => setSettingsOpen(true)} aria-label="Ajustes do treino"
            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-muted">
            <Icon name="ajustes" />
          </button>
          <button type="button" onClick={() => run((d, t) => updateSettings(d, { focusMode: !focus }, t))} aria-pressed={focus}
            aria-label={focus ? 'Ver todos os exercícios' : 'Um exercício por vez'}
            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-muted">
            <Icon name={focus ? 'opcoes' : 'treino'} />
          </button>
          <button type="button" onClick={() => setFinishing(true)}
            className="h-11 shrink-0 rounded-xl bg-primary px-4 font-bold text-white">
            Concluir
          </button>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-surface-2" aria-hidden="true">
          <div className="h-1.5 rounded-full bg-success transition-[width]" style={{ width: `${pct}%` }} />
        </div>
        {/* S1: um número por exercício, preenchido conforme avança; toque leva até ele */}
        <ol aria-label="Exercícios do treino" className="-mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {session.exercises.map((ex, i) => {
            const isDone = isExerciseDone(ex);
            const started = !isDone && ex.sets.some(x => x.done);
            const here = focus && i === at;
            return (
              <li key={`${ex.slotId}-${i}`} className="shrink-0">
                <button type="button" onClick={() => goTo(i)} aria-label={`Ir para ${ex.name}${isDone ? ', concluído' : started ? ', em andamento' : ''}`}
                  aria-current={here ? 'step' : undefined}
                  className={`flex size-9 items-center justify-center rounded-full text-sm font-bold tabular-nums ${
                    isDone ? 'bg-success text-white' : started ? 'border-2 border-primary text-ink' : 'bg-surface-2 text-muted'
                  } ${here ? 'ring-2 ring-primary ring-offset-2 ring-offset-page' : ''}`}>
                  {i + 1}
                </button>
              </li>
            );
          })}
        </ol>
        <button type="button" onClick={() => setSwitching(true)} className="mt-1 h-9 text-sm font-semibold text-muted">
          Trocar ou cancelar treino
        </button>
      </header>

      <ProgressionNotice session={session} />
      {/* R5: descanso, som, gesto e carga sem sair do treino */}
      <Sheet title="Ajustes do treino" open={settingsOpen} onClose={() => setSettingsOpen(false)}>
        <div className="px-1 pb-3"><WorkoutSettingsFields /></div>
      </Sheet>

      {focus && total > 0 ? (
        // N5: um exercício por vez, com navegação; o próximo pendente fica a um toque
        <div className="mt-4 space-y-3">
          <nav aria-label="Exercícios" className="flex items-center gap-2">
            <button type="button" disabled={at === 0} onClick={() => setCurrent(at - 1)} aria-label="Exercício anterior"
              className="flex size-11 items-center justify-center rounded-xl bg-surface-2 disabled:opacity-40"><Icon name="subir" className="size-6 -rotate-90" /></button>
            <p className="flex-1 text-center font-semibold" aria-live="polite">Exercício {at + 1}/{total}</p>
            <button type="button" disabled={at === total - 1} onClick={() => setCurrent(at + 1)} aria-label="Próximo exercício"
              className={`flex size-11 items-center justify-center rounded-xl disabled:opacity-40 ${isExerciseDone(session.exercises[at]!) ? 'bg-primary text-white' : 'bg-surface-2'}`}>
              <Icon name="subir" className="size-6 rotate-90" />
            </button>
          </nav>
          <ExerciseCard key={`${session.exercises[at]!.slotId}-${at}`} session={session} index={at} alwaysOpen onGoTo={setCurrent} />
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {session.exercises.map((ex, i) => (
            <div key={`${ex.slotId}-${i}`} id={`exercicio-${i}`} className="scroll-mt-48"><ExerciseCard session={session} index={i} /></div>
          ))}
        </div>
      )}
      {/* M18: mais um exercício sem sair do treino */}
      <button type="button" onClick={() => setAdding(true)}
        className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line font-semibold text-muted">
        <Icon name="mais" className="size-5" /> Adicionar exercício
      </button>
      <AddToWorkoutSheet open={adding} session={session} onClose={() => setAdding(false)}
        onAdded={() => { if (focus) setCurrent(session.exercises.length); }} />

      <FinishSheet open={finishing} onClose={() => setFinishing(false)} session={session} />
      <SwitchSheet open={switching} onClose={() => setSwitching(false)} session={session} />
    </div>
  );
}

/** Desistir do treino ou trocar pelo de outro dia; as séries marcadas são perdidas. */
function SwitchSheet({ open, onClose, session }: { open: boolean; onClose: () => void; session: ActiveSession }) {
  const plan = useAppStore(s => s.data?.plans[session.planId]);
  const start = useAppStore(s => s.startWorkout);
  const discard = useAppStore(s => s.discardWorkout);
  const done = sessionProgress(session).setsDone;
  const [confirm, setConfirm] = useState(false);
  const lose = done === 0 ? '' : done === 1 ? 'A série marcada não será salva.' : `As ${done} séries marcadas não serão salvas.`;
  const close = () => { setConfirm(false); onClose(); };
  const cancel = () => { discard(); useRestStore.getState().stop(); close(); };
  const swap = (key: (typeof DAY_KEYS)[number]) => {
    if (done > 0 && !window.confirm(`Trocar de treino? ${lose}`)) return;
    useRestStore.getState().stop();
    if (start(session.planId, key)) close();
  };
  const days = plan ? DAY_KEYS.filter(k => k !== session.dayKey && plan.days[k].exercises.length > 0) : [];
  return (
    <Sheet title="Trocar ou cancelar treino" open={open} onClose={close}>
      {days.length > 0 && <p className="px-1 pb-2 text-sm font-semibold text-muted">Fazer outro treino no lugar</p>}
      <ul className="space-y-2">
        {days.map(k => {
          const title = dayTitle(plan!.days[k], k).title;
          return (
            <li key={k}>
              <button type="button" onClick={() => swap(k)} aria-label={`Trocar por ${title}`}
                className="w-full rounded-xl bg-surface-2 px-3 py-3 text-left">
                <span className="block font-semibold">{title}</span>
                <span className="text-sm text-muted">{plural(plan!.days[k].exercises.length, 'exercício', 'exercícios')}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {lose && <p className="mt-3 px-1 text-sm text-warning">{lose}</p>}
      {confirm ? (
        <button type="button" onClick={cancel}
          className="mt-3 h-12 w-full rounded-xl border border-danger text-base font-bold text-danger">
          Confirmar: cancelar sem salvar
        </button>
      ) : (
        <button type="button" onClick={() => (done > 0 ? setConfirm(true) : cancel())}
          className="mt-3 h-12 w-full rounded-xl text-base font-semibold text-danger">
          Cancelar treino
        </button>
      )}
    </Sheet>
  );
}

function FinishSheet({ open, onClose, session }: { open: boolean; onClose: () => void; session: ActiveSession }) {
  const finish = useAppStore(s => s.finishWorkout);
  const discard = useAppStore(s => s.discardWorkout);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const p = sessionProgress(session);

  function done() {
    const id = session.id;
    if (finish() === 'saved') {
      useRestStore.getState().stop();
      useWorkoutUi.getState().showSummary(id);
      onClose();
    }
  }

  return (
    <Sheet title="Concluir treino" open={open} onClose={() => { setConfirmDiscard(false); onClose(); }}>
      {p.setsDone === 0 && !session.exercises.some(e => e.cardio?.done) ? (
        <p className="text-base text-muted">Nenhuma série marcada ainda. Marque o que você fez para registrar o treino.</p>
      ) : (
        <>
          {/* O5: mostra séries feitas, não só exercícios inteiros */}
          <p className="text-base">
            {plural(p.setsDone, 'série feita', 'séries feitas')} de {p.setsTotal} · {p.exercisesDone} de {plural(p.exercisesTotal, 'exercício completo', 'exercícios completos')}
          </p>
          {!p.complete && <p className="mt-1 text-sm text-warning">Treino incompleto: só as séries marcadas entram no histórico, e o check-in vale meio XP.</p>}
          <button type="button" onClick={done} className="mt-4 h-12 w-full rounded-xl bg-primary text-base font-bold text-white">
            {p.complete ? 'Finalizar treino' : 'Finalizar assim'}
          </button>
        </>
      )}
      <button type="button" onClick={onClose} className="mt-2 h-12 w-full rounded-xl bg-surface-2 text-base font-bold">Continuar treinando</button>
      {confirmDiscard ? (
        <button type="button" onClick={() => { discard(); useRestStore.getState().stop(); setConfirmDiscard(false); onClose(); }}
          className="mt-2 h-12 w-full rounded-xl border border-danger text-base font-bold text-danger">
          Confirmar: descartar sem salvar
        </button>
      ) : (
        <button type="button" onClick={() => setConfirmDiscard(true)} className="mt-2 h-12 w-full text-base font-semibold text-danger">Descartar treino</button>
      )}
    </Sheet>
  );
}

/** Explica uma vez a progressão automática (3.3), no primeiro treino em que ela sugere algo. */
function ProgressionNotice({ session }: { session: ActiveSession }) {
  const seen = useAppStore(s => !s.data || !!s.data.meta.hintsSeen.progressao);
  const run = useAppStore(s => s.run);
  if (seen || !session.exercises.some(e => e.progression)) return null;
  const dismiss = (off: boolean) => run((d, now) => {
    const seenNow = updateMeta(d, { hintsSeen: { progressao: true } });
    return off ? updateSettings(seenNow.data, { loadSource: 'last', autoProgression: false }, now) : seenNow;
  });
  return (
    <section role="note" className="mt-3 rounded-2xl border border-primary bg-surface p-4">
      <h2 className="font-bold">Novidade: carga sugerida</h2>
      <p className="mt-1 text-sm text-muted">
        O treino agora abre com a carga sugerida pelo seu histórico. A linha embaixo de cada exercício diz o porquê:
        sobe quando você fez todas as repetições, mantém quando faltou alguma. Dá para mudar em Perfil → Treino.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => dismiss(false)} className="h-11 rounded-xl bg-primary px-4 font-bold text-white">Entendi</button>
        <button type="button" onClick={() => dismiss(true)} className="h-11 rounded-xl bg-surface-2 px-4 font-semibold">Prefiro repetir a última carga</button>
      </div>
    </section>
  );
}
