import { describe, expect, it } from 'vitest';
import { applyTheme, resolveTheme } from './theme';

describe('tema', () => {
  it('escolha explícita vence o sistema', () => {
    expect(resolveTheme('light')).toBe('light');
    expect(resolveTheme('dark')).toBe('dark');
  });

  it('aplica no <html> e guarda a escolha', () => {
    applyTheme('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem('tp-theme')).toBe('light');
    applyTheme('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
