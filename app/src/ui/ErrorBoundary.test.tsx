// Uma tela que quebra ao desenhar não deixa o app em branco.
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useErrorLog } from '../platform/error-log';
import { ErrorBoundary } from './ErrorBoundary';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

let broken = true;
function Screen() {
  if (broken) throw new Error('lista sem dados');
  return <p>Tela normal</p>;
}

test('mostra o erro, anota no registro e deixa tentar de novo', () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  broken = true;
  render(<ErrorBoundary><Screen /></ErrorBoundary>);
  expect(screen.getByRole('alert').textContent).toContain('Algo deu errado nesta tela');
  expect(screen.getByText('lista sem dados')).toBeTruthy();
  expect(useErrorLog.getState().entries.at(-1)?.message).toContain('lista sem dados');
  broken = false;
  fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
  expect(screen.getByText('Tela normal')).toBeTruthy();
});
