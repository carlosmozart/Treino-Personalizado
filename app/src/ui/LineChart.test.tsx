import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { LineChart, inRange } from './LineChart';

afterEach(cleanup);

const pts = ['2026-06-01', '2026-08-01', '2026-09-20', '2026-10-01', '2026-10-07'].map((date, i) => ({ date, label: date.slice(5), value: 90 - i }));

test('período: últimos N dias a partir do ponto mais recente', () => {
  expect(inRange(pts, 30).map(p => p.date)).toEqual(['2026-09-20', '2026-10-01', '2026-10-07']);
  expect(inRange(pts, 0)).toHaveLength(5);
});

test('tocar mostra o valor; trocar o período redesenha', () => {
  render(<LineChart points={pts} unit="kg" summary="Peso" />);
  const svg = screen.getByRole('img', { name: 'Peso' });
  svg.getBoundingClientRect = () => ({ left: 0, width: 300, top: 0, height: 110, right: 300, bottom: 110, x: 0, y: 0, toJSON: () => ({}) });
  fireEvent.pointerDown(svg, { clientX: 290 });
  expect(screen.getByText('10-07: 86 kg')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '30 dias' }));
  expect(document.querySelectorAll('circle')).toHaveLength(3);
});

test('período de 1 ano deixa de fora o que tem mais de um ano', () => {
  const pts = [{ date: '2025-09-01' }, { date: '2025-11-01' }, { date: '2026-10-01' }];
  expect(inRange(pts, 365).map(p => p.date)).toEqual(['2025-11-01', '2026-10-01']);
});
