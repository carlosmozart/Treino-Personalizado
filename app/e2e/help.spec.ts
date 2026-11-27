import { expect, test, type Page } from '@playwright/test';

const watchErrors = (page: Page) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  return errors;
};

test('tour guiado: convite no Início, passa pelas abas e não volta depois de concluído', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  const invite = page.getByRole('region', { name: 'Tour do app' });
  await expect(invite).toBeVisible();
  await invite.getByRole('button', { name: 'Fazer o tour' }).click();

  await expect(page.getByRole('dialog', { name: 'Tour do app: Um giro rápido pelo app' })).toBeVisible();
  await page.getByRole('button', { name: 'Próximo' }).click();
  await expect(page.getByRole('dialog', { name: 'Tour do app: Início' })).toBeVisible();
  await expect(page.getByTestId('destaque-do-tour')).toBeVisible();
  for (const title of ['Plano', 'Treino', 'Progresso', 'Perfil']) {
    await page.getByRole('button', { name: 'Próximo' }).click();
    await expect(page.getByRole('dialog', { name: `Tour do app: ${title}` })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Voltar' }).click();
  await expect(page.getByRole('dialog', { name: 'Tour do app: Progresso' })).toBeVisible();
  await page.getByRole('button', { name: 'Próximo' }).click();
  await page.getByRole('button', { name: 'Próximo' }).click();
  await expect(page.getByRole('dialog', { name: 'Tour do app: Ficou com dúvida?' })).toBeVisible();
  await page.getByRole('button', { name: 'Concluir' }).click();
  await expect(page.getByRole('dialog', { name: /^Tour do app/ })).toHaveCount(0);
  await expect(invite).toHaveCount(0);

  await page.waitForTimeout(400); // o app salva 250 ms depois da mudança
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Início' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Tour do app' })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('tour: dispensar esconde o convite; a Ajuda refaz o tour', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Dispensar o tour' }).click();
  await expect(page.getByRole('region', { name: 'Tour do app' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Plano', exact: true }).click();
  await page.getByRole('button', { name: 'Ajuda: onde fica cada função' }).click();
  await page.getByRole('dialog', { name: 'Ajuda' }).getByRole('button', { name: 'Fazer o tour do app' }).click();
  await expect(page.getByRole('dialog', { name: 'Tour do app: Um giro rápido pelo app' })).toBeVisible();
  // o tour sempre começa no Início
  await expect(page.getByRole('button', { name: 'Início', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: /^Tour do app/ })).toHaveCount(0);
});

test('ligar o Protocolo diz onde ele fica e leva até lá', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Perfil', exact: true }).click();
  await page.getByRole('switch', { name: 'Protocolo: hormônios, peptídeos e medicamentos' }).check();
  const notice = page.getByRole('status').filter({ hasText: 'Protocolo ligado.' });
  await expect(notice).toContainText('Progresso › Protocolo');
  await notice.getByRole('button', { name: 'Abrir o Protocolo' }).click();
  await expect(page.getByRole('heading', { name: 'Progresso' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Protocolo' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('Nenhum protocolo ainda.')).toBeVisible();

  // desligar e religar mostra o aviso de novo; "Entendi" fecha
  await page.getByRole('button', { name: 'Perfil', exact: true }).click();
  await expect(page.getByText('Protocolo ligado.')).toHaveCount(0);
  const toggle = page.getByRole('switch', { name: 'Protocolo: hormônios, peptídeos e medicamentos' });
  await toggle.uncheck();
  await toggle.check();
  await page.getByRole('button', { name: 'Entendi' }).click();
  await expect(page.getByText('Protocolo ligado.')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('Ajuda: abre na área da tela, busca sem acento e "Ir até lá" destaca a função', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Progresso', exact: true }).click();
  await page.getByRole('button', { name: 'Ajuda: onde fica cada função' }).click();
  const help = page.getByRole('dialog', { name: 'Ajuda' });
  await expect(help.getByRole('radio', { name: 'Progresso' })).toHaveAttribute('aria-checked', 'true');
  await expect(help.getByRole('button', { name: 'Histórico dos treinos' })).toBeVisible();
  await expect(help.getByRole('button', { name: 'Backup dos dados' })).toHaveCount(0);

  // a busca procura em todas as áreas
  await help.getByRole('searchbox', { name: 'Buscar na ajuda' }).fill('hormonio');
  await help.getByRole('button', { name: 'Protocolo: doses, diário e exames' }).click();
  await expect(help.getByText('Está desligado. Ligue em Perfil › Saúde › Protocolo.')).toBeVisible();
  await help.getByRole('button', { name: 'Ir até onde se liga' }).click();
  await expect(help).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Perfil', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('[data-help="protocolo-ligar"]')).toHaveClass(/help-flash/);

  // ligado, o mesmo tópico leva direto à aba Protocolo
  await page.getByRole('switch', { name: 'Protocolo: hormônios, peptídeos e medicamentos' }).check();
  await page.getByRole('button', { name: 'Ajuda: onde fica cada função' }).click();
  await help.getByRole('searchbox', { name: 'Buscar na ajuda' }).fill('frasco');
  await help.getByRole('button', { name: 'Protocolo: doses, diário e exames' }).click();
  await help.getByRole('button', { name: 'Ir até lá' }).click();
  await expect(page.getByRole('tab', { name: 'Protocolo' })).toHaveAttribute('aria-selected', 'true');

  // nada encontrado; o voltar do Android fecha a Ajuda
  await page.getByRole('button', { name: 'Ajuda: onde fica cada função' }).click();
  await help.getByRole('searchbox', { name: 'Buscar na ajuda' }).fill('xyzzy');
  await expect(help.getByRole('status')).toContainText('Nada encontrado');
  await page.goBack();
  await expect(help).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Progresso' })).toBeVisible();
  expect(errors).toEqual([]);
});
