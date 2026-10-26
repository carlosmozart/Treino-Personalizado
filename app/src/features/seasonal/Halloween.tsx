// Decorações do Halloween. Carregado sob demanda (import()) só quando o tema está ligado, para
// não pesar no resto do ano. Nada aqui fica por cima de botão no treino: lá é só uma abóbora parada.
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { DateKey } from '../../domain/dates';
import { CAT_LINES, pickLine, PUMPKIN_LINES, pumpkinAvailable } from '../../domain/seasonal';
import { useReducedMotion } from '../../hooks/use-reduced-motion';
import type { Tab } from '../../store/ui-store';
import { Bat, BroomCat, Candy, Cobweb, Moon, Pumpkin, Spider, WitchCat } from './halloween-art';
import './halloween.css';

export type HalloweenMode = 'full' | 'workout' | 'summary';

const PUMPKIN_KEY = 'tp-halloween-abobora';
/** Depois de tanto tempo fora, a aranha desce de novo ao voltar para o app. */
const AWAY_MS = 30 * 60_000;
const SPIDER_HOLD_MS = 8000;

const random = (min: number, max: number) => min + Math.random() * (max - min);

export default function Halloween({ mode, tab, today }: { mode: HalloweenMode; tab: Tab; today: DateKey }) {
  const reduced = useReducedMotion();
  return (
    <>
      {mode === 'full' && (
        <div data-testid="halloween" className="pointer-events-none fixed right-0 top-[env(safe-area-inset-top)] z-30">
          <Cobweb size={72} />
        </div>
      )}
      {/* no treino, uma abóbora parada sentada na barra de abas, longe dos botões da sessão */}
      {mode === 'workout' && (
        <div className="pointer-events-none fixed inset-x-0 z-20 mx-auto max-w-xl" style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom) - 4px)' }}>
          <span data-testid="halloween" className="absolute bottom-0 left-3"><Pumpkin size={30} /></span>
        </div>
      )}
      {mode === 'full' && <SpiderDrop active={tab === 'inicio'} />}
      {mode === 'full' && !reduced && <Bats />}
      {mode === 'full' && tab === 'inicio' && <HiddenPumpkin today={today} />}
      {mode === 'full' && <TabBarCat />}
      {(mode === 'summary' || (mode === 'full' && tab === 'progresso')) && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 overflow-hidden" style={{ height: 'calc(env(safe-area-inset-top) + 110px)' }}>
          <div className="relative mx-auto h-full max-w-xl">
            {mode === 'summary' ? <SummaryParty /> : <MoonScene reduced={reduced} />}
          </div>
        </div>
      )}
    </>
  );
}

/** Balão de fala que some sozinho; lido pelo leitor de tela. */
function Bubble({ text, className = '' }: { text: string; className?: string }) {
  return (
    <p role="status" className={`hw-bubble absolute whitespace-nowrap rounded-xl bg-surface-2 px-3 py-2 text-sm font-semibold text-ink shadow-lg ${className}`}>{text}</p>
  );
}

/** Aranha que desce da teia ao abrir o app (e ao voltar depois de meia hora fora). */
function SpiderDrop({ active }: { active: boolean }) {
  const [phase, setPhase] = useState<'down' | 'up' | 'flee' | 'gone'>(active ? 'down' : 'gone');
  const [drop, setDrop] = useState(0);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    let hiddenAt = 0;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt >= AWAY_MS && activeRef.current) { setPhase('down'); setDrop(d => d + 1); }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    if (phase === 'down') {
      const t = setTimeout(() => setPhase('up'), SPIDER_HOLD_MS);
      return () => clearTimeout(t);
    }
    if (phase === 'up' || phase === 'flee') {
      const t = setTimeout(() => setPhase('gone'), phase === 'flee' ? 400 : 1500);
      return () => clearTimeout(t);
    }
  }, [phase, drop]);

  // mudou de aba: a aranha sobe
  useEffect(() => { if (!active) setPhase(p => (p === 'down' ? 'up' : p)); }, [active]);

  if (phase === 'gone') return null;
  return (
    <div key={drop} className={`hw-spider-drop pointer-events-none fixed right-6 z-30 flex flex-col items-center ${phase === 'down' ? 'hw-enter' : phase === 'up' ? 'hw-up' : 'hw-flee'}`}
      style={{ top: 'calc(env(safe-area-inset-top) + 10px)' }}>
      <span aria-hidden="true" className="h-14 w-px" style={{ background: 'var(--hw-leg)' }} />
      <button type="button" aria-label="Aranha" onClick={() => setPhase('flee')} className="pointer-events-auto -mt-2 p-1">
        <Spider size={34} />
      </button>
    </div>
  );
}

