import { afterEach, expect, test } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { App } from './App';
import { useUiStore } from './store/ui-store';

afterEach(() => { cleanup(); useUiStore.setState({ tab: 'inicio' }); });

test('abre no Início e troca de aba pela barra inferior', () => {
  render(<App />);
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Início');
  fireEvent.click(screen.getByRole('button', { name: 'Treino' }));
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Treino');
  expect(screen.getByRole('button', { name: 'Treino' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('button', { name: 'Início' })).not.toHaveAttribute('aria-current');
});
