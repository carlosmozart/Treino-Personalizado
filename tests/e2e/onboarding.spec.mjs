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

test('agenda os sete dias e substitui os lembretes antigos', async ({ page }) => {
  await page.goto(baseUrl);
  await completeOnboarding(page);
  const calls = await page.evaluate(async () => {
    const calls = [];
    const original = localNotifications;
    // Substitui apenas a ponte nativa: o agendamento executa o código real do app.
    localNotifications = () => ({
      checkPermissions: async () => ({ display: 'granted' }),
      cancel: async payload => calls.push({ type: 'cancel', ...payload }),
      createChannel: async () => {},
      schedule: async payload => calls.push({ type: 'schedule', ...payload })
    });
    try {
      settings.trainingReminders = true;
      const profile = getActiveProfile();
      profile.trainingTime = '07:35';
      profile.schedule = Object.fromEntries(DAY_ORDER.map(day => [day, {
        name: day, optional: false, exercises: [{ name: 'Supino' }]
      }]));
      await syncTrainingReminders(false);
      profile.schedule.SEG.optional = true;
      profile.schedule.TER.exercises = [];
      profile.schedule.QUA.exercises = [{ name: '  ' }];
      await syncTrainingReminders(false);
      for (const day of DAY_ORDER) profile.schedule[day].exercises = [];
      await syncTrainingReminders(false);
      return calls;
    } finally {
      localNotifications = original;
    }
  });
  expect(calls.map(call => call.type)).toEqual(['cancel', 'schedule', 'cancel', 'schedule', 'cancel']);
  expect(calls[1].notifications.map(n => n.schedule.on)).toEqual(
    [2, 3, 4, 5, 6, 7, 1].map(weekday => ({ weekday, hour: 7, minute: 35 })));
  const ids = [4100, 4101, 4102, 4103, 4104, 4105, 4106];
  expect(calls[1].notifications.map(n => n.id)).toEqual(ids);
  expect(calls[3].notifications.map(n => n.schedule.on.weekday)).toEqual([5, 6, 7, 1]);
  for (const call of calls.filter(call => call.type === 'cancel')) {
    expect(call.notifications.map(n => n.id)).toEqual(ids);
  }
});

test('descanso respeita som e vibração em cada combinação', async ({ page }) => {
  await page.goto(baseUrl);
  await completeOnboarding(page);
  const result = await page.evaluate(async () => {
    const scheduled = [];
    const original = localNotifications;
    localNotifications = () => ({
      checkPermissions: async () => ({ display: 'granted' }),
      createChannel: async () => {},
      schedule: async payload => scheduled.push(payload.notifications[0])
    });
    try {
      settings.restBackgroundNotification = true;
      restTimer.running = true;
      restTimer.endsAt = Date.now() + 60000;
      for (const [sound, vibrate] of [[true, true], [true, false], [false, true], [false, false]]) {
        settings.restSound = sound;
        settings.restVibrate = vibrate;
        await scheduleRestBackgroundNotification();
      }
      settings.restBackgroundNotification = false;
      await scheduleRestBackgroundNotification();
      return scheduled;
    } finally {
      restTimer.running = false;
      localNotifications = original;
    }
  });
  expect(result).toHaveLength(4);
  expect(result.map(n => n.channelId)).toEqual([
    'treino-descanso-v3', 'treino-descanso-v3-sound', 'treino-descanso-v3-vibrate', 'treino-descanso-v3-silent'
  ]);
  expect(result.map(n => n.sound)).toEqual(['default', 'default', undefined, undefined]);
  expect(result.map(n => n.vibrate)).toEqual([true, false, true, false]);
  for (const notification of result) {
    expect(notification.id).toBe(4199);
    expect(notification.isExactNotification).toBe(true);
    expect(notification.schedule.allowWhileIdle).toBe(true);
  }
});

test('cadastro recusa altura e peso não positivos antes de salvar', async ({ page }) => {
  await page.goto(baseUrl);
  await page.locator('#onbName').fill('Pessoa Teste');
  await page.locator('#onbBirthdate').fill('1995-09-19');
  const before = await page.evaluate(() => localStorage.getItem('treino_user_profile'));
  for (const [height, weight] of [['-170', '70'], ['170', '-70'], ['0', '70'], ['170', '0']]) {
    await page.locator('#onbHeight').fill(height);
    await page.locator('#onbWeight').fill(weight);
    await page.getByRole('button', { name: 'Começar' }).click();
    await expect(page.locator('#onboardingError')).toContainText('maior que zero');
    await expect(page.locator('#onboardingOverlay')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('treino_user_profile'))).toBe(before);
  }
  await completeOnboarding(page);
});

