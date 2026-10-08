import { useRef, useState, type ReactNode } from 'react';

/** Quanto arrastar para valer (px). Conta onde o dedo solta, não a velocidade. */
const THRESHOLD = 88;
const MAX = 140;
/** Movimento mínimo, e mais na horizontal que na vertical, para virar arraste (rolar continua). */
const START = 10;

interface Props {
  enabled: boolean;
  /** Apagar: arrastar para a esquerda. Sem `onDelete`, a linha resiste e volta. */
  onDelete?: () => void;
  /** Copiar: arrastar para a direita. */
  onCopy: () => void;
  className?: string;
  children: ReactNode;
}

/** Linha que desliza (R2): esquerda apaga, direita copia. Toques nos campos seguem normais. */
export function SwipeRow({ enabled, onDelete, onCopy, className = '', children }: Props) {
  const [dx, setDx] = useState(0);
  const [settling, setSettling] = useState(false);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const dragging = useRef(false);
  const justDragged = useRef(false);

  if (!enabled) return <li className={className}>{children}</li>;

  const reset = () => { setSettling(true); setDx(0); start.current = null; dragging.current = false; };

  return (
    <li className="relative overflow-hidden rounded-xl" style={{ touchAction: 'pan-y' }}
      onPointerDown={e => { if (e.button === 0) start.current = { x: e.clientX, y: e.clientY, id: e.pointerId }; setSettling(false); }}
      onPointerMove={e => {
        const s = start.current;
        if (!s || s.id !== e.pointerId) return;
        const mx = e.clientX - s.x, my = e.clientY - s.y;
        if (!dragging.current) {
          if (Math.abs(mx) < START || Math.abs(mx) < Math.abs(my) * 1.5) return;
          dragging.current = true;
          // segue o dedo mesmo fora da linha; se o navegador recusar, o arraste funciona igual
          try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* sem captura */ }
        }
        // sem apagar (última série), a esquerda só cede um pouco
        const x = mx < 0 && !onDelete ? mx * 0.25 : mx;
        setDx(Math.max(-MAX, Math.min(MAX, x)));
      }}
      onPointerUp={e => {
        if (!dragging.current) { start.current = null; return; }
        const s = start.current!;
        const final = e.clientX - s.x;
        justDragged.current = true;
        setTimeout(() => { justDragged.current = false; }, 0);
        if (final <= -THRESHOLD && onDelete) onDelete();
        else if (final >= THRESHOLD) onCopy();
        reset();
      }}
      onPointerCancel={reset}
      onClickCapture={e => { if (justDragged.current) { e.preventDefault(); e.stopPropagation(); } }}>
      <div aria-hidden="true" className={`absolute inset-0 flex items-center px-4 text-sm font-bold text-white ${dx >= 0 ? 'justify-start bg-primary' : 'justify-end bg-danger'}`}
        style={{ opacity: Math.min(1, Math.abs(dx) / THRESHOLD) }}>
        {dx >= 0 ? 'Copiar' : onDelete ? 'Apagar' : 'Fica pelo menos uma'}
      </div>
      {/* fundo do cartão por baixo: a cor de "feita" (translúcida) não deixa o aviso aparecer */}
      <div className="relative rounded-xl bg-surface"
        style={{ transform: `translateX(${dx}px)`, transition: settling ? 'transform 160ms ease-out' : 'none' }}>
        <div className={className}>{children}</div>
      </div>
    </li>
  );
}
