import { describe, expect, it, test } from 'vitest';
import { ACCENTS, applyAccent, applyTheme, resolveTheme } from './theme';

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

test('cor de destaque troca a variável do botão e volta ao azul', () => {
  applyAccent('roxo');
  expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe('#7c3aed');
  applyAccent('azul');
  expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe('');
});

test('todas as cores de destaque têm contraste de 4,5:1 com o texto branco', () => {
  const lum = (hex: string) => {
    const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
  };
  for (const a of ACCENTS) expect((1.05 / (lum(a.hex) + 0.05))).toBeGreaterThanOrEqual(4.5);
});
