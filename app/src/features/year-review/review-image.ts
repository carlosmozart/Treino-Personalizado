// V6: cada tela da retrospectiva vira uma imagem 1080×1920 (9:16, o formato de stories), com o
// mesmo degradê da tela no app. Fundo fixo, para ficar igual em qualquer tema.
import type { ReviewSlide } from '../../domain/year-review';
import { fit, fontFamily, wrap } from '../progress/workout-card-image';

export const STORY_W = 1080;
export const STORY_H = 1920;
const PAD = 96;

/** Degradês das telas (de cima para baixo), os mesmos da tela no app. */
export const TONES: [string, string][] = [
  ['#1e3a8a', '#7c3aed'],
  ['#9d174d', '#ea580c'],
  ['#065f46', '#0284c7'],
  ['#7f1d1d', '#c2410c'],
  ['#312e81', '#be185d'],
  ['#134e4a', '#4d7c0f']
];

export function drawSlide(canvas: HTMLCanvasElement, slide: ReviewSlide, appName: string): void {
  const font = fontFamily();
  const inner = STORY_W - PAD * 2;
  canvas.width = STORY_W;
  canvas.height = STORY_H;
  const ctx = canvas.getContext('2d')!;
  const [top, bottom] = TONES[slide.tone % TONES.length]!;
  const g = ctx.createLinearGradient(0, 0, 0, STORY_H);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, STORY_W, STORY_H);
  // dois círculos suaves para o fundo não ficar chapado
  ctx.fillStyle = 'rgb(255 255 255 / 0.07)';
  ctx.beginPath(); ctx.arc(STORY_W - 120, 260, 300, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(140, STORY_H - 360, 240, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'alphabetic';

  // o número grande: encolhe até caber em no máximo 3 linhas
  let size = 200;
  let lines: string[] = [];
  for (; size >= 84; size -= 12) {
    ctx.font = `900 ${size}px ${font}`;
    lines = wrap(ctx, slide.big, inner, 3);
    if (lines.every(l => ctx.measureText(l).width <= inner) && !lines[lines.length - 1]!.endsWith('…')) break;
  }
  ctx.font = `500 54px ${font}`;
  const text = wrap(ctx, slide.text, inner, 4);
  const stats = slide.stats ?? [];

  // altura do bloco, para centralizar na vertical como na tela do app
  const EYEBROW = 52, GAP = 36, BIG = size * 1.02, TEXT = 72, STAT = 92;
  const height = EYEBROW + GAP + lines.length * BIG + GAP + text.length * TEXT + (stats.length ? 40 + stats.length * STAT : 0);
  let y = Math.max(PAD + 120, (STORY_H - height) / 2) + EYEBROW;

  ctx.font = `700 52px ${font}`;
  ctx.globalAlpha = 0.8;
  ctx.fillText(fit(ctx, slide.eyebrow.toUpperCase(), inner), PAD, y);
  ctx.globalAlpha = 1;
  y += GAP;
  ctx.font = `900 ${size}px ${font}`;
  for (const l of lines) { y += BIG; ctx.fillText(l, PAD, y - size * 0.18); }
  y += GAP;
  ctx.font = `500 54px ${font}`;
  for (const l of text) { y += TEXT; ctx.fillText(l, PAD, y - 18); }

  if (stats.length) {
    y += 40;
    for (const [label, value] of stats) {
      y += STAT;
      ctx.globalAlpha = 0.75;
      ctx.font = `600 42px ${font}`;
      ctx.fillText(label, PAD, y - 30);
      ctx.globalAlpha = 1;
      ctx.font = `800 56px ${font}`;
      const v = fit(ctx, value, inner * 0.6);
      ctx.fillText(v, STORY_W - PAD - ctx.measureText(v).width, y - 30);
    }
  }

  ctx.globalAlpha = 0.85;
  ctx.font = `700 40px ${font}`;
  ctx.fillText(appName, PAD, STORY_H - PAD);
  ctx.globalAlpha = 1;
}

export function slideBlob(slide: ReviewSlide, appName: string): Promise<Blob> {
  const canvas = document.createElement('canvas');
  drawSlide(canvas, slide, appName);
  return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('canvas vazio'))), 'image/png'));
}
