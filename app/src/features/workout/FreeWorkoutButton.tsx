import { startFreeSession } from '../../domain/session';
import { useAppStore } from '../../store';
import { askRestAlarmPermission } from './rest-alarm-instance';

/** Treino livre: começa vazio, sem plano; os exercícios entram por "Adicionar exercício". */
export function FreeWorkoutButton() {
  const open = useAppStore(s => s.openSession);
  return (
    <button type="button" onClick={() => { askRestAlarmPermission(); open(startFreeSession(new Date(), crypto.randomUUID())); }}
      className="h-12 w-full rounded-xl border border-dashed border-line font-semibold text-muted">
      Treino livre, sem seguir o plano
    </button>
  );
}
