// T11: exercícios assistidos (barra fixa e paralela no gravitron, ou com elástico anotado em kg). A
// carga é a ajuda: quanto menos, mais forte. A progressão tira ajuda, a seta sobe quando a ajuda
// cai, o volume conta o peso do corpo menos a ajuda e não há recorde de carga nem 1RM.
import { normalizeExerciseName } from './text';

export function isAssisted(name: string): boolean {
  return /assistid|gravitron/.test(normalizeExerciseName(name));
}
