// Sessão de treino: os tipos (ver session.ts).
import type { DayKey } from './ai-plan';
import type { DateKey } from './dates';
import { type DailyForm, type ExerciseMode, type LightKind, type SetKind, type SetTechnique } from './model';
import { type Progression } from './progression';
import { type WarmupConfig } from './warmup';

export interface SessionSet {
  reps: number;
  weight: number;
  kind: SetKind;
  done: boolean;
  /** Até a falha (S5). */
  failure?: true;
  /** M49: drop-set ou rest-pause. */
  technique?: SetTechnique;
  /** V2: nota curta da série. */
  note?: string;
  /** T17: descanso depois desta série, só neste treino (0 = sem cronômetro). Ausente = o do exercício. */
  rest?: number;
  /** V8: aquecimento posto pela rampa automática (acompanha a carga de trabalho até ser editado). */
  auto?: true;
  /** V14: hora em que foi marcada. */
  at?: string;
}

export interface SessionExercise {
  /** id do exercício no plano (estável durante o treino, mesmo após trocar pela reserva). */
  slotId: string;
  name: string;
  key: string;
  mode: ExerciseMode;
  optional: boolean;
  sets: SessionSet[];
  /** Meta em segundos por série (modo time). */
  seconds?: number;
  /** W19: `level` = nível de resistência (bicicleta, remo, elíptico). */
  cardio?: { minutes: number; km: number; done: boolean; level?: number };
  note: string;
  restSeconds?: number;
  /** T23: pesos da pilha da máquina (a carga anda de pino em pino). */
  stack?: number[];
  tip?: string;
  alternatives: { name: string; mode: ExerciseMode }[];
  /** Nome original do plano quando trocado por uma reserva. */
  swappedFrom?: string;
  /** M17: mesma marca nos vizinhos = superset. */
  superset?: string;
  /** Sugestão da progressão automática que preencheu as séries (M12), com o porquê. */
  progression?: Progression;
  /** M31: repetições por lado. */
  perSide?: true;
  /** T6: descanso entre os lados, em segundos. */
  sideRestSeconds?: number;
  /** V8: como arredondar a rampa de aquecimento automático deste exercício. */
  autoWarmup?: WarmupConfig;
  /** Carga travada no plano: a progressão não mexe nela. */
  lockWeight?: true;
}

export interface ActiveSession {
  id: string;
  date: DateKey;
  startedAt: string;
  planId: string;
  dayKey: DayKey;
  dayName: string;
  exercises: SessionExercise[];
  /** M15: treino de um dia passado, registrado depois; a duração é a informada, não o relógio. */
  backdated?: { durationMin: number };
  /** W2: check-in do dia, respondido ao começar. */
  form?: DailyForm;
  /** W2: treino de hoje mais leve (fica fora da progressão). */
  light?: LightKind;
  /** W3: pausado desde (ISO). */
  pausedAt?: string;
  /** W3: tempo já pausado, em ms (não conta na duração). */
  pausedMs?: number;
  /** W4: última mexida no treino (ISO); ausente = o início. */
  lastActivityAt?: string;
  /** W11: aberto na prévia; "Começar" acerta o início para a hora do toque. */
  preview?: true;
  /** W4: salvo sozinho (vai para o treino salvo, para poder reabrir). */
  autoFinished?: true;
}
