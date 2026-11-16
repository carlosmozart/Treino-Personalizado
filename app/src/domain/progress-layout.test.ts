import { describe, expect, it } from 'vitest';
import { DEFAULT_LAYOUT, isDefaultLayout, moveCard, parseLayout, serializeLayout, setCardShown, visibleCards } from './progress-layout';

describe('X6: organizar os cartões do Progresso', () => {
  it('sem nada guardado (ou com lixo), vem a ordem padrão com tudo à mostra', () => {
    for (const raw of [null, undefined, '', 'x', '[]', '{"order":3}']) {
      const l = parseLayout(raw);
      expect(l).toEqual(DEFAULT_LAYOUT);
      expect(isDefaultLayout(l)).toBe(true);
    }
  });

  it('esconder e mostrar, subir e descer; ida e volta pelo texto guardado', () => {
    let l = setCardShown(DEFAULT_LAYOUT, 'calor', false);
    l = moveCard(l, 'exercicio', -1);
    l = moveCard(l, 'exercicio', -1);
    expect(visibleCards(l)).toEqual(['volume', 'exercicio', 'desafios', 'series', 'grupos']);
    expect(isDefaultLayout(l)).toBe(false);
    expect(parseLayout(serializeLayout(l))).toEqual(l);
    expect(visibleCards(setCardShown(l, 'calor', true))[0]).toBe('calor');
    // esconder duas vezes não repete
    expect(setCardShown(l, 'calor', false).hidden).toEqual(['calor']);
  });

  it('nas pontas, subir o primeiro e descer o último não mudam nada', () => {
    expect(moveCard(DEFAULT_LAYOUT, 'calor', -1)).toBe(DEFAULT_LAYOUT);
    expect(moveCard(DEFAULT_LAYOUT, 'grupos', 1)).toBe(DEFAULT_LAYOUT);
  });

  it('cartão desconhecido some, repetido conta uma vez, e o que falta entra perto do vizinho padrão', () => {
    const l = parseLayout(JSON.stringify({ order: ['grupos', 'antigo', 'calor', 'calor', 'series'], hidden: ['antigo', 'series', 7] }));
    // volume e desafios vêm depois de calor; exercicio vem depois de series
    expect(l.order).toEqual(['grupos', 'calor', 'volume', 'desafios', 'series', 'exercicio']);
    expect(l.hidden).toEqual(['series']);
  });
});
