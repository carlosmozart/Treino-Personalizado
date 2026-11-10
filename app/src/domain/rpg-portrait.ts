// Modo RPG (R2): monta o retrato do personagem a partir das camadas (public/rpg/retrato/).
// Puro: recebe as camadas já decodificadas e devolve RGBA; a tela busca e desenha.
//
// Adaptado de openworld (packages/runtime/src/assets/figure/portrait.ts e color.ts):
//
//   MIT License — Copyright (c) 2026 The OpenWorld authors
//
//   Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
//   associated documentation files (the "Software"), to deal in the Software without restriction,
//   including without limitation the rights to use, copy, modify, merge, publish, distribute,
//   sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
//   furnished to do so, subject to the following conditions:
//
//   The above copyright notice and this permission notice shall be included in all copies or
//   substantial portions of the Software.
//
//   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
//   NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
//   NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
//   DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT
//   OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//
// Cada camada tem a pintura (RGBA) e o mapa de valores (R = sombreado, G = 40 × zona, A = cobertura).
// A zona 0 fica com a pintura; a zona k é repintada pelo degradê da k-ésima cor da camada.
import { COSTUMES, EYE_COLORS, GLASSES_PART, HAIR_COLORS, SKIN_TONES, partColor, type RpgLook } from '../data/rpg-looks';
import type { RpgSex } from './rpg';

export type RGB = [number, number, number];
export type Mood = 'neutral' | 'happy';

export interface PortraitLayer { file: string; x: number; y: number; w: number; h: number; z: string; zones: string[]; above?: string[] }
export interface PortraitPart { layers: PortraitLayer[]; moods?: Partial<Record<Mood, PortraitLayer[]>>; covers?: boolean; above?: string[]; encloses?: boolean }
export interface PortraitBody extends PortraitPart { bust: { x: number; y: number; w: number; h: number } }
export interface PortraitManifest { w: number; h: number; bodies: Record<string, PortraitBody>; parts: Record<string, Record<string, PortraitPart>> }
export interface LayerPixels { paint: Uint8ClampedArray | Uint8Array; value: Uint8ClampedArray | Uint8Array }

/** O que o retrato desenha: corpo, peças por posição e cores (`skin`, `hair`, `eyes`, `<posição>.<n>`). */
export interface PortraitLook { body: 'woman' | 'man'; parts: Record<string, string>; colors: Record<string, string> }

export const LAYER_Z = ['hairBack', 'body', 'legs', 'outfit', 'shoes', 'armour', 'cloak', 'age', 'face', 'mark', 'beard', 'glasses', 'hair', 'hat'] as const;
const zOf = (z: string) => LAYER_Z.indexOf(z as (typeof LAYER_Z)[number]);
const BOOT_MARGIN = 8;
const HAT_SLOPE = 1.5;

const hexOf = (list: readonly { id: string; hex: string }[], id: string, fallback: string) => list.find(s => s.id === id)?.hex ?? fallback;

/** Junta a aparência escolhida com a roupa da classe. */
export function portraitLook(look: RpgLook, sex: RpgSex, classId: string): PortraitLook {
  const costume = (COSTUMES[classId] ?? COSTUMES.aprendiz!)[sex];
  const parts: Record<string, string> = { hair: look.hair, face: look.face };
  if (sex === 'm' && look.beard) parts.beard = look.beard;
  if (look.glasses) parts.glasses = GLASSES_PART;
  if (look.mark) parts.mark = look.mark;
  const colors: Record<string, string> = {
    skin: hexOf(SKIN_TONES, look.skin, '#e8bf9f'),
    hair: hexOf(HAIR_COLORS, look.hairColor, '#4a3226'),
    eyes: hexOf(EYE_COLORS, look.eyes, '#6b4129'),
    'glasses.1': partColor(GLASSES_PART, 1)
  };
  for (const [slot, id] of Object.entries(costume.parts)) {
    if (!id) continue;
    parts[slot] = id;
    for (const zone of [1, 2, 3]) colors[`${slot}.${zone}`] = partColor(id, zone, costume.colors?.[`${slot}.${zone}`]);
  }
  return { body: sex === 'f' ? 'woman' : 'man', parts, colors };
}

// ---------- cor (color.ts) ----------

export const hexRgb = (h: string): RGB => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)) as RGB;

