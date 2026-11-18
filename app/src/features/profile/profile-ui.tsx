// Peças de tela do Perfil usadas também fora dele (os ajustes do treino abrem durante o treino).
// Ficam fora de ProfileScreen.tsx para o Perfil poder baixar sob demanda (X14).
import type { ReactNode } from 'react';

export const INPUT = 'mt-1 h-12 w-full rounded-xl border border-line bg-surface-2 px-3 text-base text-ink';

export function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-4 space-y-3 rounded-2xl border border-line bg-surface p-4">
      <h2 className="text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}
