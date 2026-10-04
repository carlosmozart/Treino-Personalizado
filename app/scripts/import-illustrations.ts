// Importa as ilustrações do Everkinetic usadas pelo app (Q1).
// Uso: node app/scripts/import-illustrations.ts <pasta do clone de github.com/everkinetic/data>
//
// Para cada id em src/data/illustration-map.ts copia as duas posições (relaxation = inicial,
// tension = final), tira o fundo branco e pinta o traço com currentColor, para a figura seguir
// o tema. As imagens modificadas continuam sob CC BY-SA 4.0 (ver LICENSE.txt gerado).
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ILLUSTRATION_BY_NAME } from '../src/data/illustration-map.ts';

const source = process.argv[2];
if (!source) throw new Error('Informe a pasta do clone do everkinetic/data.');
const out = join(import.meta.dirname, '../src/assets/illustrations');

const ids = [...new Set(Object.values(ILLUSTRATION_BY_NAME))].sort();
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const LIGHT = /^#(fff|ffffff)$/i;

function convert(svg: string, file: string): string {
  const viewBox = /viewBox="([^"]+)"/.exec(svg)?.[1];
  if (!viewBox) throw new Error(`${file}: sem viewBox`);
  const groups = [...svg.matchAll(/<g fill="([^"]+)">([\s\S]*?)<\/g>/g)];
  const dark = groups.filter(([, fill]) => !LIGHT.test(fill!));
  if (!dark.length || groups.length - dark.length > 1) throw new Error(`${file}: estrutura inesperada`);
  const paths = dark.map(([, , body]) => body!.trim()).join('');
  // números com no máximo 1 casa decimal: metade do tamanho, sem diferença visível
  const compact = paths.replace(/(\d+\.\d)\d+/g, '$1');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="currentColor">${compact}</svg>\n`;
}

let bytes = 0;
for (const id of ids) {
  for (const [phase, suffix] of [['relaxation', 'a'], ['tension', 'b']] as const) {
    const file = join(source, 'dist/svg', `${id}-${phase}.svg`);
    const svg = convert(readFileSync(file, 'utf8'), file);
    bytes += svg.length;
    writeFileSync(join(out, `${id}-${suffix}.svg`), svg);
  }
}

writeFileSync(join(out, 'LICENSE.txt'), `Ilustrações de exercícios: Everkinetic (https://github.com/everkinetic/data),
projeto de dados abertos baseado em everkinetic.com, criado por Greg Priday.
Licença: Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0),
https://creativecommons.org/licenses/by-sa/4.0/

Modificações feitas pelo Treino Personalizado: remoção do fundo branco, cor do traço
trocada por currentColor e coordenadas arredondadas a uma casa decimal. Estas versões
modificadas são distribuídas sob a mesma licença CC BY-SA 4.0.

Arquivos: <id>-a.svg (posição inicial) e <id>-b.svg (posição final).
Ids usados: ${ids.join(', ')}
`);

console.log(`${ids.length} ilustrações (${ids.length * 2} arquivos, ${(bytes / 1024).toFixed(0)} KB); fonte: ${readdirSync(join(source, 'dist/svg')).length} arquivos`);