interface Flight { id: number; top: number; rtl: boolean; dur: number; bats: number }

/** De tempos em tempos, dois ou três morcegos cruzam a parte de cima da tela. */
function Bats() {
  const [flight, setFlight] = useState<Flight | null>(null);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const next = (delay: number) => {
      t = setTimeout(() => {
        const dur = random(4.5, 6.5);
        setFlight({ id: Date.now(), top: random(70, 200), rtl: Math.random() < 0.5, dur, bats: Math.random() < 0.5 ? 2 : 3 });
        t = setTimeout(() => { setFlight(null); next(random(30_000, 60_000)); }, dur * 1000 + 300);
      }, delay);
    };
    next(5000);
    return () => clearTimeout(t);
  }, []);
  if (!flight) return null;
  return (
    <div key={flight.id} aria-hidden="true" className={`hw-flight pointer-events-none fixed left-0 z-30 ${flight.rtl ? 'hw-rtl' : ''}`}
      style={{ top: flight.top, '--hw-dur': `${flight.dur}s` } as CSSProperties}>
      {Array.from({ length: flight.bats }, (_, i) => (
        <span key={i} className="hw-bob absolute" style={{ left: -i * 46, top: (i % 2) * 26 - 6, animationDelay: `${i * 0.3}s` }}>
          <Bat size={i === 0 ? 40 : 30} />
        </span>
      ))}
    </div>
  );
}

const readFound = () => { try { return localStorage.getItem(PUMPKIN_KEY); } catch { return null; } };
const saveFound = (today: DateKey) => { try { localStorage.setItem(PUMPKIN_KEY, today); } catch { /* sem armazenamento: acha de novo */ } };

/** Lado e altura da abóbora mudam a cada dia (sempre os mesmos naquele dia). */
function pumpkinSpot(today: DateKey) {
  const h = [...today].reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 9973, 7);
  return { left: h % 2 === 0, top: 38 + (h % 28) };
}

const CANDY_COLORS = ['#f97316', '#a855f7', '#22c55e', '#f43f5e', '#facc15', '#38bdf8'];

