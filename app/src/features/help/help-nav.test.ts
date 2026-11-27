import { afterEach, describe, expect, it, vi } from 'vitest';
import { useUiStore } from '../../store/ui-store';
import { afterSheetCloses, flashAnchor, goToHelp } from './help-nav';

afterEach(() => { vi.useRealTimers(); document.body.innerHTML = ''; useUiStore.setState({ tab: 'inicio', progressView: null }); });

describe('Ajuda: ir até a função', () => {
  it('troca de aba, pede a vista do Progresso e destaca o lugar', async () => {
    document.body.innerHTML = '<div data-help="progresso-vistas"></div>';
    const el = document.querySelector('div')!;
    el.scrollIntoView = vi.fn();
    expect(await goToHelp({ tab: 'progresso', view: 'protocol', anchor: 'progresso-vistas' })).toBe(true);
    expect(useUiStore.getState()).toMatchObject({ tab: 'progresso', progressView: 'protocol' });
    expect(el.classList.contains('help-flash')).toBe(true);
    expect(el.scrollIntoView).toHaveBeenCalled();
  });

  it('espera o lugar aparecer (a aba baixa na hora) e desiste se não aparecer', async () => {
    vi.useFakeTimers();
    const found = flashAnchor('biblioteca');
    setTimeout(() => {
      document.body.innerHTML = '<button data-help="biblioteca"></button>';
      document.querySelector('button')!.scrollIntoView = () => {};
    }, 200);
    await vi.advanceTimersByTimeAsync(300);
    expect(await found).toBe(true);
    const missing = flashAnchor('nao-existe');
    await vi.advanceTimersByTimeAsync(3000);
    expect(await missing).toBe(false);
  });

  it('só navega depois que o painel fechou (o voltar do histórico) ou, sem ele, logo depois', () => {
    vi.useFakeTimers();
    const listeners: (() => void)[] = [];
    const win = { addEventListener: (_: string, f: () => void) => listeners.push(f), removeEventListener: vi.fn() };
    const fn = vi.fn();
    afterSheetCloses(fn, win as unknown as Window);
    expect(fn).not.toHaveBeenCalled();
    listeners[0]!();
    expect(fn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(1);
    const late = vi.fn();
    afterSheetCloses(late, win as unknown as Window);
    vi.advanceTimersByTime(500);
    expect(late).toHaveBeenCalledTimes(1);
  });
});
