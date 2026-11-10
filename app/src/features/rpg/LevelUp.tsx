// Animação de level up do modo RPG (R1): coluna de luz dourada, partículas e o texto, feita em
// código. Roxa na troca de classe. Com "reduzir movimento", aparece parada e some sozinha.
import { useEffect, useRef } from 'react';
import { className, markRpgCelebrated, pendingCelebration } from '../../domain/rpg';
import { useAppStore } from '../../store';
import { useReducedMotion } from '../../hooks/use-reduced-motion';
import { RpgEmblem } from './RpgEmblem';
import { useRpgView } from './RpgCard';
import './rpg.css';

const DURATION_MS = 2600;

export function RpgLevelUp() {
  const run = useAppStore(s => s.run);
  const view = useRpgView();
  const reduced = useReducedMotion();
  const pending = view ? pendingCelebration(view) : null;
  const timer = useRef<number | undefined>(undefined);

  const ref = useRef<HTMLDialogElement>(null);
  const done = () => run((d, n) => markRpgCelebrated(d, n));
  useEffect(() => {
    if (!pending) return undefined;
    timer.current = window.setTimeout(done, DURATION_MS);
    return () => window.clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending?.kind, pending?.level]);
  // diálogo modal: fica na camada de cima, acima de qualquer painel aberto (a ficha também é um <dialog>)
  useEffect(() => {
    const dialog = ref.current;
    if (!pending || !dialog || dialog.open) return;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }, [pending]);

  if (!view || !pending) return null;
  const isClass = pending.kind === 'class';
  const name = className(view.current.cls, view.theme, view.sex);
  return (
    <dialog ref={ref} aria-label={isClass ? 'Nova classe' : 'Level up'} onClick={done} onCancel={e => { e.preventDefault(); done(); }}
      className={`rpg-levelup m-0 flex h-dvh max-h-none w-full max-w-none items-center justify-center border-0 p-0 backdrop:bg-transparent ${isClass ? 'rpg-levelup--class' : ''} ${reduced ? 'rpg-levelup--still' : ''}`}>
      <div className="rpg-levelup__beam" aria-hidden="true" />
      <div className="rpg-levelup__sparks" aria-hidden="true">{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ ['--i' as string]: i }} />)}</div>
      <div className="rpg-levelup__card text-center">
        <RpgEmblem cls={view.current.cls} theme={view.theme} size={84} />
        <p className="rpg-levelup__title mt-3 text-4xl font-black tracking-tight">{isClass ? 'NOVA CLASSE!' : 'LEVEL UP!'}</p>
        <p className="mt-1 text-lg font-bold text-white">{isClass ? name : `${name} · nível ${pending.level}`}</p>
        <p className="mt-2 text-xs text-white/70">Toque para fechar</p>
      </div>
    </dialog>
  );
}
