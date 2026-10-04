// Ids de registros criados no aparelho. Únicos entre aparelhos, para a junção da nuvem nunca
// confundir dois registros diferentes criados ao mesmo tempo em celulares distintos.
export function newId(prefix: string, random: () => string = () => crypto.randomUUID()): string {
  return `${prefix}-${random().replace(/-/g, '').slice(0, 12)}`;
}
