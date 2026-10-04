// Biblioteca de exercícios por grupo (a mesma do app antigo, data/static-config.js).
import { normalizeExerciseName } from '../domain/text';

export const EXERCISE_LIBRARY: Record<string, readonly string[]> = {
  Peito: [
    'Supino Reto (Barra)',
    'Supino Reto (Halteres)',
    'Supino Inclinado (Barra)',
    'Supino Inclinado (Halteres)',
    'Supino Declinado (Máquina)',
    'Supino Articulado',
    'Crossover (Polia Alta)',
    'Crossover (Polia Baixa)',
    'Peck Deck (Voador)',
    'Flexão de Braço (Solo)',
    'Paralelas / Mergulho (Dips)',
    'Crucifixo com Halteres'
  ],
  Costas: [
    'Puxada Frontal (Polia)',
    'Puxada Triângulo',
    'Barra Fixa (Pull-up)',
    'Remada Baixa (Polia)',
    'Remada Curvada (Barra)',
    'Remada Cavalinho',
    'Remada Unilateral (Halter)',
    'Remada Máquina',
    'Pulldown (Corda)',
    'Levantamento Terra',
    'Pullover'
  ],
  Ombro: [
    'Desenvolvimento Militar (Barra)',
    'Desenvolvimento com Halteres',
    'Desenvolvimento Máquina',
    'Elevação Lateral (Halteres)',
    'Elevação Lateral (Polia)',
    'Elevação Frontal',
    'Crucifixo Invertido (Máquina)',
    'Face Pull',
    'Encolhimento (Trapézio)'
  ],
  'Bíceps': [
    'Rosca Direta (Barra)',
    'Rosca Direta (Polia)',
    'Rosca Alternada (Halteres)',
    'Rosca Martelo',
    'Rosca Scott (Barra W)',
    'Rosca Scott Máquina',
    'Rosca Concentrada',
    'Rosca 21'
  ],
  'Tríceps': [
    'Tríceps Pulley (Corda)',
    'Tríceps Pulley (Barra)',
    'Tríceps Testa (Barra/Halteres)',
    'Tríceps Francês',
    'Mergulho no Banco',
    'Tríceps Coice (Halter)',
    'Supino Fechado'
  ],
  'Pernas (Quadríceps)': [
    'Agachamento Livre',
    'Leg Press 45º',
    'Cadeira Extensora',
    'Agachamento Smith',
    'Afundo (Passada)',
    'Agachamento Búlgaro',
    'Hack Squat'
  ],
  'Pernas (Posterior/Glúteo)': [
    'Stiff (Halteres/Barra)',
    'Levantamento Terra Romeno',
    'Mesa Flexora',
    'Cadeira Flexora',
    'Elevação Pélvica (Hip Thrust)',
    'Cadeira Abdutora',
    'Cadeira Adutora',
    'Glúteo na Polia (Coice)'
  ],
  Panturrilha: [
    'Panturrilha em Pé',
    'Panturrilha Sentado',
    'Panturrilha no Leg Press'
  ],
  'Abdômen / Core': [
    'Abdominal Crunch (Máquina)',
    'Abdominal na Polia',
    'Prancha Isométrica',
    'Elevação de Pernas',
    'Abdominal Infra',
    'Rotação de Tronco (Máquina)',
    'Roda Abdominal'
  ],
  Cardio: [
    'Esteira',
    'Bicicleta Ergométrica',
    'Elíptico',
    'Escada (StairMaster)',
    'Remo (Máquina)'
  ]
};

const GROUP_BY_NAME = new Map<string, string>();
for (const [group, names] of Object.entries(EXERCISE_LIBRARY)) {
  for (const name of names) GROUP_BY_NAME.set(normalizeExerciseName(name), group);
}

/** Grupo muscular quando o nome é exatamente um da biblioteca. */
export function groupOf(name: string): string | null {
  return GROUP_BY_NAME.get(normalizeExerciseName(name)) ?? null;
}

export function isCardioName(name: string): boolean {
  return groupOf(name) === 'Cardio';
}