test('edição inválida preserva perfil e histórico; correção permite salvar', async ({ page }) => {
  await page.goto(baseUrl);
  await completeOnboarding(page);
  await page.locator('#navPerfil').click();
  const before = await page.evaluate(() => ({ memory: JSON.stringify(userProfile), stored: localStorage.getItem(PROFILE_KEY) }));
  for (const [id, value] of [['profileHeight', '-175'], ['profileWeight', '0'], ['profileTargetWeight', '-70'], ['profileBodyFat', '100']]) {
    await page.evaluate(({ id, value }) => { document.getElementById(id).value = value; }, { id, value });
    await page.locator('#btnSaveProfile').click();
    await expect(page.locator('#profileValidationError')).toBeVisible();
    expect(await page.evaluate(() => ({ memory: JSON.stringify(userProfile), stored: localStorage.getItem(PROFILE_KEY) }))).toEqual(before);
    await page.evaluate(id => { document.getElementById(id).value = id === 'profileHeight' ? '175' : id === 'profileWeight' ? '70' : ''; }, id);
  }
  await page.locator('#profileWeight').fill('71.5');
  await page.locator('#btnSaveProfile').click();
  await expect(page.locator('#profileValidationError')).toBeHidden();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem(PROFILE_KEY)));
  expect(saved.weight).toBe('71.5');
  expect(saved.weightHistory.at(-1).weight).toBe(71.5);
});

test('campos e configurações possuem nomes acessíveis e suporte a teclado', async ({ page }) => {
  await page.goto(baseUrl);
  for (const name of ['Nome', 'Data de Nascimento', 'Altura (cm)', 'Peso (kg)', 'Sexo', 'Atividade']) {
    await expect(page.locator('#onboardingOverlay').getByLabel(name, { exact: true })).toBeVisible();
  }
  await expect(page.locator('#onboardingError')).toHaveAttribute('role', 'alert');
  await completeOnboarding(page);
  await page.locator('#navPerfil').click();
  for (const name of ['Nome', 'Data de Nascimento', 'Altura (cm)', 'Peso Atual (kg)', 'Peso Alvo (kg)', 'Sexo', 'Nível de Atividade']) {
    await expect(page.locator('#perfilSubDadosContent').getByLabel(name, { exact: true })).toBeVisible();
  }
  await page.locator('#perfilSubSaude').click();
  await page.getByRole('button', { name: /Katch-McArdle/ }).click();
  await expect(page.locator('#profileBodyFat')).toHaveAccessibleName('% de Gordura Corporal');
  await page.locator('#perfilSubDados').click();
  await expect(page.locator('#restSecondsInput')).toHaveAccessibleName('Tempo padrão de descanso em segundos');
  for (const [id, name] of [['restAutoStartToggle', 'Iniciar descanso automaticamente'], ['restSoundToggle', 'Apitar ao terminar'], ['restVibrateToggle', 'Vibrar ao terminar']]) {
    const toggle = page.locator('#' + id);
    await expect(toggle).toHaveAccessibleName(name);
    const before = await toggle.getAttribute('aria-pressed');
    await toggle.focus();
    await page.keyboard.press('Space');
    await expect(toggle).toHaveAttribute('aria-pressed', before === 'true' ? 'false' : 'true');
    await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-pressed', before);
  }
  for (const id of ['trainingRemindersToggle', 'restBackgroundNotificationToggle']) {
    await expect(page.locator('#' + id)).toHaveAccessibleName(/.+/);
    await expect(page.locator('#' + id)).toBeDisabled();
  }
});

