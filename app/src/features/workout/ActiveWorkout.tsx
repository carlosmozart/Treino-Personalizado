import { useState } from 'react';
import { sessionProgress, type ActiveSession } from '../../domain/session';
import { useNow } from '../../hooks/use-now';
import { useWakeLock } from '../../hooks/use-wake-lock';
import { useAppStore } from '../../store';
import { Sheet } from '../../ui/Sheet';
import { formatClock, plural } from '../../ui/format';
import { ExerciseCard } from './ExerciseCard';
import { useRestStore } from './rest-store';
import { useWorkoutUi } from './workout-ui';

export function ActiveWorkout({ session }: { session: ActiveSession }) {
  const now = useNow(1000);
  const [finishing, setFinishing] = useState(false);
  const keepScreenOn = useAppStore(s => s.data?.settings.keepScreenOn ?? true);
  useWakeLock(keepScreenOn);
  const progress = sessionProgress(session);
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
              {formatClock(elapsed)} · {progress.setsDone}/{progress.setsTotal} séries
            </p>
          </div>
          <button type="button" onClick={() => setFinishing(true)}
            className="h-11 shrink-0 rounded-xl bg-primary px-4 font-bold text-white">
            Concluir
          </button>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-surface-2" aria-hidden="true">
          <div className="h-1.5 rounded-full bg-success transition-[width]" style={{ width: `${pct}%` }} />
        </div>
      </header>

      <div className="mt-4 space-y-3">
        {session.exercises.map((ex, i) => <ExerciseCard key={`${ex.slotId}-${i}`} session={session} index={i} />)}
      </div>

      <FinishSheet open={finishing} onClose={() => setFinishing(false)} session={session} />
    </div>
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
