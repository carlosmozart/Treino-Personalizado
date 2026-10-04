import { useEffect, useState } from 'react';
import { illustrationIdFor, loadIllustration, type IllustrationFrames } from '../data/illustrations';
import { Sheet } from './Sheet';

const FRAME_MS = 1100;

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

function useFrames(name: string): IllustrationFrames | null {
  const id = illustrationIdFor(name);
  const [frames, setFrames] = useState<{ id: string; frames: IllustrationFrames } | null>(null);
  useEffect(() => {
    if (!id) return;
    let alive = true;
    void loadIllustration(id).then(f => { if (alive && f) setFrames({ id, frames: f }); });
    return () => { alive = false; };
  }, [id]);
  return id && frames?.id === id ? frames.frames : null;
}

/** SVG do próprio app (gerado pelo script de importação), por isso pode ir direto no DOM. */
function Frame({ svg, className }: { svg: string; className: string }) {
  return <div aria-hidden="true" className={`${className} [&>svg]:h-full [&>svg]:w-full`} dangerouslySetInnerHTML={{ __html: svg }} />;
}

/**
 * Ilustração do exercício (Q2): alterna posição inicial e final; com "reduzir movimento" fica
 * parada na inicial. Tocar abre as duas posições grandes, com o crédito exigido pela licença.
 */
export function ExerciseIllustration({ name }: { name: string }) {
  const frames = useFrames(name);
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!frames || reduced) return;
    const timer = setInterval(() => setPhase(p => 1 - p), FRAME_MS);
    return () => clearInterval(timer);
  }, [frames, reduced]);

  if (!frames) return null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={`Ver ilustração de ${name}`}
        className="size-22 shrink-0 rounded-xl bg-surface-2 p-1.5 text-ink">
        <Frame svg={phase === 0 || reduced ? frames.start : frames.end} className="size-full" />
      </button>
      <Sheet title={name} open={open} onClose={() => setOpen(false)}>
        <div className="grid grid-cols-2 gap-2 text-ink">
          <figure className="rounded-2xl bg-surface-2 p-2">
            <Frame svg={frames.start} className="aspect-square w-full" />
            <figcaption className="mt-1 text-center text-sm text-muted">Início</figcaption>
          </figure>
          <figure className="rounded-2xl bg-surface-2 p-2">
            <Frame svg={frames.end} className="aspect-square w-full" />
            <figcaption className="mt-1 text-center text-sm text-muted">Fim</figcaption>
          </figure>
        </div>
        <p className="mt-3 text-xs text-faint">
          Ilustração: Everkinetic (everkinetic.com, Greg Priday), CC BY-SA 4.0, adaptada nas cores.
        </p>
      </Sheet>
    </>
  );
}

export function hasIllustration(name: string): boolean {
  return illustrationIdFor(name) !== null;
}