function toHsl([r, g, b]: RGB): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function fromHsl(h: number, s: number, l: number): RGB {
  h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

const towards = (h: number, target: number, by: number) => {
  const d = ((target - h + 540) % 360) - 180;
  return h + Math.sign(d) * Math.min(Math.abs(d), by);
};

/** Tom de uma cor (-2 sombra mais funda … 0 a cor … +2 brilho): sombras mais frias, luzes mais quentes. */
export function shade(rgb: RGB, step: number): RGB {
  const [h, s, l] = toHsl(rgb);
  if (step === 0) return rgb;
  if (step < 0) { const k = -step; return fromHsl(towards(h, 255, 7 * k), s + 0.04 * k * (1 - s), l * (1 - 0.24 * k)); }
  return fromHsl(towards(h, 55, 8 * step), s * (1 - 0.06 * step), l + (1 - l) * 0.3 * step);
}

/** Degradê de 256 passos: o valor da camada (0 linha … 180 a cor … 255 brilho) vira cor. */
export function gradient(rgb: RGB): Uint8Array {
  const stops: [number, RGB][] = [[0, shade(shade(rgb, -2), -1)], [70, shade(rgb, -2)], [140, shade(rgb, -1)], [180, rgb], [225, shade(rgb, 1)], [255, shade(rgb, 2)]];
  const out = new Uint8Array(256 * 3);
  for (let v = 0; v < 256; v++) {
    let i = 0;
    while (i < stops.length - 2 && v > stops[i + 1]![0]) i++;
    const [v0, c0] = stops[i]!, [v1, c1] = stops[i + 1]!;
    const t = v1 === v0 ? 0 : Math.max(0, Math.min(1, (v - v0) / (v1 - v0)));
    for (let k = 0; k < 3; k++) out[v * 3 + k] = Math.round(c0[k]! + (c1[k]! - c0[k]!) * t);
  }
  return out;
}

// ---------- montagem (portrait.ts) ----------

interface Drawn { slot: string; layers: PortraitLayer[]; covers?: boolean | undefined; above?: string[] | undefined; encloses?: boolean | undefined }

function partsOf(m: PortraitManifest, look: PortraitLook, mood: Mood): Drawn[] {
  const out: Drawn[] = [];
  const body = m.bodies[look.body];
  if (body) out.push({ slot: 'body', layers: body.layers });
  for (const [slot, id] of Object.entries(look.parts)) {
    const p = m.parts[id]?.[look.body];
    if (!p) continue;
    out.push({ slot, layers: (mood !== 'neutral' && p.moods?.[mood]) || p.layers, covers: p.covers, above: p.above, encloses: p.encloses });
  }
  return out;
}

/** Arquivos (sem extensão) que um retrato precisa, para buscar antes de montar. */
export function portraitFiles(m: PortraitManifest, look: PortraitLook, mood: Mood = 'neutral'): string[] {
  return partsOf(m, look, mood).flatMap(p => p.layers.map(l => l.file));
}

export function bustRect(m: PortraitManifest, look: PortraitLook) {
  return m.bodies[look.body]?.bust ?? { x: 0, y: 0, w: m.w, h: m.w };
}

/** Onde uma bota fechada esconde o que vai por baixo (calça larga, meia ao lado), no quadro inteiro. */
function bootMask(parts: Drawn[], get: (file: string) => LayerPixels | undefined, S: number, SH: number): Uint8Array | undefined {
  const layers = parts.filter(p => p.encloses).flatMap(p => p.layers);
  if (!layers.length) return undefined;
  const inside = new Uint8Array(S * SH);
  const rim = new Int32Array(S).fill(SH);
  let x0 = S, x1 = 0;
  for (const l of layers) {
    const px = get(l.file);
    if (!px) continue;
    const piece = new Int32Array(l.w * l.h);
    let n = 0;
    for (let s0 = 0; s0 < l.w * l.h; s0++) {
      if (piece[s0] || px.value[s0 * 4 + 3] === 0) continue;
      piece[s0] = ++n;
      const stack = [s0];
      while (stack.length) {
        const i = stack.pop()!;
        const x = i % l.w, y = (i - x) / l.w;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= l.w || yy >= l.h) continue;
          const j = yy * l.w + xx;
          if (!piece[j] && px.value[j * 4 + 3]! > 0) { piece[j] = n; stack.push(j); }
        }
      }
    }
    for (let y = 0; y < l.h; y++) {
      const lo = new Int32Array(n + 1).fill(l.w), hi = new Int32Array(n + 1).fill(-1);
      for (let x = 0; x < l.w; x++) {
        const c = piece[y * l.w + x]!;
        if (c) { lo[c] = Math.min(lo[c]!, x); hi[c] = Math.max(hi[c]!, x); }
      }
      for (let c = 1; c <= n; c++) for (let x = lo[c]!; x <= hi[c]!; x++) {
        const ox = l.x + x, oy = l.y + y;
        if (ox < 0 || ox >= S || oy < 0 || oy >= SH) continue;
        inside[oy * S + ox] = 1;
        if (oy < rim[ox]!) rim[ox] = oy;
        x0 = Math.min(x0, ox); x1 = Math.max(x1, ox);
      }
    }
  }
  if (x0 > x1) return undefined;
  const top = Int32Array.from(rim);
  for (let x = Math.max(0, x0 - BOOT_MARGIN); x <= Math.min(S - 1, x1 + BOOT_MARGIN); x++) {
    if (rim[x]! < SH) continue;
    let near = SH;
    for (let d = 1; d <= BOOT_MARGIN && near === SH; d++) near = Math.min(x - d >= 0 ? rim[x - d]! : SH, x + d < S ? rim[x + d]! : SH);
    if (near < SH) { top[x] = near; continue; }
    if (x < x0 || x > x1) continue;
    let l = x;
    while (l > x0 && rim[l]! >= SH) l--;
    let r = x;
    while (r < x1 && rim[r]! >= SH) r++;
    top[x] = Math.max(rim[l]!, rim[r]!);
  }
  const hide = new Uint8Array(S * SH);
  for (let x = 0; x < S; x++) for (let y = top[x]!; y < SH; y++) if (!inside[y * S + x]) hide[y * S + x] = 1;
  return hide;
}