test('meta mostra checkpoints em tela pequena', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(baseUrl);
  await completeOnboarding(page);
  await page.locator('#navPerfil').click();
  await page.locator('#perfilSubProgresso').click();
  for (const [weight, percent, reached] of [[100, 0, 0], [95, 25, 1], [90, 50, 2], [85, 75, 3], [80, 100, 4], [78, 100, 4], [101, 0, 0]]) {
    await page.evaluate(weight => {
      userProfile.weightHistory = [{ date: '2026-01-01', weight: 100, imc: 30 }];
      userProfile.weight = weight;
      userProfile.targetWeight = 80;
      renderGoalRoadmap();
    }, weight);
    await expect(page.locator('#goalProgressBar')).toHaveAttribute('aria-valuenow', String(percent));
    await expect(page.locator('#goalCheckpoints li')).toHaveCount(4);
    await expect(page.locator('#goalCheckpoints li').filter({ hasText: 'Alcançado' })).toHaveCount(reached);
    await expect(page.locator('#goalEncouragement')).not.toBeEmpty();
  }
  await expect(page.locator('#goalCheckpoints li').first()).toContainText('95 kg');
  expect(await page.locator('#goalRoadmapSection').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.evaluate(() => { userProfile.targetWeight = 60; renderGoalRoadmap(); });
  await expect(page.locator('#goalCheckpoints li').first()).toContainText('90 kg');
});

test('nova meta fixa o início sem apagar histórico e persiste ao reabrir', async ({ page }) => {
  await page.goto(baseUrl);
  await completeOnboarding(page);
  await page.evaluate(() => {
    userProfile.weight = '90'; userProfile.targetWeight = '80';
    userProfile.weightHistory = [{ date: '2026-01-01', weight: 100, imc: 30 }];
    saveJSON(PROFILE_KEY, userProfile);
  });
  await page.locator('#navPerfil').click();
  await page.locator('#perfilSubProgresso').click();
  await expect(page.locator('#goalStartWeight')).toHaveText('100 kg');
  await page.getByRole('button', { name: 'Iniciar nova meta com o peso atual', exact: true }).click();
  await page.getByRole('button', { name: 'Iniciar nova meta', exact: true }).click();
  await expect(page.locator('#goalStartWeight')).toHaveText('90 kg');
  await expect(page.locator('#goalProgressBar')).toHaveAttribute('aria-valuenow', '0');
  expect(await page.evaluate(() => userProfile.weightHistory.length)).toBe(1);
  await page.reload();
  await page.locator('#navPerfil').click();
  await page.locator('#perfilSubProgresso').click();
  await expect(page.locator('#goalStartWeight')).toHaveText('90 kg');
  await page.locator('#perfilSubDados').click();
  await page.locator('#profileWeight').fill('85');
  await page.locator('#btnSaveProfile').click();
  await page.locator('#perfilSubProgresso').click();
  await expect(page.locator('#goalProgressBar')).toHaveAttribute('aria-valuenow', '50');
  await expect(page.locator('#goalCheckpoints li').filter({ hasText: 'Conquistado em' })).toHaveCount(2);
  const conquered = await page.evaluate(() => userProfile.weightGoal.checkpoints);
  await page.locator('#perfilSubDados').click();
  await page.locator('#profileWeight').fill('89');
  await page.locator('#btnSaveProfile').click();
  await page.reload();
  await page.locator('#navPerfil').click();
  await page.locator('#perfilSubProgresso').click();
  await expect(page.locator('#goalCheckpoints li').first()).toContainText('preservado após oscilação');
  expect(await page.evaluate(() => userProfile.weightGoal.checkpoints)).toEqual(conquered);
  await page.locator('#perfilSubDados').click();
  await page.locator('#profileWeight').fill('85');
  await page.locator('#profileTargetWeight').fill('75');
  await page.locator('#btnSaveProfile').click();
  await page.locator('#perfilSubProgresso').click();
  await expect(page.locator('#goalStartWeight')).toHaveText('85 kg');
  await expect(page.locator('#goalCheckpoints li').filter({ hasText: 'Conquistado em' })).toHaveCount(0);
  await expect(page.locator('#goalProgressBar')).toHaveAttribute('aria-valuenow', '0');
  expect(await page.evaluate(() => userProfile.weightHistory[0].weight)).toBe(100);
});

