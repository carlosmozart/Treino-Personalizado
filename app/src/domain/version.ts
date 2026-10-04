/**
 * Compara versões "maior.menor.correção". Ignora prefixo "v" e qualquer sufixo de
 * pré-lançamento ou metadado ("3.0.0-dev", "2.21.1+build.7"), que não decide precedência aqui.
 * Devolve 1 se `a` for mais nova, -1 se for mais antiga e 0 se forem iguais.
 */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const parse = (v: string) =>
    v.replace(/^v/i, '').split(/[+-]/)[0]!.split('.').map(n => Number.parseInt(n, 10) || 0);
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}
