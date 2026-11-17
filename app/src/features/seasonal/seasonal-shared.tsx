// Peças comuns aos temas de época: o balão de fala e o gatinho sentado na barra de abas.
import { useEffect, useState, type ReactNode } from 'react';
import { pickLine } from '../../domain/seasonal';
import { WitchCat, type CatColor } from './halloween-art';
import { useRestStore } from '../workout/rest-store';
import { useHoldStore } from '../workout/HoldTimer';

/** Balão de fala que some sozinho; lido pelo leitor de tela. Frase longa quebra em duas linhas em vez de sair da tela. */
export function Bubble({ text, className = '' }: { text: string; className?: string }) {
  return (
    <p role="status" className={`hw-bubble absolute w-max max-w-[min(19rem,calc(100vw-1.5rem))] rounded-xl bg-surface-2 px-3 py-2 text-sm font-semibold text-ink shadow-lg ${className}`}>{text}</p>
  );
}

/** Gatinho sentado em cima da barra de abas (chapéu de bruxa ou gorro; branco, ou preto no Halloween); tocado, mia. */
export function TabBarCat({ label, lines, hat = 'bruxa', color = 'branco' }: { label: string; lines: readonly string[]; hat?: 'bruxa' | 'noel'; color?: CatColor }) {
  const [line, setLine] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!line) return;
    const t = setTimeout(() => setLine(null), 2500);
    return () => clearTimeout(t);
  }, [line, count]);
  return (
    <div className="pointer-events-none fixed inset-x-0 z-30 mx-auto max-w-xl" style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom) - 6px)' }}>
      <button type="button" aria-label={label} onClick={() => { setLine(pickLine(lines, count + Math.random() * 10)); setCount(c => c + 1); }}
        className={`pointer-events-auto absolute bottom-0 right-3 ${line ? 'hw-meow' : ''}`} key={count}>
        <WitchCat size={38} hat={hat} color={color} />
      </button>
      {line && <Bubble text={line} className="bottom-14 right-3" />}
    </div>
  );
}

/**
 * O enfeite parado do treino, espiando por trás da barra de abas (só a parte de cima aparece, para
 * não cobrir o cartão que passa por baixo). A barra do descanso (e a do cronômetro da prancha)
 * aparece no mesmo lugar: enquanto ela está na tela o enfeite sai, em vez de ficar meio coberto.
 */
export function WorkoutCharm({ testId, children }: { testId: string; children: ReactNode }) {
  const resting = useRestStore(s => s.endsAt !== null || s.pausedLeft !== null);
  const holding = useHoldStore(s => s.hold !== null);
  if (resting || holding) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 z-20 mx-auto max-w-xl" style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom) - 10px)' }}>
      <span data-testid={testId} className="absolute bottom-0 left-3">{children}</span>
    </div>
  );
}