test('histórico exibe média móvel sem modificar o peso atual', async ({ page }) => {
  await page.goto(baseUrl);
  await completeOnboarding(page);
  await page.locator('#navPerfil').click();
  await page.locator('#perfilSubProgresso').click();
  const result = await page.evaluate(() => {
    userProfile.weightHistory = [80, 82, 84, 86, 88, 90, 92, 94].map((weight, index) => ({ date: `2026-09-${10 + index}`, weight, imc: 25 }));
    const before = userProfile.weight;
    renderWeightHistory();
    return { before, after: userProfile.weight };
  });
  await expect(page.locator('#weightTrendSummary')).toHaveText('Média dos últimos 7 registros: 88 kg');
  await expect(page.locator('#weightHistoryList path[data-trend]')).toHaveCount(1);
  await page.locator('#weightHistoryList').getByRole('button', { name: '5', exact: true }).click();
  const graph = page.locator('#weightHistoryList svg[role="img"]');
  const size = await graph.boundingBox();
  await graph.click({ position: { x: size.width - 8, y: 30 } });
  await expect(page.locator('#nameTooltip')).toContainText('94kg');
  await page.locator('#weightHistoryList').getByRole('button', { name: 'Tudo', exact: true }).click();
  expect(result.before).toBe(result.after);
});

test('linha do alvo fica visível para metas acima e abaixo do histórico', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(baseUrl);
  await completeOnboarding(page);
  await page.locator('#navPerfil').click();
  await page.locator('#perfilSubProgresso').click();
  for (const target of [60, 100, 80]) {
    await page.evaluate(target => {
      userProfile.targetWeight = target;
      userProfile.weightHistory = [80, 82, 84].map((weight, i) => ({ date: `2026-09-${10 + i}`, weight, imc: 25 }));
      renderWeightHistory();
    }, target);
    await expect(page.locator('#weightTargetLegend')).toContainText(`${target} kg`);
    const line = page.locator('#weightHistoryList line[data-target]');
    await expect(line).toHaveCount(1);
    const y = Number(await line.getAttribute('y1'));
    expect(y).toBeGreaterThanOrEqual(6);
    expect(y).toBeLessThanOrEqual(94);
    expect(await line.getAttribute('y2')).toBe(await line.getAttribute('y1'));
  }
  await page.evaluate(() => { userProfile.targetWeight = ''; renderWeightHistory(); });
  await expect(page.locator('#weightHistoryList line[data-target]')).toHaveCount(0);
  await expect(page.locator('#weightTargetLegend')).toHaveCount(0);
});

test('cartões de saúde atualizam fórmula, água e peso', async ({ page }) => {
  await page.goto(baseUrl);
  await completeOnboarding(page);
  await page.locator('#navPerfil').click();
  await page.locator('#perfilSubSaude').click();
  await expect(page.locator('#imcValue')).toHaveText('22.9');
  const before = await page.locator('#tmbValue').textContent();
  await page.getByRole('button', { name: 'Harris-Benedict', exact: true }).click();
  await expect(page.locator('#tmbValue')).not.toHaveText(before);
  await page.getByRole('button', { name: 'Katch-McArdle', exact: true }).click();
  await expect(page.locator('#tmbValue')).toHaveText('--');
  await page.locator('#profileBodyFat').fill('20');
  await page.locator('#perfilSubDados').click();
  await page.locator('#profileWeight').fill('80');
  await page.locator('#btnSaveProfile').click();
  await page.locator('#perfilSubSaude').click();
  await expect(page.locator('#imcValue')).toHaveText('26.1');
  await expect(page.locator('#tmbValue')).toHaveText('1752');
  await page.getByRole('button', { name: '+100 ml 💧', exact: true }).click();
  await expect(page.locator('#waterValue')).toHaveText('100ml');
  await expect(page.locator('#waterRemaining')).toContainText('3050ml');
  await page.reload();
  await page.locator('#navPerfil').click();
  await page.locator('#perfilSubSaude').click();
  await expect(page.locator('#tmbValue')).toHaveText('1752');
  await expect(page.locator('#waterValue')).toHaveText('100ml');
});

test('navegação preserva rolagem e permite trocar de tela por gesto', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 650 });
  await page.goto(baseUrl);
  await completeOnboarding(page);
  await page.locator('#navPerfil').click();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.evaluate(() => window.scrollTo(0, 300));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(300);
  await page.locator('#navTreino').click();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.locator('#navPerfil').click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(300);
  await page.locator('#perfilView').evaluate(target => {
    const touch = (clientX, clientY) => new Touch({ identifier: 1, target, clientX, clientY });
    target.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [touch(300, 200)] }));
    target.dispatchEvent(new TouchEvent('touchend', { bubbles: true, changedTouches: [touch(100, 205)] }));
  });
  await expect(page.locator('#conquistasView')).toBeVisible();
  await expect(page.locator('#perfilView')).toBeHidden();
  await page.locator('#navPlanos').click();
  await expect(page.locator('#planosView')).toBeVisible();
});

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

