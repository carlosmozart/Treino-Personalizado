// Retrato do personagem (R2): busca as camadas em public/rpg/retrato/, monta (domain/rpg-portrait)
// e desenha num canvas. Corpo inteiro ou só o busto. Sem a arte (offline na primeira vez, navegador
// sem createImageBitmap), mostra o emblema da classe.
import { useEffect, useRef, useState } from 'react';
import type { RpgClass, RpgTheme } from '../../data/rpg-classes';
import type { RpgLook } from '../../data/rpg-looks';
import type { RpgSex } from '../../domain/rpg';
import { bustRect, composePortrait, portraitFiles, portraitLook, type LayerPixels, type Mood, type PortraitManifest } from '../../domain/rpg-portrait';
import { RpgEmblem } from './RpgEmblem';

const BASE = `${import.meta.env.BASE_URL}rpg/retrato/`;

let manifestPromise: Promise<PortraitManifest> | null = null;
const layers = new Map<string, Promise<LayerPixels>>();
const composed = new Map<string, Promise<HTMLCanvasElement>>();
const MAX_COMPOSED = 24;

function manifest(): Promise<PortraitManifest> {
  manifestPromise ??= fetch(`${BASE}manifest.json`).then(r => {
    if (!r.ok) throw new Error(`manifesto ${r.status}`);
    return r.json() as Promise<PortraitManifest>;
  }).catch(e => { manifestPromise = null; throw e; });
  return manifestPromise;
}

/** Decodifica sem conversão de cor nem pré-multiplicação: o mapa de valores precisa chegar intacto. */
async function decode(url: string): Promise<ImageData> {
  const blob = await (await fetch(url)).blob();
  const bmp = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
  const canvas = document.createElement('canvas');
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(bmp, 0, 0);
  bmp.close();
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function layer(file: string): Promise<LayerPixels> {
  let p = layers.get(file);
  if (!p) {
    p = Promise.all([decode(`${BASE}${file}.webp`), decode(`${BASE}${file}.z.webp`)]).then(([paint, value]) => ({ paint: paint.data, value: value.data }));
    p.catch(() => layers.delete(file));
    layers.set(file, p);
  }
  return p;
}

/** Figura inteira montada num canvas (guardada: trocar de tela não remonta). */
export function composeFigure(look: RpgLook, sex: RpgSex, classId: string, mood: Mood): Promise<{ canvas: HTMLCanvasElement; bust: { x: number; y: number; w: number; h: number } }> {
  const key = JSON.stringify([look, sex, classId, mood]);
  let p = composed.get(key);
  if (!p) {
    p = (async () => {
      const m = await manifest();
      const pl = portraitLook(look, sex, classId);
      const files = portraitFiles(m, pl, mood);
      const loaded = new Map(await Promise.all(files.map(async f => [f, await layer(f)] as const)));
      const rgba = composePortrait(m, pl, mood, f => loaded.get(f));
      const canvas = document.createElement('canvas');
      canvas.width = m.w;
      canvas.height = m.h;
      canvas.getContext('2d')!.putImageData(new ImageData(rgba as unknown as Uint8ClampedArray<ArrayBuffer>, m.w, m.h), 0, 0);
      canvas.dataset.bust = JSON.stringify(bustRect(m, pl));
      return canvas;
    })();
    p.catch(() => composed.delete(key));
    composed.set(key, p);
    if (composed.size > MAX_COMPOSED) composed.delete(composed.keys().next().value!);
  }
  return p.then(canvas => ({ canvas, bust: JSON.parse(canvas.dataset.bust!) }));
}

export const portraitSupported = () => typeof createImageBitmap === 'function' && typeof fetch === 'function';

interface Props {
  look: RpgLook;
  sex: RpgSex;
  cls: RpgClass;
  theme: RpgTheme;
  /** Busto (cabeça e ombros, quadrado) ou corpo inteiro (1:2). */
  mode: 'bust' | 'full';
  /** Largura em px na tela; a altura vem do modo. */
  size: number;
  mood?: Mood;
  label?: string;
}

export function Portrait({ look, sex, cls, theme, mode, size, mood = 'neutral', label }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>(portraitSupported() ? 'loading' : 'failed');
  const key = JSON.stringify([look, sex, cls.id, mood, mode]);

  useEffect(() => {
    if (!portraitSupported()) return undefined;
    let alive = true;
    setState(s => (s === 'ready' ? s : 'loading'));
    composeFigure(look, sex, cls.id, mood).then(({ canvas, bust }) => {
      const target = ref.current;
      if (!alive || !target) return;
      const src = mode === 'bust' ? bust : { x: 0, y: 0, w: canvas.width, h: canvas.height };
      target.width = src.w;
      target.height = src.h;
      const ctx = target.getContext('2d')!;
      ctx.clearRect(0, 0, src.w, src.h);
      ctx.drawImage(canvas, src.x, src.y, src.w, src.h, 0, 0, src.w, src.h);
      setState('ready');
    }, () => alive && setState('failed'));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const height = mode === 'bust' ? size : size * 2;
  if (state === 'failed') {
    return (
      <span role="img" aria-label={label} className="inline-flex items-center justify-center" style={{ width: size, height }}>
        <RpgEmblem cls={cls} theme={theme} size={Math.min(size, height) * 0.8} />
      </span>
    );
  }
  return (
    <canvas ref={ref} role="img" aria-label={label} data-ready={state === 'ready' ? '1' : undefined}
      className={`shrink-0 ${state === 'loading' ? 'animate-pulse rounded-2xl bg-surface-2' : ''}`}
      style={{ width: size, height }} />
  );
}
