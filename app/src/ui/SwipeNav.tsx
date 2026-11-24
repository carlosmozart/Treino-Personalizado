import { useRef, useState, type ReactNode } from 'react';

/** Quanto arrastar para trocar (px), contando onde o dedo solta. */
const THRESHOLD = 72;
/** Movimento mínimo, e bem mais na horizontal que na vertical, para virar arraste (rolar continua). */
const START = 12;
/** Onde o gesto não vale: as séries já deslizam (apagar e copiar), e os campos e faixas roláveis são do dedo. */
const IGNORE = '[data-swipe-row], input, select, textarea, [contenteditable="true"], .overflow-x-auto';

interface Props {
  /** Deslizar para a direita: o anterior. Sem ele, o cartão resiste e volta. */
  onPrev?: (() => void) | undefined;
  /** Deslizar para a esquerda: o próximo. */
  onNext?: (() => void) | undefined;
  children: ReactNode;
}

/** N15: o cartão do modo foco desliza para o exercício anterior ou o próximo. */
export function SwipeNav({ onPrev, onNext, children }: Props) {
  const [dx, setDx] = useState(0);
  const [settling, setSettling] = useState(false);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const dragging = useRef(false);
  const justDragged = useRef(false);
  const reset = () => { setSettling(true); setDx(0); start.current = null; dragging.current = false; };

  return (
    // sem seleção de texto: com o mouse, arrastar de novo sobre o texto selecionado viraria arrastar e soltar do navegador
    <div data-testid="deslizar-exercicio" className="select-none" style={{ touchAction: 'pan-y' }}
      onPointerDown={e => {
        if (e.button !== 0 || (e.target as Element).closest?.(IGNORE)) return;
        start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
        setSettling(false);
      }}
      onPointerMove={e => {
        const s = start.current;
        if (!s || s.id !== e.pointerId) return;
        const mx = e.clientX - s.x, my = e.clientY - s.y;
        if (!dragging.current) {
          if (Math.abs(my) > START && Math.abs(my) > Math.abs(mx)) { start.current = null; return; }
          if (Math.abs(mx) < START || Math.abs(mx) < Math.abs(my) * 2) return;
          dragging.current = true;
          try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* sem captura */ }
        }
        // sem vizinho naquele lado, só cede um pouco
        const blocked = (mx > 0 && !onPrev) || (mx < 0 && !onNext);
        setDx(Math.max(-120, Math.min(120, blocked ? mx * 0.2 : mx * 0.6)));
      }}
      onPointerUp={e => {
        if (!dragging.current) { start.current = null; return; }
        const final = e.clientX - start.current!.x;
        justDragged.current = true;
        setTimeout(() => { justDragged.current = false; }, 0);
        reset();
        if (final >= THRESHOLD) onPrev?.();
        else if (final <= -THRESHOLD) onNext?.();
      }}
      onPointerCancel={reset}
      onClickCapture={e => { if (justDragged.current) { e.preventDefault(); e.stopPropagation(); } }}>
      <div style={{ transform: dx ? `translateX(${dx}px)` : undefined, transition: settling ? 'transform 160ms ease-out' : undefined }}
        onTransitionEnd={() => setSettling(false)}>
        {children}
      </div>
    </div>
  );
}