test('finalização, detalhe e correção do histórico persistem sem duplicação', async ({ page }) => {
  await page.goto(baseUrl);
  await completeOnboarding(page);
  await page.locator('#btnGenerate').click();
  await expect(page.locator('#confirmFinishOverlay')).toBeVisible();
  await page.getByRole('button', { name: 'Finalizar Assim', exact: true }).click();
  await expect(page.locator('#confirmFinishOverlay')).toBeHidden();
  await expect(page.locator('#reportOutput')).toHaveValue(/RESUMO DO TREINO/);
  await page.locator('#btnGenerate').click();
  await expect(page.locator('#confirmFinishOverlay')).toBeHidden();
  await page.locator('#exercisesContainer button[onclick^="openExerciseProgress"]').first().click();
  await expect(page.locator('#exerciseProgressOverlay')).toBeVisible();
  await expect(page.locator('#progressBody')).toContainText('Última sessão');
  await page.locator('#exerciseProgressOverlay button[onclick="closeExerciseProgress()"]').click();
  await page.locator('#navPerfil').click();
  await page.locator('#perfilSubProgresso').click();
  await expect(page.locator('#workoutHistoryCount')).toHaveText('1');
  await page.locator('#workoutHistoryList button').first().click();
  await expect(page.locator('#workoutDayOverlay')).toBeVisible();
  await page.locator('#workoutDayBody button[aria-label^="Corrigir"]').first().click();
  await expect(page.locator('#editEntryOverlay')).toBeVisible();
  await page.getByRole('spinbutton', { name: 'Carga da série 1', exact: true }).fill('37');
  await page.locator('#editEntryOverlay').getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.locator('#editEntryOverlay')).toBeHidden();
  await page.locator('#workoutDayBody button[aria-label^="Corrigir"]').first().click();
  await expect(page.getByRole('spinbutton', { name: 'Carga da série 1', exact: true })).toHaveValue('37');
  await page.reload();
  await page.locator('#navPerfil').click();
  await page.locator('#perfilSubProgresso').click();
  await page.locator('#workoutHistoryList button').first().click();
  await page.locator('#workoutDayBody button[aria-label^="Corrigir"]').first().click();
  await expect(page.getByRole('spinbutton', { name: 'Carga da série 1', exact: true })).toHaveValue('37');
  await page.locator('#editEntryOverlay button[onclick="closeEditEntry()"]').first().click();
  await page.locator('#workoutDayUndo').click();
  await page.locator('#confirmOverlayCancel').click();
  await expect(page.locator('#workoutHistoryCount')).toHaveText('1');
  await page.locator('#workoutDayUndo').click();
  await page.locator('#confirmOverlayOk').click();
  await expect(page.locator('#workoutHistoryCount')).toHaveText('0');
  await expect(page.locator('#workoutDayOverlay')).toBeHidden();
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
    DIA: TER | Pernas | Quadríceps e posteriores |
    EX - Agachamento guiado | forca | 4 | 8 | 60 | Leg press |
    EX - Mesa flexora | forca | 3 | 12 | 25 |
    DIA: SEX | Ombros | Deltoides |
    EX - Elevação lateral | forca | 3 | 15 | 8 |
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

test('o prompt pede uma falha explícita se a IA não puder gerar o bloco', async ({ page }) => {
  await page.goto(baseUrl);
  await completeOnboarding(page);
  await page.locator('#navPlanos').click();
  await page.getByRole('button', { name: /Montar treino com IA/ }).click();

  await expect(page.locator('#aiPromptOutput')).toHaveValue(/NÃO CONSEGUI GERAR BLOCO IMPORTÁVEL/);
});

test('foco do treino exibe HTML como texto após editar e reabrir', async ({ page }) => {
  const focus = 'Peito & tríceps <img src=x onerror="window.__focusInjected=true"> <b>ênfase</b>';
  await page.goto(baseUrl);
  await completeOnboarding(page);
  await page.locator('#navPlanos').click();
  await page.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.locator('#editorDayFocus').fill(focus);
  await page.getByRole('button', { name: 'Salvar Perfil', exact: true }).click();
  await page.locator('#navTreino').click();
  await page.locator('#workoutSelect').selectOption('SEG');
  const header = page.locator('#workoutFocus');
  await expect(header).toHaveText(focus);
  await expect(header.locator('img, b')).toHaveCount(0);
  await expect(header.locator('svg')).toHaveCount(1);
  expect(await page.evaluate(() => window.__focusInjected)).toBeUndefined();
  await page.reload();
  await expect(page.locator('#appVersion')).not.toHaveText('');
  await page.locator('#workoutSelect').selectOption('SEG');
  await expect(header).toHaveText(focus);
  await expect(header.locator('img, b')).toHaveCount(0);
  expect(await page.evaluate(() => window.__focusInjected)).toBeUndefined();
});

test('gera backup protegido após confirmar a senha', async ({ page }) => {
  await page.goto(baseUrl);
  await completeOnboarding(page);
  await page.locator('#navPerfil').click();
  const password = 'senha-de-teste';
  page.on('dialog', dialog => dialog.accept(password));
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Exportar backup protegido/ }).click()
  ]);
  expect(download.suggestedFilename()).toContain('treino-backup-protegido-');
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

