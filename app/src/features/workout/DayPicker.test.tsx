import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { DayPicker } from './DayPicker';
import { useAppStore } from '../../store';
import { emptyAppData, dayKeyOf } from '../../domain/model';
import { samplePlan } from '../../domain/testing';
import { toDateKey } from '../../domain/dates';

// quarta-feira: dia de treino no plano de exemplo (domingo é descanso)
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(2026, 9, 7, 10)); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

function setup(doneToday: boolean) {
  const data = emptyAppData();
  const plan = samplePlan();
  data.plans[plan.id] = plan;
  data.activePlanId = plan.id;
  if (doneToday) data.checkins[toDateKey(new Date())] = { dayKey: dayKeyOf(new Date()) };
  useAppStore.setState({ data });
  render(<DayPicker />);
}

test('hoje sem treino: oferece começar', () => {
  setup(false);
  expect(screen.getAllByRole('button', { name: /^Começar/ })).toHaveLength(6);
  expect(screen.queryByText('Feito hoje')).toBeNull();
});

test('treino de hoje concluído: não oferece começar de novo no cartão de hoje', () => {
  setup(true);
  expect(screen.getByText('Feito hoje')).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: /^Começar/ })).toHaveLength(5);
});
