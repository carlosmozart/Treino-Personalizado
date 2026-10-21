import { expect, test } from '@playwright/test';

const ANSWER = `Aqui está seu plano.
\`\`\`
[PLANO]
DIA | SEG | Superior | Peito e costas
EX | Supino Reto com Barra | forca | 4 | 8 | 40 | Supino com Halteres
EX | Prancha Abdominal | tempo | 3 | 45 | |
DIA | QUA | Inferior | Pernas
EX | Leg Press 45 | forca | 4 | 10 | |
EX | Esteira | cardio | 1 | 15 | |
[FIM]
\`\`\``;

test('montar com IA: gerar pedido, colar resposta e criar o plano', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await page.getByRole('button', { name: 'Plano', exact: true }).click();
  await page.getByRole('button', { name: 'Montar treino com IA' }).click();
  await page.getByRole('textbox', { name: 'Observações (lesões, dores, equipamentos)' }).fill('Dor no joelho direito');
  await expect(page.getByRole('textbox', { name: 'Pedido para a IA' })).toHaveValue(/Dor no joelho direito/);
  await page.getByRole('button', { name: 'Copiar pedido' }).click();
  await expect(page.getByText(/Pedido copiado/)).toBeVisible();

  await page.getByRole('tab', { name: '2. Colar a resposta' }).click();
  await page.getByRole('textbox', { name: 'Resposta da IA' }).fill('sem bloco nenhum');
  await page.getByRole('button', { name: 'Ler plano' }).click();
  await expect(page.getByText(/Não encontrei o plano no formato do app/)).toBeVisible();
  await page.getByRole('button', { name: 'Copiar pedido de conversão' }).click();
  await expect(page.getByText(/Pedido de conversão copiado/)).toBeVisible();

  await page.getByRole('textbox', { name: 'Resposta da IA' }).fill(ANSWER);
  await page.getByRole('button', { name: 'Ler plano' }).click();
  await expect(page.getByText('2 dias de treino · 4 exercícios')).toBeVisible();
  await page.getByRole('textbox', { name: 'Nome do plano' }).fill('Plano do joelho');
  await page.getByRole('button', { name: 'Criar plano' }).click();
  await expect(page.getByText('“Plano do joelho” criado e ativado.')).toBeVisible();
  await page.getByRole('button', { name: 'Fechar' }).click();
  await expect(page.getByText('Plano do joelho')).toBeVisible();
  await expect(page.getByTestId('dias-semana')).toHaveText('2 dias de treino por semana');
});

test('importar treino feito em IA: pedido de conversão com o treino colado, resposta com faixa de reps', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await page.getByRole('button', { name: 'Plano', exact: true }).click();
  await page.getByRole('button', { name: 'Já tenho um treino feito em IA' }).click();
  await expect(page.getByRole('radio', { name: 'Já tenho um treino' })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('textbox', { name: /O treino está em outro lugar/ }).fill('Treino A – Peito\nSupino reto 4x8-12');
  const prompt = page.getByRole('textbox', { name: 'Pedido de conversão para a IA' });
  await expect(prompt).toHaveValue(/## MEU TREINO\nTreino A – Peito\nSupino reto 4x8-12/);
  await page.getByRole('button', { name: 'Copiar pedido de conversão' }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('Não é para montar um treino novo');

  await page.getByRole('tab', { name: '2. Colar a resposta' }).click();
  await page.getByRole('textbox', { name: 'Resposta da IA' }).fill('```\n[PLANO]\nDIA | SEG | Treino A | Peito\nEX | Supino Reto (Barra) | forca | 4 | 8-12 | |\n[FIM]\n```');
  await page.getByRole('button', { name: 'Ler plano' }).click();
  await expect(page.getByText('1 dia de treino · 1 exercício')).toBeVisible();
  await page.getByRole('button', { name: 'Criar plano' }).click();
  await page.getByRole('button', { name: 'Fechar' }).click();
  await expect(page.getByText('4 × 8–12', { exact: true })).toBeVisible();
});

test('revisar o plano com IA: pedido com o plano atual, mudanças com motivo, aprovar uma a uma', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await page.getByRole('button', { name: 'Plano', exact: true }).click();
  await page.getByRole('button', { name: 'Escolher um modelo' }).click();
  await page.getByRole('button', { name: 'Usar Corpo inteiro 3×' }).click();
  await page.getByRole('button', { name: 'Planos', exact: true }).click();
  await page.getByRole('button', { name: 'Revisar este plano com IA' }).click();
  const prompt = await page.getByRole('textbox', { name: 'Pedido de revisão para a IA' }).inputValue();
  expect(prompt).toContain('EX | Supino Reto (Halteres) | forca | 3 | 10 |');
  expect(prompt).toContain('- Supino Reto (Halteres): ainda não registrado');

  // a "IA" devolve o mesmo plano com duas mudanças na segunda: mais uma série no supino e flexora trocada
  const block = prompt.slice(prompt.indexOf('[PLANO]'), prompt.indexOf('[FIM]') + 5);
  const answer = 'Mudanças:\n- Supino: 4 séries.\n- Mesa Flexora por Cadeira Flexora.\n```\n' + block
    .replace('EX | Supino Reto (Halteres) | forca | 3 | 10 |  | ', 'EX | Supino Reto (Halteres) | forca | 4 | 10 |  |  | mais volume para o peito')
    .replace('EX | Mesa Flexora | forca | 3 | 12 |  | ', 'EX | Cadeira Flexora | forca | 3 | 12 |  |  | a máquina da academia') + '\n```';
  await page.getByRole('tab', { name: '2. Colar a resposta' }).click();
  await page.getByRole('textbox', { name: 'Resposta da IA' }).fill(answer);
  await page.getByRole('button', { name: 'Ver mudanças' }).click();
  await expect(page.getByText('2 mudanças sugeridas. Desmarque o que não quiser.')).toBeVisible();
  await expect(page.getByText('Por quê: mais volume para o peito')).toBeVisible();
  await expect(page.getByText('Mesa Flexora → Cadeira Flexora')).toBeVisible();
  // a troca não é aprovada; só o supino entra
  await page.getByRole('checkbox').nth(1).uncheck();
  await page.getByRole('button', { name: 'Aplicar 1 mudança' }).click();
  await expect(page.getByText('1 mudança aplicada em “Corpo inteiro 3×”.')).toBeVisible();
  await page.getByRole('button', { name: 'Fechar' }).click();
  const segunda = page.getByRole('article', { name: 'Segunda' });
  await expect(segunda).toContainText('4 × 10');
  await expect(segunda).toContainText('Mesa Flexora');
  await expect(segunda).not.toContainText('Cadeira Flexora');
});