for (const source of ['exerciseHistory', 'sessionLog']) {
  test(`primeiro card usa ${source} do IndexedDB e preserva o rascunho`, async ({ page }) => {
    await page.goto(baseUrl);
    await completeOnboarding(page);
    const input = page.locator('[id^="input-weight-"]').first();
    const exId = (await input.getAttribute('id')).replace('input-weight-', '');
    await page.evaluate(async ({ exId, source }) => {
      const stale = { date: '2026-09-01', type: 'forca', series: [{ reps: 5, weight: 11 }] };
      const current = { ...stale, date: '2026-09-26', series: [{ reps: 9, weight: 42 }] };
      localStorage.setItem('treino_exercise_history', JSON.stringify(source === 'exerciseHistory' ? { [exId]: stale } : {}));
      localStorage.setItem('treino_session_log', JSON.stringify({ [exId]: [stale] }));
      localStorage.removeItem('treino_workout_draft');
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open('treino-session-log', 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      await new Promise((resolve, reject) => {
        const tx = db.transaction('state', 'readwrite');
        tx.objectStore('state').put({ [exId]: [current] }, 'current');
        tx.objectStore('state').put(source === 'exerciseHistory' ? { [exId]: current } : {}, 'exerciseHistory');
        tx.oncomplete = resolve;
        tx.onabort = () => reject(tx.error);
      });
      db.close();
    }, { exId, source });
    await page.reload();
    await expect(input).toHaveValue('42');
    await expect(page.locator('body')).not.toHaveAttribute('inert');
    await input.fill('49');
    await input.press('Tab');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('treino_workout_draft'))).toContain('49');
    await page.reload();
    await expect(input).toHaveValue('49');
  });
}

test('abre o treino com histórico local quando IndexedDB está indisponível', async ({ page }) => {
  await page.goto(baseUrl);
  await completeOnboarding(page);
  const input = page.locator('[id^="input-weight-"]').first();
  const exId = (await input.getAttribute('id')).replace('input-weight-', '');
  await page.evaluate(exId => {
    localStorage.setItem('treino_exercise_history', JSON.stringify({
      [exId]: { type: 'forca', series: [{ reps: 8, weight: 31 }] }
    }));
    localStorage.removeItem('treino_workout_draft');
  }, exId);
  await page.addInitScript(() => {
    IDBFactory.prototype.open = () => { throw new DOMException('Indisponível', 'SecurityError'); };
  });
  await page.reload();
  await expect(input).toHaveValue('31');
  await expect(page.locator('body')).not.toHaveAttribute('inert');
  await page.locator('#navPerfil').click();
  await expect(page.locator('#profileName')).toHaveValue('Pessoa Teste');
});

