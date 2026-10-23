// S9: desenha o cartão do treino num canvas de 1080 de largura: quadrado para treino curto, até
// retrato 4:5 (1080×1350) para treino longo; os dois formatos vão bem no WhatsApp e no Instagram.
// Fundo escuro fixo para ficar igual em qualquer tema; a cor de destaque é a escolhida no app.
import type { WorkoutCard } from '../../domain/workout-card';

export const CARD_W = 1080;
export const CARD_H = 1350;
const MIN_H = 1080;
const PAD = 80;
const BG = '#0b1220';
const SURFACE = '#172033';
const INK = '#f8fafc';
const MUTED = '#94a3b8';
const RECORD = '#f59e0b';
const LINE_H = 104;
const FOOTER_H = 110;

function fontFamily(): string {
  return (typeof getComputedStyle === 'function' && getComputedStyle(document.body).fontFamily) || 'system-ui, sans-serif';
}

/** Corta o texto com reticências para caber na largura. */
function fit(ctx: CanvasRenderingContext2D, text: string, width: number): string {
  if (ctx.measureText(text).width <= width) return text;
  let lo = 0, hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (ctx.measureText(`${text.slice(0, mid).trimEnd()}…`).width <= width) lo = mid; else hi = mid - 1;
  }
  return `${text.slice(0, lo).trimEnd()}…`;
}

/** Quebra em até `max` linhas; a última leva reticências se sobrar texto. */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, max: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (let i = 0; i < words.length; i++) {
    const next = cur ? `${cur} ${words[i]}` : words[i]!;
    if (ctx.measureText(next).width <= width || !cur) { cur = next; continue; }
    if (lines.length === max - 1) return [...lines, fit(ctx, `${cur} ${words.slice(i).join(' ')}`, width)];
    lines.push(cur);
    cur = words[i]!;
  }
  return [...lines, fit(ctx, cur, width)];
}

function pill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

export function drawWorkoutCard(canvas: HTMLCanvasElement, card: WorkoutCard, accent: string, appName: string): void {
  const font = fontFamily();
  const inner = CARD_W - PAD * 2;
  canvas.width = CARD_W;
  // altura: o título (1 ou 2 linhas) e quantos exercícios cabem decidem; mudar a altura limpa o canvas
  let ctx = canvas.getContext('2d')!;
  ctx.font = `800 72px ${font}`;
  const titleLines = wrap(ctx, card.title, inner, 2);
  const listTop = PAD + 40 + titleLines.length * 86 + 54 + 48 + 150 + 64;
  const room = Math.floor((CARD_H - FOOTER_H - listTop) / LINE_H);
  const shownCount = card.lines.length > room ? Math.max(0, room - 1) : card.lines.length;
  const rows = shownCount + (shownCount < card.lines.length ? 1 : 0);
  const height = Math.min(CARD_H, Math.max(MIN_H, listTop + rows * LINE_H + FOOTER_H - 20));
  canvas.height = height;
  ctx = canvas.getContext('2d')!;
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, CARD_W, height);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, CARD_W, 16);

  let y = PAD + 40;
  ctx.fillStyle = accent;
  ctx.font = `800 34px ${font}`;
  ctx.fillText('TREINO CONCLUÍDO', PAD, y);

  ctx.fillStyle = INK;
  ctx.font = `800 72px ${font}`;
  for (const line of titleLines) { y += 86; ctx.fillText(line, PAD, y); }
  y += 54;
  ctx.fillStyle = MUTED;
  ctx.font = `500 36px ${font}`;
  ctx.fillText(fit(ctx, card.date, inner), PAD, y);

  // números grandes
  y += 48;
  const gap = 20;
  const boxW = (inner - gap * (card.stats.length - 1)) / card.stats.length;
  card.stats.forEach((s, i) => {
    const x = PAD + i * (boxW + gap);
    ctx.fillStyle = SURFACE;
    pill(ctx, x, y, boxW, 150, 28);
    ctx.fillStyle = INK;
    ctx.font = `800 ${card.stats.length > 3 ? 52 : 60}px ${font}`;
    ctx.fillText(fit(ctx, s.value, boxW - 48), x + 24, y + 78);
    ctx.fillStyle = MUTED;
    ctx.font = `600 26px ${font}`;
    ctx.fillText(fit(ctx, s.label, boxW - 48), x + 24, y + 122);
  });
  y += 150 + 64;

  // exercícios: os que couberem, e "+ N exercícios" no fim
  const shown = card.lines.slice(0, shownCount);
  for (const line of shown) {
    // o selo de recorde vai na linha das séries, à direita; o nome fica com a largura toda
    let detailWidth = inner;
    if (line.record) {
      ctx.font = `800 26px ${font}`;
      const w = ctx.measureText(line.record).width + 36;
      ctx.fillStyle = 'rgba(245, 158, 11, 0.18)';
      pill(ctx, CARD_W - PAD - w, y + 8, w, 46, 23);
      ctx.fillStyle = RECORD;
      ctx.fillText(line.record, CARD_W - PAD - w + 18, y + 40);
      detailWidth = inner - w - 24;
    }
    ctx.fillStyle = INK;
    ctx.font = `700 38px ${font}`;
    ctx.fillText(fit(ctx, line.name, inner), PAD, y);
    ctx.fillStyle = MUTED;
    ctx.font = `500 30px ${font}`;
    ctx.fillText(fit(ctx, line.detail, detailWidth), PAD, y + 42);
    y += LINE_H;
  }
  if (shown.length < card.lines.length) {
    const more = card.lines.length - shown.length;
    ctx.fillStyle = MUTED;
    ctx.font = `600 30px ${font}`;
    ctx.fillText(`+ ${more} ${more === 1 ? 'exercício' : 'exercícios'}`, PAD, y);
  }

  ctx.fillStyle = MUTED;
  ctx.font = `600 30px ${font}`;
  ctx.fillText(appName, PAD, height - 56);
}

export function workoutCardBlob(card: WorkoutCard, accent: string, appName: string): Promise<Blob> {
  const canvas = document.createElement('canvas');
  drawWorkoutCard(canvas, card, accent, appName);
  return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Falha ao gerar a imagem.'))), 'image/png'));
}