/** Abóbora tímida no Início: espia pela beira da tela; achada, acende e solta doces (uma vez por dia). */
function HiddenPumpkin({ today }: { today: DateKey }) {
  const [available, setAvailable] = useState(() => pumpkinAvailable(readFound(), today));
  const [peek, setPeek] = useState(false);
  const [found, setFound] = useState<string | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => { setAvailable(pumpkinAvailable(readFound(), today)); }, [today]);
  useEffect(() => {
    if (!available || found || reduced) return;
    let t: ReturnType<typeof setTimeout>;
    const cycle = (out: boolean) => { setPeek(out); t = setTimeout(() => cycle(!out), out ? 3200 : random(6000, 10_000)); };
    t = setTimeout(() => cycle(true), 2500);
    return () => clearTimeout(t);
  }, [available, found, reduced]);
  useEffect(() => {
    if (!found) return;
    const t = setTimeout(() => { setFound(null); setAvailable(false); }, 4500);
    return () => clearTimeout(t);
  }, [found]);

  if (!available) return null;
  const { left, top } = pumpkinSpot(today);
  // escondida, aparece só uma beirinha; espiando, meia abóbora; achada, inteira
  const hidden = found ? 0 : peek || reduced ? 20 : 34;
  const shift = left ? -hidden : hidden;
  const onFind = () => {
    if (found) return;
    saveFound(today);
    setFound(pickLine(PUMPKIN_LINES, Math.random() * 1000));
  };

  return (
    <div className={`pointer-events-none fixed z-30 ${left ? 'left-0' : 'right-0'}`} style={{ top: `${top}%` }}>
      <button type="button" aria-label="Abóbora escondida" onClick={onFind}
        className={`hw-peek pointer-events-auto block p-1 ${found ? 'hw-found' : ''}`} style={{ transform: `translateX(${shift}px)` }}>
        <Pumpkin size={44} lit={!!found} />
      </button>
      {found && (
        <>
          {CANDY_COLORS.map((color, i) => (
            <span key={color} aria-hidden="true" className="hw-candy pointer-events-none absolute left-4 top-3"
              style={{ '--hw-x': `${(left ? 1 : -1) * (30 + i * 16)}px`, '--hw-y': `${-50 - (i % 3) * 30}px`, '--hw-r': `${i * 70}deg` } as CSSProperties}>
              <Candy color={color} />
            </span>
          ))}
          <Bubble text={`🎃 ${found}`} className={`top-12 ${left ? 'left-2' : 'right-2'}`} />
        </>
      )}
    </div>
  );
}

/** Gatinho de chapéu de bruxa sentado em cima da barra de abas; tocado, mia. */
function TabBarCat() {
  const [line, setLine] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!line) return;
    const t = setTimeout(() => setLine(null), 2500);
    return () => clearTimeout(t);
  }, [line, count]);
  return (
    <div className="pointer-events-none fixed inset-x-0 z-30 mx-auto max-w-xl" style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom) - 6px)' }}>
      <button type="button" aria-label="Gatinho de bruxa" onClick={() => { setLine(pickLine(CAT_LINES, count + Math.random() * 10)); setCount(c => c + 1); }}
        className={`pointer-events-auto absolute bottom-0 right-3 ${line ? 'hw-meow' : ''}`} key={count}>
        <WitchCat size={38} />
      </button>
      {line && <Bubble text={line} className="bottom-14 right-3" />}
    </div>
  );
}

/** Progresso: lua no canto e, de vez em quando, um gatinho de chapéu passando de vassoura. */
function MoonScene({ reduced }: { reduced: boolean }) {
  const [flight, setFlight] = useState(0);
  useEffect(() => {
    if (reduced) return;
    let t: ReturnType<typeof setTimeout>;
    const next = (delay: number) => {
      t = setTimeout(() => {
        setFlight(Date.now());
        t = setTimeout(() => { setFlight(0); next(random(20_000, 45_000)); }, 7200);
      }, delay);
    };
    next(3000);
    return () => clearTimeout(t);
  }, [reduced]);
  return (
    <>
      <span className="absolute right-20" style={{ top: 'calc(env(safe-area-inset-top) + 14px)' }}><Moon size={52} /></span>
      {flight > 0 && (
        <span key={flight} className="hw-broom absolute right-0" style={{ top: 'calc(env(safe-area-inset-top) + 6px)' }}>
          <BroomCat size={70} />
        </span>
      )}
    </>
  );
}

/** Fim do treino: gatinho entre duas abóboras acesas, ao lado do "Treino salvo". */
function SummaryParty() {
  return (
    <div className="absolute right-4 flex items-end" style={{ top: 'calc(env(safe-area-inset-top) + 8px)' }}>
      <Pumpkin size={28} lit />
      <WitchCat size={34} />
      <Pumpkin size={24} lit />
    </div>
  );
}
