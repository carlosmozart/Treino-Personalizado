import { expect, test } from 'vitest';
import { createBackNavigation } from './back';

/** Histórico falso com popstate assíncrono como no navegador (aqui, disparado à mão). */
function fakeHistory() {
  const entries: unknown[] = [null];
  let index = 0;
  const pending: unknown[] = [];
  return {
    get state() { return entries[index]; },
    pushState(data: unknown) { entries.splice(index + 1); entries.push(data); index++; },
    replaceState(data: unknown) { entries[index] = data; },
    back() { if (index > 0) { index--; pending.push(entries[index]); } },
    /** Voltar do sistema: devolve o estado do popstate, ou 'exit' se não há para onde voltar. */
    systemBack() { if (index === 0) return 'exit'; index--; return entries[index]; },
    takePending: () => pending.splice(0),
    get length() { return index + 1; }
  };
}

function setup() {
  const h = fakeHistory();
  let tab = 'inicio';
  const nav = createBackNavigation(h, () => tab, t => { tab = t; });
  const drain = () => h.takePending().forEach(s => nav.onPopState(s));
  const back = () => { const s = h.systemBack(); if (s === 'exit') return 'exit'; nav.onPopState(s); drain(); return tab; };
  return { h, nav, drain, back, get tab() { return tab; } };
}

test('abas: outras abas voltam para o Início; do Início, sai', () => {
  const s = setup();
  s.nav.goTab('plano');
  s.nav.goTab('progresso');
  expect(s.h.length).toBe(2);
  expect(s.back()).toBe('inicio');
  expect(s.back()).toBe('exit');
});

test('ir ao Início pela barra desfaz a entrada da aba', () => {
  const s = setup();
  s.nav.goTab('perfil');
  s.nav.goTab('inicio');
  s.drain();
  expect(s.tab).toBe('inicio');
  expect(s.back()).toBe('exit');
});

test('voltar fecha o painel antes de mudar de aba', () => {
  const s = setup();
  s.nav.goTab('plano');
  let open = true;
  const release = s.nav.pushLayer(() => { open = false; });
  expect(s.back()).toBe('plano');
  expect(open).toBe(false);
  release(); // o componente chama ao fechar: não volta de novo
  expect(s.back()).toBe('inicio');
});

test('painel fechado pela interface tira a própria entrada sem mudar de aba', () => {
  const s = setup();
  s.nav.goTab('plano');
  const release = s.nav.pushLayer(() => undefined);
  release();
  s.drain();
  expect(s.tab).toBe('plano');
  expect(s.back()).toBe('inicio');
});
