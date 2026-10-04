import { beforeEach, expect, test } from 'vitest';
import { errorReport, installGlobalErrorHandlers, useErrorLog } from './error-log';

beforeEach(() => { localStorage.clear(); useErrorLog.setState({ entries: [], notice: null }); });

test('erros globais viram aviso e ficam guardados (até 20)', () => {
  const target = new EventTarget();
  installGlobalErrorHandlers(target as unknown as Window);
  target.dispatchEvent(Object.assign(new Event('error'), { error: new Error('quebrou') }));
  const rejection = Object.assign(new Event('unhandledrejection'), { reason: 'sem rede' });
  target.dispatchEvent(rejection);
  const { entries, notice } = useErrorLog.getState();
  expect(entries.map(e => e.message)).toEqual(['quebrou', 'Promessa: sem rede']);
  expect(notice?.message).toBe('Promessa: sem rede');
  expect(JSON.parse(localStorage.getItem('vigor-error-log')!)).toHaveLength(2);
  for (let i = 0; i < 30; i++) useErrorLog.getState().report(new Error(`e${i}`));
  expect(useErrorLog.getState().entries).toHaveLength(20);
});

test('relato com versão e detalhes', () => {
  const text = errorReport([{ at: '2026-10-07T12:00:00Z', message: 'x', detail: 'stack' }], '3.0.0', 'UA');
  expect(text).toBe('Versão 3.0.0\nUA\n\n[2026-10-07T12:00:00Z] x\nstack');
});
