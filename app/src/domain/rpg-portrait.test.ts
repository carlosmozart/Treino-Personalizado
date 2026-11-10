import { describe, expect, it } from 'vitest';
import { RPG_CLASSES } from '../data/rpg-classes';
import { COSTUMES, defaultLook, HAIR_STYLES, usedParts } from '../data/rpg-looks';
import { composePortrait, gradient, hexRgb, portraitFiles, portraitLook, type LayerPixels, type PortraitManifest } from './rpg-portrait';
import { rpgLookOf, setRpgLook, setRpgSex } from './rpg';
import { sampleData } from './testing';
import manifestSource from '../../public/rpg/retrato/manifest.json?raw';

const NOW = new Date('2026-11-09T12:00:00');
const manifest = JSON.parse(manifestSource) as PortraitManifest;

describe('arte gerada (public/rpg/retrato)', () => {
  it('tem toda peça usada pelas roupas e pelo criador, nos corpos certos', () => {
    for (const id of usedParts()) expect(manifest.parts[id], id).toBeDefined();
    for (const cls of RPG_CLASSES) for (const [sex, body] of [['m', 'man'], ['f', 'woman']] as const) {
      const costume = COSTUMES[cls.id]![sex];
      for (const part of Object.values(costume.parts)) expect(manifest.parts[part!]?.[body], `${cls.id}/${sex}: ${part}`).toBeDefined();
    }
    for (const h of HAIR_STYLES) for (const [sex, body] of [['m', 'man'], ['f', 'woman']] as const) {
      if (!h.sexes || h.sexes.includes(sex)) expect(manifest.parts[h.id]?.[body], `${h.id}/${body}`).toBeDefined();
    }
  });

  it('metade da resolução original e o rosto feliz para o level up', () => {
    expect([manifest.w, manifest.h]).toEqual([384, 768]);
    expect(Object.keys(manifest.bodies).sort()).toEqual(['man', 'woman']);
    expect(manifest.parts['face.soft']!.woman!.moods?.happy?.length).toBeGreaterThan(0);
  });
});

describe('portraitLook', () => {
  it('junta a aparência com a roupa da classe e as cores das zonas', () => {
    const pl = portraitLook({ ...defaultLook('m'), beard: 'beard.full', glasses: true }, 'm', 'mago');
    expect(pl.body).toBe('man');
    expect(pl.parts).toMatchObject({ hair: 'hair.short', face: 'face.keen', beard: 'beard.full', glasses: 'glasses.round', outfit: 'outfit.vestment', cloak: 'cloak.cloak' });
    expect(pl.colors['outfit.1']).toBe('#5a3fa8');
    expect(pl.colors['outfit.3']).toBe('#e2c070'); // padrão da peça (ouro)
    expect(pl.colors.skin).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('corpo feminino não leva barba e usa a roupa feminina', () => {
    const pl = portraitLook({ ...defaultLook('f'), beard: 'beard.full' }, 'f', 'monge');
    expect(pl.parts.beard).toBeUndefined();
    expect(pl.parts.outfit).toBe('outfit.robe');
  });

  it('o rosto feliz troca só as camadas do rosto', () => {
    const pl = portraitLook(defaultLook('f'), 'f', 'aprendiz');
    const neutral = portraitFiles(manifest, pl, 'neutral');
    const happy = portraitFiles(manifest, pl, 'happy');
    expect(happy.length).toBe(neutral.length);
    expect(happy.filter(f => !neutral.includes(f)).every(f => f.startsWith('face.'))).toBe(true);
  });
});

describe('rpgLookOf', () => {
  it('sem escolha, a aparência padrão do sexo; penteado só masculino volta ao padrão no feminino', () => {
    const data = setRpgSex(sampleData(), 'f', NOW).data;
    expect(rpgLookOf(data)).toEqual(defaultLook('f'));
    const thin = setRpgLook(data, { ...defaultLook('f'), hair: 'hair.thin' }, NOW).data;
    expect(rpgLookOf(thin).hair).toBe(defaultLook('f').hair);
    expect(rpgLookOf(setRpgSex(thin, 'm', NOW).data).hair).toBe('hair.thin');
  });
});

describe('composePortrait (manifesto sintético)', () => {
  // quadro 4×4: corpo (zona 1 = pele) inteiro; cabelo na linha 0; chapéu que cobre as linhas 0–1
  const m: PortraitManifest = {
    w: 4, h: 4,
    bodies: { man: { layers: [{ file: 'body', x: 0, y: 0, w: 4, h: 4, z: 'body', zones: ['skin'] }], bust: { x: 0, y: 0, w: 4, h: 4 } } },
    parts: {
      'hair.x': { man: { layers: [{ file: 'hair', x: 0, y: 0, w: 4, h: 3, z: 'hair', zones: ['hair'] }] } },
      'hat.x': { man: { covers: true, layers: [{ file: 'hat', x: 0, y: 0, w: 4, h: 2, z: 'hat', zones: ['.1'] }] } }
    }
  };
  const solid = (w: number, h: number, zone: number, value = 180): LayerPixels => {
    const v = new Uint8Array(w * h * 4), p = new Uint8Array(w * h * 4);
    for (let i = 0; i < w * h; i++) { v.set([value, 40 * zone, 0, 255], i * 4); p.set([10, 20, 30, 255], i * 4); }
    return { paint: p, value: v };
  };
  const px = { body: solid(4, 4, 1), hair: solid(4, 3, 1), hat: solid(4, 2, 1) };
  const at = (out: Uint8ClampedArray, x: number, y: number) => [...out.slice((y * 4 + x) * 4, (y * 4 + x) * 4 + 3)];

  it('repinta cada zona com a cor da chave, no valor 180 exato', () => {
    const out = composePortrait(m, { body: 'man', parts: {}, colors: { skin: '#c68a5e' } }, 'neutral', f => px[f as keyof typeof px]);
    expect(at(out, 1, 1)).toEqual(hexRgb('#c68a5e'));
    expect([...gradient(hexRgb('#c68a5e')).slice(180 * 3, 181 * 3)]).toEqual(hexRgb('#c68a5e'));
  });

  it('o chapéu que cobre esconde o cabelo embaixo da aba; abaixo dela o cabelo aparece', () => {
    const look = { body: 'man' as const, parts: { hair: 'hair.x', hat: 'hat.x' }, colors: { skin: '#000000', hair: '#ff0000', 'hat.1': '#0000ff' } };
    const out = composePortrait(m, look, 'neutral', f => px[f as keyof typeof px]);
    expect(at(out, 0, 0)).toEqual([0, 0, 255]); // chapéu
    expect(at(out, 0, 2)).toEqual([255, 0, 0]); // cabelo abaixo da aba
    expect(at(out, 0, 3)).toEqual([0, 0, 0]); // pele
  });

  it('camada que ainda não carregou fica de fora sem quebrar', () => {
    const out = composePortrait(m, { body: 'man', parts: { hair: 'hair.x' }, colors: { skin: '#123456' } }, 'neutral', f => (f === 'body' ? px.body : undefined));
    expect(at(out, 0, 0)).toEqual(hexRgb('#123456'));
  });
});
