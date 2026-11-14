// T23: pilha de pesos da máquina. A pessoa diz os pesos que o pino escolhe ("5, 10, 15" ou
// "5-100/5"), e a carga sugerida e os botões de carga andam de pino em pino.

const roundKg = (n: number) => Math.round(n * 100) / 100;

/**
 * Lê a pilha: números separados por vírgula, espaço ou ponto e vírgula, e faixas "início-fim/passo"
 * (vírgula decimal vale: "2,5-40/2,5"). Até 60 pesos, em ordem, sem repetir.
 */
export function parseStack(text: string): number[] {
  const out = new Set<number>();
  const num = (s: string) => Number(s.replace(',', '.'));
  // "5,10,15" (duas vírgulas ou mais, sem faixa) é lista; "2,5" é um número com vírgula decimal
  const parts = text.split(/[;\s]+|,(?!\d)|,\s/).map(p => p.trim()).filter(Boolean)
    .flatMap(p => ((p.match(/,/g) ?? []).length >= 2 && !p.includes('-') ? p.split(',') : [p]));
  for (const part of parts) {
    const range = /^(\d+(?:[.,]\d+)?)-(\d+(?:[.,]\d+)?)\/(\d+(?:[.,]\d+)?)$/.exec(part);
    if (range) {
      const [a, b, step] = [num(range[1]!), num(range[2]!), num(range[3]!)];
      if (step > 0 && b >= a) for (let w = a; w <= b + 1e-9 && out.size < 60; w += step) out.add(roundKg(w));
      continue;
    }
    const n = num(part);
    if (Number.isFinite(n) && n > 0 && n < 1000) out.add(roundKg(n));
  }
  return [...out].sort((x, y) => x - y).slice(0, 60);
}

/** "5, 10, 15 … 100" para mostrar. */
export function formatStack(stack: readonly number[]): string {
  const kg = (n: number) => String(n).replace('.', ',');
  if (stack.length <= 6) return stack.map(kg).join(', ');
  return `${stack.slice(0, 3).map(kg).join(', ')} … ${kg(stack[stack.length - 1]!)}`;
}

/** O peso da pilha: o primeiro acima, o primeiro abaixo ou o mais perto. Sem pilha, o próprio peso. */
export function snapStack(weight: number, stack: readonly number[] | undefined, mode: 'up' | 'down' | 'near'): number {
  if (!stack?.length) return weight;
  if (mode === 'up') return stack.find(w => w > weight + 1e-9) ?? stack[stack.length - 1]!;
  if (mode === 'down') return [...stack].reverse().find(w => w < weight - 1e-9) ?? stack[0]!;
  return stack.reduce((best, w) => (Math.abs(w - weight) < Math.abs(best - weight) ? w : best), stack[0]!);
}
