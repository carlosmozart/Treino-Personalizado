// Capturas de tela do README (docs/screenshots/). Dados fictícios montados aqui e carregados pelo
// próprio "Restaurar" do app; relógio fixo para as imagens saírem sempre iguais.
// Rodar: npm run screenshots (em app/), depois de npm run build.
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { buildBackup } from '../../src/domain/backup';
import { addDays, toDateKey } from '../../src/domain/dates';
import { emptyAppData, type AppData, type Workout } from '../../src/domain/model';
import { enableRotation, rotationOrder } from '../../src/domain/rotation';
import { normalizeExerciseName } from '../../src/domain/text';
import { PLAN_TEMPLATES } from '../../src/data/plan-templates';
import pkg from '../../package.json' with { type: 'json' };

const OUT = join(import.meta.dirname, '..', '..', '..', 'docs', 'screenshots');
const NOW = new Date(2026, 9, 7, 18, 30); // quarta, 07/10/2026

function demoData(): AppData {
  const data = emptyAppData();
  const today = toDateKey(NOW);
  const plan = enableRotation(PLAN_TEMPLATES.find(t => t.id === 'abc')!.build(addDays(today, -60), 'demo'));
  // cargas de partida por exercício, para o plano não ficar zerado
  for (const day of Object.values(plan.days)) {
    day.exercises.forEach((e, i) => { if (e.mode === 'reps') e.weight = Math.max(10, 40 - i * 6); });
  }
  data.plans[plan.id] = plan;
  data.activePlanId = plan.id;

  const order = rotationOrder(plan);
  const workouts: Workout[] = [];
  let session = 0;
  // 7 semanas, 3 treinos por semana (seg, qua, sex), a de hoje fica para o treino da captura
  for (let d = -49; d < 0; d++) {
    const date = addDays(today, d);
    const weekday = new Date(`${date}T12:00:00`).getDay();
    if (![1, 3, 5].includes(weekday)) continue;
    const dayKey = order[session % order.length]!;
    const day = plan.days[dayKey];
    const step = Math.floor(session / order.length); // uma volta = +2,5 kg
    workouts.push({
      id: `demo-${date}`, date, startedAt: `${date}T18:00:00.000Z`, endedAt: `${date}T19:05:00.000Z`, durationMin: 65,
      planId: plan.id, dayKey, dayName: day.name, source: 'app',
      entries: day.exercises.map(e => ({
        key: normalizeExerciseName(e.name), name: e.name, mode: e.mode,
        sets: e.mode === 'cardio' ? [] : Array.from({ length: e.sets }, (_, i) => ({
          reps: e.mode === 'time' ? (e.seconds ?? 30) : Math.max(6, (e.reps || 10) - (i === e.sets - 1 && step % 2 ? 1 : 0)),
          weight: e.mode === 'reps' ? e.weight + step * 2.5 : 0,
          kind: 'work' as const
        })),
        ...(e.mode === 'cardio' ? { cardio: { minutes: e.minutes || 20 } } : {})
      }))
    });
    data.checkins[date] = { dayKey };
    session++;
  }
  data.workouts = workouts;

  data.profile = {
    ...data.profile, name: 'Ana', birthdate: '1994-05-12', sex: 'F', heightCm: 168, weightKg: 66.2, targetWeightKg: 63,
    weighIns: Array.from({ length: 8 }, (_, i) => ({ date: addDays(today, -49 + i * 7), weight: Math.round((69 - i * 0.4) * 10) / 10 }))
  };
  for (let d = -6; d <= 0; d++) data.water[addDays(today, d)] = d === 0 ? 1250 : 2200;
  data.measurements = {
    [addDays(today, -42)]: { cintura: 78, quadril: 99, braco: 27.5, coxa: 56, gordura: 27 },
    [addDays(today, -21)]: { cintura: 76.5, quadril: 98, braco: 28, coxa: 56.5, gordura: 25.5 },
    [addDays(today, -1)]: { cintura: 75, quadril: 97, braco: 28.5, coxa: 57, gordura: 24 }
  };
  data.settings = { ...data.settings, trainingReminders: false };
  data.meta = { ...data.meta, lastSeenVersion: pkg.version, lastBackupAt: NOW.toISOString(), hintsSeen: { welcome: true, progressao: true, iosInstall: true } };
  return data;
}

async function load(page: Page) {
  const file = join(tmpdir(), 'treino-demo-backup.json');
  writeFileSync(file, JSON.stringify(buildBackup(demoData(), pkg.version, NOW)));
  await page.clock.setFixedTime(NOW);
  await page.goto('/');
  await page.getByRole('button', { name: 'Perfil', exact: true }).click();
  page.once('dialog', d => d.accept());
  await page.getByLabel('Arquivo de backup').setInputFiles(file);
  await expect(page.getByRole('status').filter({ hasText: 'Backup restaurado' })).toBeVisible();
  // as conquistas liberadas pela restauração aparecem uma a uma; espera todas sumirem
  await expect(page.getByText(/Conquista desbloqueada/)).toHaveCount(0, { timeout: 60_000 });
}

const shot = (page: Page, name: string) => page.screenshot({ path: join(OUT, `${name}.png`) });

test.setTimeout(120_000);

test('capturas do README', async ({ page }) => {
  await load(page);

  await page.getByRole('button', { name: 'Início', exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot(page, 'inicio');

  // treino aberto com a carga sugerida
  await page.getByRole('button', { name: 'Começar treino' }).click();
  await expect(page.getByText(/kg:|Mantém/).first()).toBeVisible();
  const first = page.getByRole('article').first();
  await first.getByRole('button', { name: 'Série 1 feita' }).click();
  await page.getByRole('button', { name: 'Pular' }).click();
  await shot(page, 'treino');

  await page.getByRole('button', { name: 'Plano', exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot(page, 'plano-rotacao');

  await page.getByRole('button', { name: 'Progresso', exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot(page, 'progresso');

  // medidas do corpo, na aba Metas, com o gráfico da cintura aberto
  await page.getByRole('tab', { name: 'Metas' }).click();
  await page.getByRole('button', { name: /^Cintura/ }).click();
  await page.getByLabel('Medidas do corpo').scrollIntoViewIfNeeded();
  await shot(page, 'medidas');
});

test('tema claro', async ({ page }) => {
  await load(page);
  await page.getByRole('radio', { name: 'Claro' }).click();
  await page.getByRole('button', { name: 'Início', exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot(page, 'inicio-claro');
});
