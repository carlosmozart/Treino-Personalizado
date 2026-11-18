import { useState } from 'react';

/**
 * X14: verdadeiro desde a primeira vez que `open` ficou verdadeiro. Para montar um painel
 * carregado sob demanda só quando ele é aberto, e mantê-lo montado depois (o que a pessoa
 * digitou não se perde ao fechar e abrir de novo).
 */
export function useOpenedOnce(open: boolean): boolean {
  const [once, setOnce] = useState(open);
  if (open && !once) setOnce(true);
  return once || open;
}
