import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { test, expect } from '@playwright/test';

const root = process.cwd();
const mimeTypes = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml' };
let server;
let baseUrl;

test.beforeAll(async () => {
  server = createServer(async (request, response) => {
    const url = new URL(request.url || '/', 'http://localhost');
    // O service worker do app força uma recarga ao assumir o controle. Ele é
    // validado no pacote de release; aqui isolamos os fluxos da interface.
    if (url.pathname === '/sw.js') {
      response.writeHead(404).end();
      return;
    }
    const relative = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).replace(/^\/+/, '');
    const file = resolve(root, relative);
    if (!file.startsWith(`${root}${sep}`) && file !== resolve(root, 'index.html')) {
      response.writeHead(403).end();
      return;
    }
    try {
      response.writeHead(200, { 'content-type': mimeTypes[extname(file)] || 'application/octet-stream' });
      response.end(await readFile(file));
    } catch (_) {
      response.writeHead(404).end();
    }
  });
  await new Promise(resolveServer => server.listen(0, '127.0.0.1', resolveServer));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.afterAll(async () => new Promise(resolveServer => server.close(resolveServer)));

async function completeOnboarding(page) {
  await page.waitForTimeout(150);
  await page.locator('#onbName').fill('Pessoa Teste');
  await page.locator('#onbBirthdate').fill('1995-09-19');
  await page.locator('#onbHeight').fill('175');
  await page.locator('#onbWeight').fill('70');
  await page.getByRole('button', { name: 'Começar' }).click();
  await expect(page.locator('#onboardingOverlay')).toBeHidden();
}

test('onboarding leva a uma tela de treino utilizável', async ({ page }) => {
  await page.goto(baseUrl);
  await expect(page.locator('#onboardingOverlay')).toBeVisible();
  await expect(page.locator('#appVersion')).not.toHaveText('');
  await completeOnboarding(page);
  await expect(page.locator('#workoutSelect')).toBeVisible();
  await expect(page.locator('#restSoundToggle')).toHaveAttribute('aria-pressed', /true|false/);
});

test('concluir todos os exercícios registra check-in e histórico', async ({ page }) => {
  await page.goto(baseUrl);
  await completeOnboarding(page);

  const concluir = page.locator('#exercisesContainer button[title="Marcar como concluído"]');
  const total = await concluir.count();
  expect(total).toBeGreaterThan(0);
  for (let index = 0; index < total; index++) await concluir.nth(index).click();

  await page.waitForTimeout(700);
  await page.locator('#navPerfil').click();
  await page.locator('#perfilSubProgresso').click();
  await expect(page.locator('#workoutHistoryCount')).toHaveText('1');
  await expect(page.locator('#workoutHistoryList')).not.toContainText('Nenhum treino registrado ainda');
});

test('importa um plano válido retornado pela IA após a conferência', async ({ page }) => {
  await page.goto(baseUrl);
  await completeOnboarding(page);
  await page.locator('#navPlanos').click();
  await page.getByRole('button', { name: /Montar treino com IA/ }).click();

  await page.locator('#aiImportInput').fill(`
    [PLANO]
    DIA|SEG|Peito e tríceps|Hipertrofia|
    EX|Supino Reto|forca|3|10|40|Crucifixo máquina|
    EX|Tríceps na polia|forca|3|12|20|
    DIA|QUA|Costas|Hipertrofia|
    EX|Puxada Frontal|forca|3|12|35|
    [FIM]
  `);
  await page.getByRole('button', { name: /Ler plano/ }).click();
  await expect(page.locator('#aiImportOverlay')).toBeVisible();
  await expect(page.locator('#aiImportSummary')).toContainText('2');
  await expect(page.locator('#aiImportDays')).toContainText('Supino Reto');
  await page.locator('#aiImportName').fill('Plano automatizado de teste');
  await page.getByRole('button', { name: 'Criar plano' }).click();

  await expect(page.locator('#aiImportOverlay')).toBeHidden();
  await expect(page.locator('#profileList')).toContainText('Plano automatizado de teste');
});

test('reconhece a segunda variação de bloco de plano da IA', async ({ page }) => {
  await page.goto(baseUrl);
  await completeOnboarding(page);
  await page.locator('#navPlanos').click();
  await page.getByRole('button', { name: /Montar treino com IA/ }).click();

  await page.locator('#aiImportInput').fill(`
    Aqui está seu plano adaptado. Revise a execução e a progressão semanal.
    =PLANO=
    DIA | TER | Pernas | Quadríceps e posteriores |
    EX | Agachamento guiado | forca | 4 | 8 | 60 | Leg press |
    EX | Mesa flexora | forca | 3 | 12 | 25 |
    DIA | SEX | Ombros | Deltoides |
    EX | Elevação lateral | forca | 3 | 15 | 8 |
    =FIM=
  `);
  await page.getByRole('button', { name: /Ler plano/ }).click();

  await expect(page.locator('#aiImportOverlay')).toBeVisible();
  await expect(page.locator('#aiImportSummary')).toContainText('2');
  await expect(page.locator('#aiImportDays')).toContainText('Agachamento guiado');
  await expect(page.locator('#aiImportDays')).toContainText('Elevação lateral');
});

test('explica como corrigir uma resposta de IA sem bloco importável', async ({ page }) => {
  await page.goto(baseUrl);
  await completeOnboarding(page);
  await page.locator('#navPlanos').click();
  await page.getByRole('button', { name: /Montar treino com IA/ }).click();

  const invalidResponse = 'Treine peito duas vezes por semana e aumente a carga aos poucos.';
  await page.locator('#aiImportInput').fill(invalidResponse);
  await page.getByRole('button', { name: /Ler plano/ }).click();

  await expect(page.locator('#aiImportOverlay')).toBeHidden();
  await expect(page.locator('#aiImportError')).toBeVisible();
  await expect(page.locator('#aiImportError')).toContainText('[PLANO]');
  await expect(page.locator('#aiImportErrorSnippet')).toHaveText(invalidResponse);
  await expect(page.getByRole('button', { name: /Copiar formato para enviar à IA/ })).toBeVisible();
});

test('migra o histórico existente para IndexedDB', async ({ page }) => {
  const legacyLog = {
    'supino-reto': [{ type: 'forca', name: 'Supino Reto', date: '2026-09-19', series: [{ reps: 10, weight: 40 }] }]
  };
  const legacyExerciseHistory = {
    'supino-reto': legacyLog['supino-reto'][0]
  };
  await page.addInitScript(value => localStorage.setItem('treino_session_log', JSON.stringify(value)), legacyLog);
  await page.addInitScript(value => localStorage.setItem('treino_exercise_history', JSON.stringify(value)), legacyExerciseHistory);
  await page.goto(baseUrl);
  await expect(page.locator('#appVersion')).not.toHaveText('');

  const migrated = await page.evaluate(async () => new Promise((resolve, reject) => {
    const request = indexedDB.open('treino-session-log', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const transaction = request.result.transaction('state', 'readonly');
      const store = transaction.objectStore('state');
      const sessionRead = store.get('current');
      const historyRead = store.get('exerciseHistory');
      transaction.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => resolve({ sessionLog: sessionRead.result, exerciseHistory: historyRead.result });
    };
  }));

  expect(migrated).toEqual({ sessionLog: legacyLog, exerciseHistory: legacyExerciseHistory });
});

test('mantém o IndexedDB como fonte do histórico após recarregar', async ({ page }) => {
  const indexedLog = {
    'remada-baixa': [{ type: 'forca', name: 'Remada Baixa', date: '2026-09-18', series: [{ reps: 12, weight: 35 }] }]
  };
  const staleLocalLog = {
    'supino-reto': [{ type: 'forca', name: 'Dados antigos', date: '2026-09-10', series: [{ reps: 1, weight: 1 }] }]
  };
  await page.addInitScript(value => localStorage.setItem('treino_session_log', JSON.stringify(value)), indexedLog);
  await page.goto(baseUrl);
  await expect(page.locator('#appVersion')).not.toHaveText('');

  await page.evaluate(value => localStorage.setItem('treino_session_log', JSON.stringify(value)), staleLocalLog);
  await page.reload();
  await expect(page.locator('#appVersion')).not.toHaveText('');

  const persisted = await page.evaluate(async () => new Promise((resolve, reject) => {
    const request = indexedDB.open('treino-session-log', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const read = request.result.transaction('state', 'readonly').objectStore('state').get('current');
      read.onerror = () => reject(read.error);
      read.onsuccess = () => resolve(read.result);
    };
  }));

  expect(persisted).toEqual(indexedLog);
});
