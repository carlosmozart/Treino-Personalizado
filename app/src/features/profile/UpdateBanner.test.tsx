// X7: o download da atualização aparece em qualquer aba, com o quanto já veio e a falha.
import { afterEach, beforeEach, expect, test } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useUpdate } from '../../platform/app-update';
import type { ReleaseInfo } from '../../domain/app-update';
import { UpdateBanner } from './UpdateOffer';

type Progress = (p: { percent: number }) => void;
interface FakePlugin { progress: Progress | null; finish: (() => void) | null; fail: ((e: unknown) => void) | null; installed: boolean }

/** Um AppUpdatePlugin de mentira: o teste decide quando o download anda, termina ou falha. */
function fakeNative(): FakePlugin {
  const fake: FakePlugin = { progress: null, finish: null, fail: null, installed: false };
  (globalThis as { Capacitor?: unknown }).Capacitor = {
    isNativePlatform: () => true,
    Plugins: { AppUpdate: {
      download: () => new Promise<void>((resolve, reject) => { fake.finish = resolve; fake.fail = reject; }),
      install: () => { fake.installed = true; return Promise.resolve(); },
      addListener: (_: string, cb: Progress) => { fake.progress = cb; return Promise.resolve({ remove: () => { fake.progress = null; } }); }
    } }
  };
  return fake;
}

const INFO: ReleaseInfo = { version: '9.9.9', url: 'https://example.invalid/app.apk', sha256: 'a'.repeat(64), size: 5_000_000, notes: '' };
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

beforeEach(() => useUpdate.setState({ status: '', phase: 'idle', percent: null, offer: null, busy: false }));
afterEach(() => { cleanup(); delete (globalThis as { Capacitor?: unknown }).Capacitor; });

test('parado, não aparece', () => {
  render(<UpdateBanner />);
  expect(screen.queryByTestId('aviso-da-atualizacao')).toBeNull();
});

test('baixando: mostra o quanto já veio e some quando o instalador abre', async () => {
  const fake = fakeNative();
  render(<UpdateBanner />);
  const done = useUpdate.getState().install(INFO);
  await tick();
  expect(screen.getByRole('status').textContent).toContain('Baixando atualização…');
  // sem tamanho conhecido: barra sem valor
  expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBeNull();
  fake.progress!({ percent: 42 });
  await tick();
  expect(screen.getByRole('status').textContent).toContain('42%');
  expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('42');
  fake.finish!();
  await done;
  await tick();
  expect(fake.installed).toBe(true);
  expect(useUpdate.getState().phase).toBe('idle');
  expect(screen.queryByTestId('aviso-da-atualizacao')).toBeNull();
});

test('falhou: o motivo fica na tela até fechar, e continua em Perfil → Sobre', async () => {
  const fake = fakeNative();
  render(<UpdateBanner />);
  const done = useUpdate.getState().install(INFO);
  await tick();
  fake.fail!(new Error('sem internet'));
  await done;
  await tick();
  expect(screen.getByRole('alert').textContent).toContain('A atualização falhou: sem internet');
  expect(screen.queryByRole('progressbar')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
  expect(screen.queryByTestId('aviso-da-atualizacao')).toBeNull();
  expect(useUpdate.getState().status).toContain('A atualização falhou');
  expect(useUpdate.getState().busy).toBe(false);
});
