// Prepara a arte do personagem do modo RPG (R2) a partir do clone do openworld:
// só os corpos adultos (mulher e homem), o rosto neutro e o feliz, em metade da resolução
// (768×1536 → 384×768), com um manifesto próprio. A arte é CC0 (lsw/LICENSE.md, copiado como LICENCA-DA-ARTE.md).
//
// Uso: node scripts/rpg-art/build-portraits.mjs [pasta Looks/portrait do openworld]
// Saída: public/rpg/retrato/ (versionada; rodar de novo quando a arte ou as roupas mudarem).
// Só entram as peças que o app usa (usedParts em src/data/rpg-looks.ts), em WebP sem perdas.
//
// Reduzir não é só encolher: cada camada tem a pintura (RGBA) e o mapa de valores (R = sombreado,
// G = 40 × zona, A = cobertura). A zona não pode ser misturada (viraria outra zona), então vem do
// pixel mais opaco do bloco 2×2; o resto é a média ponderada pela cobertura.
import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(process.argv[2] ?? 'E:/GitHub/openworld/games/openworld/public/assets/lsw/Looks/portrait');
const OUT = resolve(here, '../../public/rpg/retrato');
const BODIES = ['woman', 'man'];
const MOODS = ['happy'];
const { usedParts } = await import('../../src/data/rpg-looks.ts');
const USED = new Set(usedParts());

const manifest = JSON.parse(await readFile(join(SRC, 'manifest.json'), 'utf8'));
const half = l => ({ ...l, x: Math.floor(l.x / 2), y: Math.floor(l.y / 2), w: Math.ceil((l.w + (l.x % 2)) / 2), h: Math.ceil((l.h + (l.y % 2)) / 2) });

const out = { w: manifest.w / 2, h: manifest.h / 2, bodies: {}, parts: {} };
const jobs = new Map(); // arquivo → camada original (para o deslocamento ímpar)
for (const b of BODIES) {
  const body = manifest.bodies[b];
  out.bodies[b] = { layers: body.layers.map(half), bust: Object.fromEntries(Object.entries(body.bust).map(([k, v]) => [k, Math.round(v / 2)])) };
  body.layers.forEach(l => jobs.set(l.file, l));
}
for (const [id, perBody] of Object.entries(manifest.parts)) {
  if (!USED.has(id)) continue;
  for (const b of BODIES) {
    const p = perBody[b];
    if (!p) continue;
    const part = { ...p, layers: p.layers.map(half) };
    p.layers.forEach(l => jobs.set(l.file, l));
    if (p.moods) {
      const moods = Object.fromEntries(Object.entries(p.moods).filter(([m]) => MOODS.includes(m)).map(([m, ls]) => [m, ls.map(half)]));
      Object.entries(p.moods).filter(([m]) => MOODS.includes(m)).forEach(([, ls]) => ls.forEach(l => jobs.set(l.file, l)));
      if (Object.keys(moods).length) part.moods = moods; else delete part.moods;
    }
    (out.parts[id] ??= {})[b] = part;
  }
}

const missing = [...USED].filter(id => !out.parts[id]);
if (missing.length) throw new Error(`peças que não existem no manifesto: ${missing.join(', ')}`);
await rm(OUT, { recursive: true, force: true });
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent('<!doctype html><title>reduzir</title>');
let bytes = 0;
for (const [file, layer] of jobs) {
  const [paint, value] = await Promise.all([readFile(join(SRC, `${file}.png`)), readFile(join(SRC, `${file}.z.png`))]);
  const [p2, v2] = await page.evaluate(async ({ paint, value, ox, oy }) => {
    const decode = async b64 => {
      const blob = await (await fetch(`data:image/png;base64,${b64}`)).blob();
      const bmp = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
      const c = new OffscreenCanvas(bmp.width, bmp.height);
      const x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(bmp, 0, 0);
      return x.getImageData(0, 0, bmp.width, bmp.height);
    };
    const [P, V] = await Promise.all([decode(paint), decode(value)]);
    const w = P.width, h = P.height, W = Math.ceil((w + ox) / 2), H = Math.ceil((h + oy) / 2);
    const po = new ImageData(W, H), vo = new ImageData(W, H);
    for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
      let a = 0, pr = 0, pg = 0, pb = 0, vr = 0, best = -1, bi = -1;
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
        const sx = tx * 2 + dx - ox, sy = ty * 2 + dy - oy;
        if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
        const i = (sy * w + sx) * 4, pa = P.data[i + 3], va = V.data[i + 3];
        a += va; pr += P.data[i] * pa; pg += P.data[i + 1] * pa; pb += P.data[i + 2] * pa; vr += V.data[i] * va;
        if (va > best) { best = va; bi = i; }
      }
      const o = (ty * W + tx) * 4;
      let pA = 0;
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
        const sx = tx * 2 + dx - ox, sy = ty * 2 + dy - oy;
        if (sx >= 0 && sy >= 0 && sx < w && sy < h) pA += P.data[(sy * w + sx) * 4 + 3];
      }
      if (pA > 0) { po.data[o] = pr / pA; po.data[o + 1] = pg / pA; po.data[o + 2] = pb / pA; po.data[o + 3] = pA / 4; }
      if (a > 0) { vo.data[o] = vr / a; vo.data[o + 1] = V.data[bi + 1]; vo.data[o + 2] = V.data[bi + 2]; vo.data[o + 3] = a / 4; }
    }
    const encode = async img => {
      const c = new OffscreenCanvas(img.width, img.height);
      c.getContext('2d').putImageData(img, 0, 0);
      // qualidade 1 = WebP sem perdas no Chromium (conferido: o mapa de zonas volta idêntico)
      const buf = new Uint8Array(await (await c.convertToBlob({ type: 'image/webp', quality: 1 })).arrayBuffer());
      let s = '';
      for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      return btoa(s);
    };
    return [await encode(po), await encode(vo)];
  }, { paint: paint.toString('base64'), value: value.toString('base64'), ox: layer.x % 2, oy: layer.y % 2 });
  const target = join(OUT, file);
  await mkdir(dirname(target), { recursive: true });
  const pb = Buffer.from(p2, 'base64'), vb = Buffer.from(v2, 'base64');
  await writeFile(`${target}.webp`, pb);
  await writeFile(`${target}.z.webp`, vb);
  bytes += pb.length + vb.length;
}
await browser.close();
await writeFile(join(OUT, 'manifest.json'), JSON.stringify(out));
await copyFile(join(SRC, '../../LICENSE.md'), join(OUT, 'LICENCA-DA-ARTE.md'));
console.log(`${jobs.size} camadas, ${(bytes / 1e6).toFixed(2)} MB em ${OUT}`);
