import { expect, test } from '@playwright/test';

test('plano: dias em cartões, adicionar, editar recolhido, descanso e opcional', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto('/');
  await page.getByRole('button', { name: 'Plano', exact: true }).click();
  await page.getByRole('button', { name: 'Usar plano de exemplo' }).click();
  await expect(page.getByTestId('dias-semana')).toHaveText('6 dias de treino por semana');

  // domingo (opcional no exemplo) vira descanso explícito; depois, adicionar no próprio cartão
  const sunday = page.getByRole('article', { name: 'Domingo' });
  await sunday.getByRole('button', { name: 'Editar Domingo' }).click();
  page.once('dialog', d => d.accept());
  await page.getByRole('button', { name: 'Transformar em descanso' }).click();
  await expect(sunday.getByRole('heading', { name: 'Descanso' })).toBeVisible();
  await expect(page.getByTestId('dias-semana')).toHaveText('6 dias de treino por semana');
  await sunday.getByRole('button', { name: 'Adicionar exercício' }).click();
  await page.getByRole('textbox', { name: 'Nome do exercício' }).fill('esteira');
  await page.getByRole('button', { name: 'Esteira', exact: true }).click();
  await expect(sunday.getByText('20 min')).toBeVisible();
  await expect(page.getByTestId('dias-semana')).toHaveText('7 dias de treino por semana');

  // aberto ao adicionar: muda os minutos
  await sunday.getByRole('textbox', { name: 'Minutos de Esteira' }).fill('30');
  await sunday.getByRole('button', { name: /^Esteira/ }).click();
  await expect(sunday.getByText('30 min')).toBeVisible();

  // dia opcional não conta nos dias por semana e o texto descreve o estado (O3, O8)
  await sunday.getByRole('button', { name: 'Editar Domingo' }).click();
  await expect(page.getByText(/sequência é zerada/)).toBeVisible();
  await page.getByRole('checkbox', { name: 'Dia opcional' }).check();
  await expect(page.getByText(/sequência continua/)).toBeVisible();
  await page.getByRole('button', { name: 'Fechar' }).click();
  await expect(page.getByTestId('dias-semana')).toHaveText('6 dias de treino por semana');

  // transformar sábado em descanso
  const saturday = page.getByRole('article', { name: 'Sábado' });
  await saturday.getByRole('button', { name: 'Editar Sábado' }).click();
  page.once('dialog', d => d.accept());
  await page.getByRole('button', { name: 'Transformar em descanso' }).click();
  await expect(saturday.getByRole('heading', { name: 'Descanso' })).toBeVisible();
  await expect(page.getByTestId('dias-semana')).toHaveText('5 dias de treino por semana');

  // sobrevive a recarregar
  await page.waitForTimeout(400);
  await page.reload();
  await page.getByRole('button', { name: 'Plano', exact: true }).click();
  await expect(page.getByRole('article', { name: 'Domingo' }).getByText('30 min')).toBeVisible();
  await page.screenshot({ path: 'test-results/plano.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('plano: nome e horário do treino', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Plano', exact: true }).click();
  await page.getByRole('button', { name: 'Usar plano de exemplo' }).click();
  await page.getByRole('button', { name: 'Planos' }).click();
  await page.getByRole('textbox', { name: 'Nome do plano' }).fill('Meu PPL');
  await page.getByLabel('Horário do treino').fill('18:30');
  await page.getByRole('button', { name: 'Fechar' }).click();
  await expect(page.getByText('Meu PPL')).toBeVisible();
  await page.waitForTimeout(400);
  await page.reload();
  await page.getByRole('button', { name: 'Plano', exact: true }).click();
  await page.getByRole('button', { name: 'Planos' }).click();
  await expect(page.getByLabel('Horário do treino')).toHaveValue('18:30');
});

test('plano: reserva, opcional e duplicar', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Plano', exact: true }).click();
  await page.getByRole('button', { name: 'Usar plano de exemplo' }).click();
  const monday = page.getByRole('article', { name: 'Segunda' });
  await monday.getByRole('button', { expanded: false }).first().click();
  const reserve = monday.getByRole('combobox', { name: /^Reserva de / });
  await reserve.fill('Supino Reto (Halteres)');
  await monday.getByRole('button', { name: 'Adicionar', exact: true }).click();
  await expect(monday.getByRole('button', { name: 'Remover reserva Supino Reto (Halteres)' })).toBeVisible();
  await monday.getByRole('checkbox', { name: 'Exercício opcional' }).check();

  await page.getByRole('button', { name: 'Planos' }).click();
  await page.getByRole('button', { name: 'Duplicar este plano' }).click();
  await expect(page.getByText(/^Cópia de /)).toBeVisible();
});