// Exercita o módulo de restauração com IndexedDB real e falhas controladas.
// Cada teste usa uma origem isolada pelo contexto do Playwright.
for (const scenario of ['large', 'local-failure', 'db-failure', 'unavailable']) {
  test(`restauração segura: ${scenario}`, async ({ page }) => {
    await page.goto(baseUrl);
    await completeOnboarding(page);
    const result = await page.evaluate(async scenario => {
      const keys = ['audit_profile', 'audit_missing', 'audit_sessions', 'audit_history'];
      const old = Object.fromEntries(keys.map(key => [key, `original:${key}`]));
      Object.entries(old).forEach(([key, value]) => localStorage.setItem(key, value));
      localStorage.setItem('audit_unrelated', 'preservar');
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open('audit-restore', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('state');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      await new Promise((resolve, reject) => {
        const tx = db.transaction('state', 'readwrite');
        tx.objectStore('state').put({ old: true }, 'current');
        tx.objectStore('state').put({ old: true }, 'exerciseHistory');
        tx.oncomplete = resolve;
        tx.onabort = () => reject(tx.error);
      });
      let failedOnce = false;
      const storage = {
        getItem: key => localStorage.getItem(key),
        removeItem: key => localStorage.removeItem(key),
        setItem(key, value) {
          if (scenario === 'local-failure' && key === 'audit_profile' && !failedOnce) {
            failedOnce = true;
            throw new DOMException('Disco cheio', 'QuotaExceededError');
          }
          localStorage.setItem(key, value);
        }
      };
      const openDatabase = async () => {
        if (scenario === 'unavailable') throw new Error('Banco indisponível');
        return {
          close() {},
          transaction(...args) {
            const tx = db.transaction(...args);
            if (scenario === 'db-failure' && args[1] === 'readwrite') {
              const getStore = tx.objectStore.bind(tx);
              tx.objectStore = name => {
                const store = getStore(name);
                const put = store.put.bind(store);
                store.put = (value, key) => {
                  if (key === 'exerciseHistory') throw new DOMException('Falha', 'QuotaExceededError');
                  return put(value, key);
                };
                return store;
              };
            }
            return tx;
          }
        };
      };
      let error = false;
      try {
        await TREINO_BACKUP_RESTORE.restore({
          keys, storage, openDatabase, sessionKey: 'audit_sessions', historyKey: 'audit_history',
          data: {
            audit_profile: 'novo',
            audit_sessions: JSON.stringify({ text: scenario === 'large' ? 'x'.repeat(6 * 1024 * 1024) : 'novo' }),
            audit_history: JSON.stringify({ updated: true })
          }
        });
      } catch (_) { error = true; }
      const persisted = await new Promise((resolve, reject) => {
        const tx = db.transaction('state', 'readonly');
        const a = tx.objectStore('state').get('current');
        const b = tx.objectStore('state').get('exerciseHistory');
        const j = tx.objectStore('state').get('backupRestoreJournal');
        tx.oncomplete = () => resolve({ sessions: a.result, history: b.result, journal: j.result });
        tx.onabort = () => reject(tx.error);
      });
      db.close();
      return {
        error, local: Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)])), old,
        unrelated: localStorage.getItem('audit_unrelated'),
        marker: localStorage.getItem(TREINO_BACKUP_RESTORE.marker),
        journal: !!persisted.journal,
        sessionsOld: persisted.sessions?.old, history: persisted.history,
        length: persisted.sessions?.text?.length
      };
    }, scenario);
    expect(result.unrelated).toBe('preservar');
    expect(result.marker).toBeNull();
    expect(result.journal).toBe(false);
    if (scenario === 'large') {
      expect(result.error).toBe(false);
      expect(result.length).toBe(6 * 1024 * 1024);
      expect(result.history).toEqual({ updated: true });
      expect(result.local).toEqual({ audit_profile: 'novo', audit_missing: null, audit_sessions: null, audit_history: null });
    } else {
      expect(result.error).toBe(true);
      expect(result.local).toEqual(result.old);
      expect(result.sessionsOld).toBe(true);
      expect(result.history).toEqual({ old: true });
    }
  });
}

