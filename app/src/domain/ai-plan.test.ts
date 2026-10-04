import { expect, test } from 'vitest';
import { extractPlanBlocks, parseAiPlan, parsePlanBlock } from './ai-plan';

test('escolhe o maior bloco válido quando a resposta da IA contém exemplos', () => {
  const plano = parseAiPlan(`
    [PLANO]
    DIA|SEG|Exemplo||
    EX|Rosca|forca|2|10|0|
    [FIM]
    [PLANO]
    DIA|SEG|Peito|Hipertrofia|
    EX|Supino Reto|forca|3|10|40|
    EX|Crucifixo|forca|3|12|12|
    DIA|TER|Costas||
    EX|Puxada Frontal|forca|3|12|35|
    [FIM]
  `)!;
  expect(plano.dias).toHaveLength(2);
  expect(plano.dias[0]!.exercicios).toHaveLength(2);
  expect(plano.dias[1]!.exercicios[0]!.nome).toBe('Puxada Frontal');
});

test('aceita marcadores previsíveis com dois-pontos e hífen', () => {
  const plano = parseAiPlan(`
    [PLANO]
    DIA: SEG|Peito|Hipertrofia|
    EX - Supino Inclinado|forca|3|10|30|
    [FIM]
  `)!;
  expect(plano.dias).toHaveLength(1);
  expect(plano.dias[0]!.dia).toBe('SEG');
  expect(plano.dias[0]!.exercicios[0]!.nome).toBe('Supino Inclinado');
});

test('aceita delimitadores "mastigados" pelo markdown e bloco numa linha só', () => {
  expect(extractPlanBlocks('===PLANO=== x ===FIM===')).toHaveLength(1);
  const plano = parseAiPlan('=PLANO= DIA|QUA|Pernas| EX|Agachamento|forca|4|8|60|Leg Press| =FIM=')!;
  expect(plano.dias[0]!.exercicios[0]).toEqual({
    nome: 'Agachamento', tipo: 'forca', series: 4, valor: 8, carga: 60, alternativa: 'Leg Press'
  });
});

test('valores padrão, tipos desconhecidos e avisos', () => {
  const plano = parsePlanBlock(`
    EX|Solto|forca|3|10|
    DIA|XYZ|Inválido|
    EX|Perdido|forca|
    DIA|SEX|Braços|
    EX|Rosca|musculacao|abc|12 reps|
    EX||forca|3|
    EX|Prancha|tempo|3|45|
  `);
  expect(plano.dias).toHaveLength(1);
  const [rosca, prancha] = plano.dias[0]!.exercicios;
  expect(rosca).toMatchObject({ tipo: 'forca', series: 3, valor: 12, carga: 0 });
  expect(prancha).toMatchObject({ tipo: 'tempo', valor: 45 });
  expect(plano.avisos).toEqual([
    '"Solto" veio antes de qualquer dia — ignorado.',
    'Dia não reconhecido: "XYZ" — ignorado.',
    '"Perdido" veio antes de qualquer dia — ignorado.',
    'Tipo desconhecido em "Rosca" (musculacao) — tratado como força.',
    'Um exercício veio sem nome e foi ignorado.'
  ]);
});

test('sem bloco ou sem exercícios devolve null', () => {
  expect(parseAiPlan('Aqui está seu plano: supino 3x10')).toBeNull();
  expect(parseAiPlan('[PLANO] DIA|SEG|Vazio| [FIM]')).toBeNull();
  expect(parseAiPlan(undefined)).toBeNull();
});
