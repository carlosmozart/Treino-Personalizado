// Nome do exercício → ilustração do Everkinetic (github.com/everkinetic/data, CC BY-SA 4.0).
// Conferida exercício a exercício: sem imagem que mostre o mesmo movimento, fica de fora
// (melhor nenhuma ilustração que uma errada). Sem importações: o script de importação
// (scripts/import-illustrations.ts) lê este arquivo direto no Node.

/** Nomes da biblioteca (data/exercise-library.ts) e do plano de exemplo. */
export const ILLUSTRATION_BY_NAME: Record<string, string> = {
  // Peito
  'Supino Reto (Barra)': '0042',
  'Supino Reto (Halteres)': '0055',
  'Supino Inclinado (Barra)': '0043',
  'Supino Inclinado (Halteres)': '0061',
  'Supino Declinado (Máquina)': '0085',
  'Supino Articulado': '0066',
  'Supino Articulado (Pegada Neutra)': '0066',
  'Crossover (Polia Alta)': '0048',
  'Crossover Polia Alta (de cima p/ baixo)': '0048',
  'Flexão de Braço (Solo)': '0077',
  'Paralelas / Mergulho (Dips)': '0054',
  'Crucifixo com Halteres': '0056',
  // Costas
  'Puxada Triângulo': '0096',
  'Barra Fixa (Pull-up)': '0087',
  'Remada Baixa (Polia)': '0025',
  'Remada Curvada (Barra)': '0026',
  'Remada Cavalinho': '0029',
  'Remada Cavalinho ou Máquina': '0029',
  'Pulldown (Corda)': '0092',
  'Levantamento Terra': '0099',
  'Pullover': '0079',
  'Extensão Lombar Leve (Banco Romano)': '0103',
  // Ombro
  'Desenvolvimento Militar (Barra)': '0004',
  'Elevação Lateral (Halteres)': '0018',
  'Elevação Frontal': '0033',
  'Encolhimento (Trapézio)': '0030',
  // Bíceps
  'Rosca Direta (Barra)': '0211',
  'Rosca Direta (Polia)': '0212',
  'Rosca Direta (Polia Baixa)': '0212',
  'Rosca Alternada (Halteres)': '0223',
  'Rosca Martelo': '0227',
  'Rosca Martelo (Halteres)': '0227',
  'Rosca Scott (Barra W)': '0239',
  'Rosca Scott Máquina': '0236',
  'Rosca Concentrada': '0220',
  'Rosca 21': '0211',
  // Tríceps
  'Tríceps Pulley (Corda)': '0206',
  'Tríceps Pulley (Barra)': '0205',
  'Tríceps Testa (Barra/Halteres)': '0183',
  'Tríceps Francês': '0198',
  'Tríceps Francês (Polia/Halter)': '0198',
  'Mergulho no Banco': '0162',
  'Tríceps Coice (Halter)': '0204',
  'Supino Fechado': '0049',
  // Pernas
  'Agachamento Livre': '0122',
  'Leg Press 45º': '0127',
  'Leg Press 45º (Amplitude Parcial)': '0127',
  'Cadeira Extensora': '0142',
  'Cadeira Extensora (Amplitude Parcial, Carga Leve)': '0142',
  'Agachamento Smith': '0124',
  'Afundo (Passada)': '0115',
  'Hack Squat': '0123',
  'Stiff (Halteres/Barra)': '0118',
  'Stiff/RDL (Halteres Leves)': '0118',
  'Levantamento Terra Romeno': '0118',
  'Mesa Flexora': '0117',
  'Mesa/Cadeira Flexora': '0117',
  'Cadeira Flexora': '0119',
  'Cadeira Abdutora': '0156',
  'Cadeira Adutora': '0157',
  'Glúteo na Polia (Coice)': '0112',
  // Panturrilha
  'Panturrilha em Pé': '0282',
  'Panturrilha Sentado': '0279',
  'Panturrilha Sentado (Máquina)': '0279',
  'Panturrilha no Leg Press': '0273',
  'Panturrilha (Leg Press ou em pé)': '0273',
  // Abdômen
  'Abdominal na Polia': '0288',
  'Elevação de Pernas': '0021',
  'Abdominal Infra': '0287',
  'Roda Abdominal': '0286'
};

/*
 * Sem ilustração fiel no Everkinetic (ficam para ícones próprios ou foto do usuário, Q4):
 * Crossover (Polia Baixa), Peck Deck, Puxada Frontal (pegada aberta), Remada Unilateral,
 * Remada Máquina, Desenvolvimento com Halteres e Máquina, Elevação Lateral (Polia),
 * Crucifixo Invertido, Face Pull, Agachamento Búlgaro, Elevação Pélvica (Hip Thrust),
 * Abdominal Crunch (Máquina), Prancha, Rotação de Tronco e todo o cardio.
 */
