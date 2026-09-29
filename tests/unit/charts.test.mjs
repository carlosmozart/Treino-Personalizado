import { expect, test } from 'vitest';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const context = vm.createContext({ window: {} });
vm.runInContext(await readFile(new URL('../../js/ui/charts.js', import.meta.url), 'utf8'), context);
function setup() {
  let settings = {};
  const events = [];
  const charts = context.window.TREINO_CHARTS.create({
    document: { getElementById: () => null }, getSettings: () => settings,
    saveSettings: () => events.push('save'), onRangeChange: key => events.push(key), positionBubble() {}
  });
  return { charts, events, replace: value => { settings = value; } };
}

test('filtros salvam preferências e usam o estado atualizado', () => {
  const { charts, events, replace } = setup();
  charts.setChartRange('peso', '5');
  expect(charts.applyChartRange('peso', [1, 2, 3, 4, 5, 6])).toEqual([2, 3, 4, 5, 6]);
  expect(events).toEqual(['save', 'peso']);
  replace({ chartRange: { peso: 7 } });
  expect(charts.getChartRange('peso')).toBe(7);
  charts.setChartRange('peso', 'tudo');
  expect(charts.getChartRange('peso')).toBe('tudo');
});

test('gráficos preservam tendência e alvo sem produzir coordenadas inválidas', () => {
  const { charts } = setup();
  expect(charts.renderSparkline([1], {})).toBe('');
  const html = charts.renderSparkline([80, 80, 80], { trend: [80, 80, 80], target: 60 });
  expect(html).toContain('data-trend');
  expect(html).toContain('data-target');
  expect(html).not.toMatch(/NaN|Infinity/);
  expect(charts.renderSparkline([1, 2], {})).not.toContain('data-target');
});
