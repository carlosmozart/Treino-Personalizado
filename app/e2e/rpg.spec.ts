import { expect, test } from '@playwright/test';

test('modo RPG: ligar no tema Maromba, level up depois do treino e ficha', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.clock.setFixedTime(new Date(2026, 10, 9, 12));
  await page.goto('/');

  await page.getByRole('button', { name: 'Perfil', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Modo RPG' })).toBeVisible();
  await page.getByRole('radio', { name: /^Maromba/ }).click();
  await page.getByRole('radio', { name: 'Personagem feminino' }).click();
  await page.getByRole('button', { name: 'Ligar o modo RPG' }).click();
  await expect(page.getByRole('button', { name: /Personagem: Frango, nível de classe 1/ })).toBeVisible();

  // um treino curto rende o nível 2 de classe: a animação aparece por cima do resumo
  await page.getByRole('button', { name: 'Treino', exact: true }).click();
  await page.getByRole('button', { name: 'Escolher um modelo' }).click();
  await page.getByRole('button', { name: 'Usar PPL do app original' }).click();
  await page.getByRole('button', { name: /^Começar / }).first().click();
  await page.getByRole('article').first().getByRole('button', { name: 'Série 1 feita' }).click();
  await page.getByRole('button', { name: 'Pular' }).click();
  await page.getByRole('button', { name: 'Concluir' }).click();
  await page.getByRole('button', { name: 'Finalizar assim' }).click();
  const levelUp = page.getByRole('dialog', { name: 'Level up' });
  await expect(levelUp).toBeVisible();
  await expect(levelUp).toContainText('LEVEL UP!');
  await expect(levelUp).toContainText('Frango · nível 2');
  await page.waitForTimeout(900); // a animação leva ~1 s para mostrar o texto
  await page.screenshot({ path: 'test-results/rpg-level-up.png' });
  await levelUp.click();
  await expect(levelUp).toBeHidden();

  await page.getByRole('button', { name: 'Perfil', exact: true }).click();
  await page.getByRole('button', { name: /Personagem: Frango, nível de classe 2/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Personagem' });
  await expect(sheet.getByText('Missão de troca de classe')).toHaveCount(0);
  await expect(sheet.getByText('Chegue ao nível de classe 10', { exact: false })).toBeVisible();
  await expect(sheet.getByText('Gladiadora Marombeira', { exact: true })).toBeVisible();
  await sheet.getByRole('radio', { name: /^Clássico/ }).click();
  await expect(sheet.getByText('Espadachim', { exact: true })).toBeVisible();
  await expect(sheet.getByText('Noviça', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/rpg-ficha.png' });

  // as conquistas do RPG aparecem com o modo ligado
  await sheet.getByRole('button', { name: 'Fechar' }).click();
  await page.getByRole('button', { name: 'Progresso', exact: true }).click();
  await page.getByRole('tab', { name: 'Metas' }).click();
  await expect(page.getByText('Escolha do Caminho')).toBeVisible();
  expect(errors).toEqual([]);
});
