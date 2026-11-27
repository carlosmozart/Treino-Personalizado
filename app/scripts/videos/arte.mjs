// Desenha as artes dos vídeos (fundo, legendas, aberturas e encerramento) a partir de HTML.
// Uso (em app/): node scripts/videos/arte.mjs <trabalhos.json>
// trabalhos.json: [{ "out": "x.png", "width": 1080, "height": 1920, "html": "...", "transparent": true }]
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const jobs = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const job of jobs) {
  await page.setViewportSize({ width: job.width, height: job.height });
  await page.setContent(job.html, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: job.out, omitBackground: !!job.transparent });
}
await browser.close();
console.log(`${jobs.length} artes`);
