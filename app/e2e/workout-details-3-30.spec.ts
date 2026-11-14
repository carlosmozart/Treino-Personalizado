import { expect, test } from '@playwright/test';

test('prancha com cronômetro 3-2-1 que marca a série, e a próxima começa sozinha (V17); nível na bicicleta (W19); tempo do exercício no histórico (V14)', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.clock.install({ time: new Date(2026, 10, 16, 10) }); // segunda
  await page.goto('/');
  await page.getByRole('button', { name: 'Treino', exact: true }).click();
  await page.getByRole('button', { name: 'Escolher um modelo' }).click();
  await page.getByRole('button', { name: 'Usar Em casa 3×' }).click();
  await page.getByRole('button', { name: /^Começar / }).first().click();

  const plank = page.getByRole('article', { name: 'Prancha Isométrica' });
  const start = plank.getByRole('button', { name: /^Começar a série 1 \(\d+ s\)$/ });
  const seconds = Number(/\((\d+) s\)/.exec((await start.textContent())!)![1]);
  await start.click();
  const timer = page.getByRole('timer', { name: 'Cronômetro de Prancha Isométrica' });
  await expect(timer).toContainText('3…');
  await page.screenshot({ path: 'test-results/prancha-3-2-1.png' });
  await page.clock.fastForward((3 + seconds) * 1000 + 500);
  await expect(plank.getByRole('button', { name: 'Série 1 feita' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('timer', { name: 'Descanso' })).toBeVisible();
  // o fim do descanso começa a série 2 sozinho
  await page.getByRole('button', { name: 'Pular' }).click();
  await expect(timer).toContainText('…');
  await timer.getByRole('button', { name: 'Cancelar' }).click();
  await expect(timer).toHaveCount(0);

  // bicicleta com nível
  await page.getByRole('button', { name: 'Adicionar exercício' }).click();
  await page.getByRole('textbox', { name: 'Buscar exercício para adicionar' }).fill('Bicicleta Ergométrica');
  await page.getByRole('button', { name: /Bicicleta Ergométrica/ }).first().click();
  const bike = page.getByRole('article', { name: 'Bicicleta Ergométrica' });
  await bike.getByRole('textbox', { name: 'Nível de resistência' }).fill('8');
  await bike.getByRole('button', { name: 'Cardio de Bicicleta Ergométrica feito' }).click();

  // dois minutos depois, mais uma série da prancha à mão
  await page.clock.fastForward('02:00');
  await plank.getByRole('button', { name: 'Série 2 feita' }).click();
  await page.getByRole('button', { name: 'Pular' }).click();
  await timer.getByRole('button', { name: 'Cancelar' }).click();
  await page.getByRole('button', { name: 'Concluir' }).click();
  await page.getByRole('button', { name: /Finalizar/ }).click();
  await page.getByRole('button', { name: 'Fechar' }).click();
  await page.clock.fastForward('00:01');

  await page.getByRole('button', { name: 'Progresso', exact: true }).click();
  await page.getByRole('tab', { name: 'Histórico' }).click();
  await page.getByRole('button', { name: /^16/ }).first().click();
  await expect(page.getByRole('button', { name: 'Corrigir Bicicleta Ergométrica' })).toContainText('nível 8');
  await expect(page.getByRole('button', { name: 'Corrigir Prancha Isométrica' })).toContainText(/· \d+ min/);
  expect(errors).toEqual([]);
});

test('pilha da máquina no plano (T23)', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Treino', exact: true }).click();
  await page.getByRole('button', { name: 'Escolher um modelo' }).click();
  await page.getByRole('button', { name: 'Usar PPL do app original' }).click();
  await page.getByRole('button', { name: 'Plano', exact: true }).click();
  const day = page.getByRole('article').first();
  await day.getByRole('button', { name: /^Supino/ }).first().click();
  await day.getByRole('textbox', { name: /^Pilha da máquina de / }).fill('5-100/5');
  await expect(day.getByText('20 pesos: 5, 10, 15 … 100')).toBeVisible();
  await day.getByRole('button', { name: 'Salvar a pilha' }).click();
  await expect(day.getByText(/· pilha/).first()).toBeVisible();
});