/** A figura inteira (m.w × m.h, RGBA); camadas ainda não carregadas ficam de fora. */
export function composePortrait(m: PortraitManifest, look: PortraitLook, mood: Mood, get: (file: string) => LayerPixels | undefined): Uint8ClampedArray {
  const S = m.w, SH = m.h;
  const out = new Uint8ClampedArray(S * SH * 4);
  const grads = new Map<string, Uint8Array>();
  const grad = (k: string) => {
    if (!grads.has(k)) grads.set(k, gradient(hexRgb(look.colors[k] ?? '#808080')));
    return grads.get(k)!;
  };
  const parts = partsOf(m, look, mood);
  // chapéu que cobre: por coluna, a linha mais baixa que ele cobre; o cabelo acima dela fica embaixo do chapéu
  const under = new Int32Array(S).fill(-1);
  for (const l of parts.find(p => p.covers)?.layers ?? []) {
    const px = get(l.file);
    if (!px) continue;
    for (let x = 0; x < l.w; x++) for (let y = l.h - 1; y >= 0; y--) {
      if (px.value[(y * l.w + x) * 4 + 3]! > 128) { under[l.x + x] = Math.max(under[l.x + x]!, l.y + y); break; }
    }
  }
  let first = -1, last = -1;
  for (let x = 0; x < S; x++) if (under[x]! >= 0) { first = first < 0 ? x : first; last = x; }
  if (first >= 0) {
    for (let x = 0; x < first; x++) under[x] = under[first]! + Math.round((first - x) * HAT_SLOPE);
    for (let x = last + 1; x < S; x++) under[x] = under[last]! + Math.round((x - last) * HAT_SLOPE);
    for (let x = first; x <= last; x++) if (under[x]! < 0) {
      let l = x;
      while (under[l]! < 0) l--;
      let r = x;
      while (under[r]! < 0) r++;
      under[x] = Math.max(under[l]!, under[r]!);
    }
  }
  const boot = bootMask(parts, get, S, SH);
  const place = (l: PortraitLayer, above?: string[]) => Math.max(zOf(l.z), ...[...(above ?? []), ...(l.above ?? [])].map(s => zOf(s) + 0.5));
  const stack = parts.flatMap(({ slot, layers, above }) => layers.map(l => ({ slot, l, at: place(l, above) })));
  stack.sort((a, b) => a.at - b.at);
  for (const { slot, l, at } of stack) {
    const px = get(l.file);
    if (!px) continue;
    const inBoot = at < zOf('shoes');
    const zg = l.zones.map(k => grad(k.startsWith('.') ? slot + k : k));
    for (let y = 0; y < l.h; y++) {
      const oy = l.y + y;
      if (oy < 0 || oy >= SH) continue;
      for (let x = 0; x < l.w; x++) {
        const ox = l.x + x;
        if (ox < 0 || ox >= S) continue;
        if (slot === 'hair' && oy < under[ox]!) continue;
        if (inBoot && boot && boot[oy * S + ox]) continue;
        const i = (y * l.w + x) * 4;
        const a = px.value[i + 3]! / 255;
        if (a <= 0) continue;
        const zone = Math.round(px.value[i + 1]! / 40);
        let r: number, g: number, b: number;
        const gr = zone > 0 ? zg[zone - 1] : undefined;
        if (gr) { const v = px.value[i]! * 3; r = gr[v]!; g = gr[v + 1]!; b = gr[v + 2]!; }
        else { r = px.paint[i]!; g = px.paint[i + 1]!; b = px.paint[i + 2]!; }
        const o = (oy * S + ox) * 4;
        const da = out[o + 3]! / 255;
        const na = a + da * (1 - a);
        out[o] = (r * a + out[o]! * da * (1 - a)) / na;
        out[o + 1] = (g * a + out[o + 1]! * da * (1 - a)) / na;
        out[o + 2] = (b * a + out[o + 2]! * da * (1 - a)) / na;
        out[o + 3] = na * 255;
      }
    }
  }
  return out;
}
