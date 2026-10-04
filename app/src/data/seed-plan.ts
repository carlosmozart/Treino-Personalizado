// Plano de exemplo, o mesmo que o app antigo cria na primeira abertura (data/seed-workouts.js).
// Gerado a partir daquele arquivo; fica aqui como dado para o app novo não depender dele.
import type { DayKey } from '../domain/ai-plan';
import type { DateKey } from '../domain/dates';
import type { Plan, PlanDay } from '../domain/model';

export const SEED_PLAN_ID = 'default';

const DAYS: Record<DayKey, PlanDay> = {
  SEG: {
    name: 'Segunda: Push A (Peito ênfase inferior, Ombro, Tríceps)',
    focus: 'Tensão Mecânica e Cadeia de Empurrar',
    optional: false,
    exercises: [
      {
        id: 'seg_1',
        name: 'Supino Declinado (Máquina)',
        mode: 'reps',
        sets: 4,
        reps: 9,
        weight: 40,
        minutes: 20,
        km: 0,
        optional: false,
        alternatives: [],
        tip: 'Sem máquina declinada? Use Mergulho/Dips inclinando o tronco à frente, ou Flexão de braço com pés elevados. Ambos priorizam peitoral inferior.'
      },
      {
        id: 'seg_2',
        name: 'Crossover Polia Alta (de cima p/ baixo)',
        mode: 'reps',
        sets: 3,
        reps: 12,
        weight: 15,
        minutes: 20,
        km: 0,
        optional: false,
        alternatives: [],
        tip: 'Foco em peitoral inferior: puxe as polias de cima para baixo, cruzando na frente do quadril.'
      },
      {
        id: 'seg_3',
        name: 'Desenvolvimento Máquina',
        mode: 'reps',
        sets: 3,
        reps: 10,
        weight: 30,
        minutes: 20,
        km: 0,
        optional: false,
        alternatives: []
      },
      {
        id: 'seg_4',
        name: 'Tríceps Pulley (Corda)',
        mode: 'reps',
        sets: 3,
        reps: 10,
        weight: 30,
        minutes: 20,
        km: 0,
        optional: false,
        alternatives: []
      }
    ]
  },
  TER: {
    name: 'Terça: Pull A (Costas, Bíceps)',
    focus: 'Espessura Dorsal e Cadeia de Puxar',
    optional: false,
    exercises: [
      {
        id: 'ter_1',
        name: 'Puxada Frontal (Polia)',
        mode: 'reps',
        sets: 4,
        reps: 10,
        weight: 55,
        minutes: 20,
        km: 0,
        optional: false,
        alternatives: []
      },
      {
        id: 'ter_2',
        name: 'Remada Baixa (Polia)',
        mode: 'reps',
        sets: 3,
        reps: 10,
        weight: 50,
        minutes: 20,
        km: 0,
        optional: false,
        alternatives: []
      },
      {
        id: 'ter_3',
        name: 'Rosca Direta (Polia Baixa)',
        mode: 'reps',
        sets: 3,
        reps: 10,
        weight: 25,
        minutes: 20,
        km: 0,
        optional: false,
        alternatives: []
      },
      {
        id: 'ter_4',
        name: 'Rosca Martelo (Halteres)',
        mode: 'reps',
        sets: 3,
        reps: 10,
        weight: 14,
        minutes: 20,
        km: 0,
        optional: false,
        alternatives: []
      }
    ]
  },
  QUA: {
    name: 'Quarta: Legs A (Adaptado ao Joelho)',
    focus: 'Cadeia Posterior e Amplitude Protegida',
    optional: false,
    exercises: [
      {
        id: 'qua_1',
        name: 'Leg Press 45º (Amplitude Parcial)',
        mode: 'reps',
        sets: 3,
        reps: 12,
        weight: 120,
        minutes: 20,
        km: 0,
        optional: false,
        alternatives: [],
        tip: 'Não desça além de ~90° no joelho. Carga moderada, foco em controle, sem travar.'
      },
      {
        id: 'qua_2',
        name: 'Mesa/Cadeira Flexora',
        mode: 'reps',
        sets: 4,
        reps: 12,
        weight: 35,
        minutes: 20,
        km: 0,
        optional: false,
        alternatives: []
      },
      {
        id: 'qua_3',
        name: 'Elevação Pélvica (Hip Thrust)',
        mode: 'reps',
        sets: 3,
        reps: 12,
        weight: 30,
        minutes: 20,
        km: 0,
        optional: false,
        alternatives: [],
        tip: 'Máquina disputada? Faça Ponte de Glúteo no chão com barra ou halter apoiado no quadril, ou Elevação Pélvica unilateral apoiando as costas no banco.'
      },
      {
        id: 'qua_4',
        name: 'Panturrilha (Leg Press ou em pé)',
        mode: 'reps',
        sets: 4,
        reps: 15,
        weight: 80,
        minutes: 20,
        km: 0,
        optional: false,
        alternatives: []
      }
    ]
  },
  QUI: {
    name: 'Quinta: Push B (Peito, Ombro Lateral, Tríceps)',
    focus: 'Proteção Articular e Estabilidade',
    optional: false,
    exercises: [
      {
        id: 'qui_1',
        name: 'Supino Articulado (Pegada Neutra)',
        mode: 'reps',
        sets: 4,
        reps: 9,
        weight: 40,
        minutes: 20,
        km: 0,
        optional: false,
        alternatives: []
      },
      {
        id: 'qui_2',
        name: 'Crossover Polia Alta (de cima p/ baixo)',
        mode: 'reps',
        sets: 3,
        reps: 12,
        weight: 15,
        minutes: 20,
        km: 0,
        optional: false,
        alternatives: [],
        tip: 'Mesma execução de segunda: reforça peitoral inferior com um segundo estímulo na semana.'
      },
      {
        id: 'qui_3',
        name: 'Elevação Lateral (Halteres)',
        mode: 'reps',
        sets: 4,
        reps: 12,
        weight: 10,
        minutes: 20,
        km: 0,
        optional: false,
        alternatives: []
      },
      {
        id: 'qui_4',
        name: 'Tríceps Francês (Polia/Halter)',
        mode: 'reps',
        sets: 3,
        reps: 10,
        weight: 20,
        minutes: 20,
        km: 0,
        optional: false,
        alternatives: []
      }
    ]
  },
  SEX: {
    name: 'Sexta: Pull B (Costas Espessura, Bíceps, Core)',
    focus: 'Volume Direto e Encerramento da Semana',
    optional: false,
    exercises: [
      {
        id: 'sex_1',
        name: 'Remada Cavalinho ou Máquina',
        mode: 'reps',
        sets: 4,
        reps: 10,
        weight: 50,
        minutes: 20,
        km: 0,
        optional: false,
        alternatives: []
      },
      {
        id: 'sex_2',
        name: 'Pulldown (Corda)',
        mode: 'reps',
        sets: 3,
        reps: 12,
        weight: 30,
        minutes: 20,
        km: 0,
        optional: false,
        alternatives: []
      },
      {
        id: 'sex_3',
        name: 'Rosca Scott Máquina',
        mode: 'reps',
        sets: 3,
        reps: 10,
        weight: 25,
        minutes: 20,
        km: 0,
        optional: false,
        alternatives: []
      },
      {
        id: 'sex_4',
        name: 'Abdominal (Prancha ou Máquina)',
        mode: 'reps',
        sets: 3,
        reps: 15,
        weight: 20,
        minutes: 20,
        km: 0,
        optional: false,
        alternatives: []
      }
    ]
  },
  SAB: {
    name: 'Sábado: Legs B Leve + Lombar',
    focus: 'Manutenção Protegida (dia da caminhada de 7km)',
    optional: false,
    exercises: [
      {
        id: 'sab_1',
        name: 'Cadeira Extensora (Amplitude Parcial, Carga Leve)',
        mode: 'reps',
        sets: 3,
        reps: 12,
        weight: 25,
        minutes: 20,
        km: 0,
        optional: false,
        alternatives: [],
        tip: 'Evite a extensão completa do joelho no topo do movimento. Se sentir dor, reduza a carga ou pule este exercício.'
      },
      {
        id: 'sab_2',
        name: 'Stiff/RDL (Halteres Leves)',
        mode: 'reps',
        sets: 3,
        reps: 12,
        weight: 12,
        minutes: 20,
        km: 0,
        optional: false,
        alternatives: []
      },
      {
        id: 'sab_3',
        name: 'Panturrilha Sentado (Máquina)',
        mode: 'reps',
        sets: 3,
        reps: 15,
        weight: 70,
        minutes: 20,
        km: 0,
        optional: false,
        alternatives: []
      },
      {
        id: 'sab_4',
        name: 'Extensão Lombar Leve (Banco Romano)',
        mode: 'reps',
        sets: 3,
        reps: 15,
        weight: 0,
        minutes: 20,
        km: 0,
        optional: false,
        alternatives: []
      }
    ]
  },
  DOM: {
    name: 'Domingo: Extra (Opcional)',
    focus: 'Reforço de Peitoral Inferior e Pontos Fracos',
    optional: true,
    exercises: [
      {
        id: 'dom_1',
        name: 'Crossover Polia Alta (de cima p/ baixo)',
        mode: 'reps',
        sets: 3,
        reps: 12,
        weight: 15,
        minutes: 20,
        km: 0,
        optional: false,
        alternatives: [],
        tip: 'Terceiro estímulo semanal para peitoral inferior, se o corpo estiver respondendo bem.'
      },
      {
        id: 'dom_2',
        name: 'Elevação Lateral (Halteres)',
        mode: 'reps',
        sets: 3,
        reps: 12,
        weight: 8,
        minutes: 20,
        km: 0,
        optional: false,
        alternatives: []
      },
      {
        id: 'dom_3',
        name: 'Abdominal (Prancha ou Máquina)',
        mode: 'reps',
        sets: 3,
        reps: 15,
        weight: 10,
        minutes: 20,
        km: 0,
        optional: false,
        alternatives: []
      },
      {
        id: 'dom_4',
        name: 'Panturrilha (Leg Press ou em pé)',
        mode: 'reps',
        sets: 3,
        reps: 15,
        weight: 70,
        minutes: 20,
        km: 0,
        optional: false,
        alternatives: []
      }
    ]
  }
};

/** `id`: use newId('plano') ao criar no aparelho; o padrão só serve a testes e à migração. */
export function seedPlan(today: DateKey, id = SEED_PLAN_ID): Plan {
  return {
    id,
    name: 'PPL Hipertrofia e Emagrecimento',
    description: 'Plano original: Push/Pull/Legs 2x por semana, adaptado a escoliose e joelho, com ênfase em peitoral inferior.',
    trainingTime: '12:00',
    createdAt: today,
    updatedAt: today,
    days: structuredClone(DAYS)
  };
}