for (const protectedBackup of [false, true]) {
  test(`restaura pela interface e recarrega os históricos (senha: ${protectedBackup})`, async ({ page }) => {
    await page.goto(baseUrl);
    await completeOnboarding(page);
    const backup = await page.evaluate(async protectedBackup => {
      const data = {};
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith('treino_')) data[key] = localStorage.getItem(key);
      }
      const profile = JSON.parse(data.treino_user_profile);
      profile.name = 'Pessoa Restaurada';
      data.treino_user_profile = JSON.stringify(profile);
      const entry = { date: '2026-09-27', name: 'Supino', type: 'forca', series: [{ reps: 10, weight: 42 }] };
      data.treino_session_log = JSON.stringify({ supino: [entry] });
      data.treino_exercise_history = JSON.stringify({ supino: entry });
      const plain = { app: 'treino-personalizado', backupVersion: 1, data };
      return protectedBackup ? await TREINO_BACKUP_CRYPTO.encrypt(plain, 'senha-teste', 310000, '2.20.1') : plain;
    }, protectedBackup);
    if (protectedBackup) page.on('dialog', dialog => dialog.accept('senha-teste'));
    await page.locator('#importBackupInput').setInputFiles({
      name: 'backup-teste.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup))
    });
    await expect(page.locator('#importConfirmOverlay')).toBeVisible();
    await Promise.all([
      page.waitForEvent('domcontentloaded'),
      page.locator('#importConfirmOverlay').getByRole('button', { name: 'Restaurar', exact: true }).click()
    ]);
    await page.locator('#navPerfil').click();
    await expect(page.locator('#profileName')).toHaveValue('Pessoa Restaurada');
    await expect(page.locator('body')).not.toHaveAttribute('inert');
    const saved = await page.evaluate(async () => {
      const db = await new Promise(resolve => {
        const request = indexedDB.open('treino-session-log', 1);
        request.onsuccess = () => resolve(request.result);
      });
      return new Promise(resolve => {
        const tx = db.transaction('state', 'readonly');
        const history = tx.objectStore('state').get('exerciseHistory');
        const log = tx.objectStore('state').get('current');
        tx.oncomplete = () => {
          db.close();
          resolve({ history: history.result, log: log.result, legacy: localStorage.getItem('treino_session_log') });
        };
      });
    });
    expect(saved.history.supino.series[0].weight).toBe(42);
    expect(saved.log.supino[0].series[0].weight).toBe(42);
    expect(saved.legacy).toBeNull();
  });
}

test('recusa backups corrompidos sem modificar os dados salvos', async ({ page }) => {
  await page.goto(baseUrl);
  await completeOnboarding(page);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const snapshot = () => page.evaluate(async () => {
    await historyInitialization;
    const db = await openSessionDb();
    const history = await new Promise((resolve, reject) => {
      const tx = db.transaction('state', 'readonly');
      const request = tx.objectStore('state').getAll();
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    return { local: { ...localStorage }, history };
  });
  const before = await snapshot();
  for (const corrupt of [
    { data: { treino_user_profile: '{"weightHistory":{}}' } },
    { data: { treino_session_log: '{"supino":[{"series":[null]}]}' } },
    { data: { treino_gamification: '{"checkins":null}' } },
    { data: { treino_profiles: '{"plano":{"schedule":{}}}' } },
    { exportedAt: {}, data: { treino_user_profile: '{}' } }
  ]) {
    const backup = { app: 'treino-personalizado', backupVersion: 1, ...corrupt };
    const rejectionCount = () => page.evaluate(() =>
      toastQueue.filter(item => item.message.includes('Backup inválido ou corrompido')).length +
      Number(document.querySelector('#toast').textContent.includes('Backup inválido ou corrompido')));
    const previousRejections = await rejectionCount();
    await page.locator('#importBackupInput').setInputFiles({
      name: 'corrompido.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup))
    });
    await expect.poll(rejectionCount).toBeGreaterThan(previousRejections);
    await expect(page.locator('#importConfirmOverlay')).toBeHidden();
    expect(await snapshot()).toEqual(before);
  }
  expect(errors).toEqual([]);
});

test('recupera restauração interrompida antes de inicializar a interface', async ({ page }) => {
  await page.goto(baseUrl);
  await completeOnboarding(page);
  await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('treino-session-log', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const previous = { treino_user_profile: localStorage.getItem('treino_user_profile') };
    await new Promise((resolve, reject) => {
      const tx = db.transaction('state', 'readwrite');
      tx.objectStore('state').put({ keys: ['treino_user_profile'], previous }, 'backupRestoreJournal');
      tx.oncomplete = resolve;
      tx.onabort = () => reject(tx.error);
    });
    localStorage.setItem(TREINO_BACKUP_RESTORE.marker, '1');
    localStorage.setItem('treino_user_profile', JSON.stringify({ name: 'Restauração incompleta' }));
    db.close();
  });
  await page.reload();
  await expect(page.locator('#appVersion')).not.toHaveText('');
  await page.locator('#navPerfil').click();
  await expect(page.locator('#profileName')).toHaveValue('Pessoa Teste');
  expect(await page.evaluate(() => localStorage.getItem(TREINO_BACKUP_RESTORE.marker))).toBeNull();
});
