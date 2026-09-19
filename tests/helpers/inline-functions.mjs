import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import vm from 'node:vm';

const source = await readFile(resolve(process.cwd(), 'index.html'), 'utf8');

function findFunctionEnd(start) {
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let index = bodyStart; index < source.length; index++) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === "'" || char === '"' || char === '`') {
      quote = char;
      continue;
    }
    if (char === '{') depth++;
    if (char === '}' && --depth === 0) return index + 1;
  }
  throw new Error('Função sem fechamento.');
}

function readFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  if (start === -1) throw new Error(`Função ${name} não encontrada no index.html.`);
  return source.slice(start, findFunctionEnd(start));
}

export function loadInlineFunctions(names, dependencies = {}) {
  const context = { ...dependencies };
  vm.createContext(context);
  vm.runInContext(names.map(readFunction).join('\n'), context);
  return context;
}
