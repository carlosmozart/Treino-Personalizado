import { expect, test } from '@playwright/test';

test('descanso por exercício: no cartão do treino, guardado no plano, e reps no começo da faixa', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.clock.setFixedTime(new Date(2026, 10, 3, 10));
  await page.goto('/');
  await page.getByRole('button', { name: 'Treino', exact: true }).click();
  await page.getByRole('button', { name: 'Escolher um modelo' }).click();
  await page.getByRole('button', { name: 'Usar PPL do app original' }).click();
  await page.getByRole('button', { name: /^Começar / }).first().click();

  const card = page.getByRole('article').first();
  const name = (await card.getAttribute('aria-label'))!;
  // o descanso fica à vista no cartão; um toque abre a escolha
  await card.getByRole('button', { name: new RegExp(`^Descanso de .*: .*\. Mudar$`) }).click();
  await page.getByRole('radio', { name: 'Próprio' }).click();
  await page.getByRole('listbox', { name: 'Descanso deste exercício: minutos' }).getByRole('option', { name: '2' }).click();
  await page.getByRole('listbox', { name: 'Descanso deste exercício: segundos' }).getByRole('option', { name: '30' }).click();
  await expect(page.getByRole('checkbox', { name: /Guardar no plano/ })).toBeChecked();
  await page.screenshot({ path: 'test-results/descanso-exercicio.png' });
  await page.getByRole('button', { name: 'Salvar: 2:30' }).click();
  await expect(card.getByRole('button', { name: `Descanso de ${name}: 2:30. Mudar` })).toBeVisible();
  await card.screenshot({ path: 'test-results/descanso-cartao.png' });

  // a série marcada usa o descanso do exercício
  await card.getByRole('button', { name: 'Série 1 feita' }).click();
  await expect(page.getByRole('timer', { name: 'Descanso' })).toContainText(/2:(30|29|28)/);
  await page.getByRole('button', { name: 'Pular' }).click();

  // guardado no plano: aparece no resumo do exercício
  await page.getByRole('button', { name: 'Plano', exact: true }).click();
  await expect(page.getByText(/descanso 2:30/).first()).toBeVisible();
  await page.getByText(/descanso 2:30/).first().click();
  await page.screenshot({ path: 'test-results/descanso-plano.png' });
  expect(errors).toEqual([]);
});
