// W15: a próxima série a fazer, para o aviso de fim do descanso dizer o que vem
// ("Próxima: Supino Reto, 80 kg × 8").
import { supersetBlock, type ActiveSession, type SessionExercise } from './session';

const kg = (n: number) => String(n).replace('.', ',');

function describe(ex: SessionExercise): string | null {
  if (ex.mode === 'cardio') return ex.cardio && !ex.cardio.done ? `${ex.name}, ${ex.cardio.minutes} min` : null;
  const set = ex.sets.find(s => !s.done);
  if (!set) return null;
  const warm = set.kind === 'warmup' ? ' (aquecimento)' : '';
  if (ex.mode === 'time') return `${ex.name}, ${set.reps} s${warm}`;
  return set.weight > 0 ? `${ex.name}, ${kg(set.weight)} kg × ${set.reps}${warm}` : `${ex.name}, ${set.reps} ${set.reps === 1 ? 'repetição' : 'repetições'}${warm}`;
}

/**
 * A próxima série por fazer, começando pelo exercício que disparou o descanso (num superset, pelo
 * primeiro do bloco, que é para onde a rodada volta) e seguindo a ordem do treino, dando a volta.
 * `null` quando não sobra nada.
 */
export function nextSetHint(s: Pick<ActiveSession, 'exercises'>, from: number | null): string | null {
  const n = s.exercises.length;
  if (!n) return null;
  const at = from !== null && from >= 0 && from < n ? from : 0;
  const start = supersetBlock(s.exercises, at)?.start ?? at;
  for (let i = 0; i < n; i++) {
    const hint = describe(s.exercises[(start + i) % n]!);
    if (hint) return hint;
  }
  return null;
}

/** O texto do aviso de fim do descanso. */
export function restAlarmBody(s: Pick<ActiveSession, 'exercises'> | null, from: number | null): string {
  if (!s) return 'Bora para a próxima série!';
  const hint = nextSetHint(s, from);
  return hint ? `Próxima: ${hint}` : 'Era a última série. Pode concluir o treino!';
}
