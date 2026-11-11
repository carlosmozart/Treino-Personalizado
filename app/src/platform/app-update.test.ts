// Atualizador: o instalador só abre com o app na tela (Android 10+ bloqueia abrir em segundo plano).
import { expect, test } from 'vitest';
import { whenVisible } from './app-update';

function fakeDoc(state: DocumentVisibilityState) {
  const listeners = new Set<() => void>();
  return {
    visibilityState: state,
    addEventListener: (_: string, fn: () => void) => { listeners.add(fn); },
    removeEventListener: (_: string, fn: () => void) => { listeners.delete(fn); },
    set(s: DocumentVisibilityState) { this.visibilityState = s; [...listeners].forEach(fn => fn()); },
    listeners
  };
}

test('na tela: segue na hora', async () => {
  await expect(whenVisible(fakeDoc('visible') as never)).resolves.toBeUndefined();
});

test('em outro app: espera voltar, e solta o ouvinte', async () => {
  const doc = fakeDoc('hidden');
  let done = false;
  const wait = whenVisible(doc as never).then(() => { done = true; });
  await Promise.resolve();
  expect(done).toBe(false);
  doc.set('hidden');
  await Promise.resolve();
  expect(done).toBe(false);
  doc.set('visible');
  await wait;
  expect(done).toBe(true);
  expect(doc.listeners.size).toBe(0);
});
