// Decorações do Natal (V5). Carregado sob demanda (import()) só em dezembro, como o Halloween.
// No treino é só um presente parado na barra de abas, longe dos botões da sessão.
import { useEffect, useState, type CSSProperties } from 'react';
import type { DateKey } from '../../domain/dates';
import { giftAvailable, GIFT_LINES, pickLine, XMAS_CAT_LINES } from '../../domain/seasonal';
import { useReducedMotion } from '../../hooks/use-reduced-motion';
import type { Tab } from '../../store/ui-store';
import { WitchCat } from './halloween-art';
import { FairyLights, Gift, Holly, Sleigh, Snowman } from './natal-art';
import { Bubble, TabBarCat } from './seasonal-shared';
import './halloween.css';
import './natal.css';

export type NatalMode = 'full' | 'workout' | 'summary';

const GIFT_KEY = 'tp-natal-presente';
const random = (min: number, max: number) => min + Math.random() * (max - min);

export default function Natal({ mode, tab, today }: { mode: NatalMode; tab: Tab; today: DateKey }) {
  const reduced = useReducedMotion();
  const top = mode === 'summary' || (mode === 'full' && (tab === 'inicio' || tab === 'progresso'));
  return (
    <>
      {mode === 'full' && (
        <div data-testid="natal" className="pointer-events-none fixed right-0 top-[env(safe-area-inset-top)] z-30">
          <Holly size={64} />
        </div>
      )}
      {mode === 'workout' && (
        <div className="pointer-events-none fixed inset-x-0 z-20 mx-auto max-w-xl" style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom) - 4px)' }}>
          <span data-testid="natal" className="absolute bottom-0 left-3"><Gift size={26} /></span>
        </div>
      )}
      {mode === 'full' && !reduced && <Snowfall />}
      {mode === 'full' && tab === 'inicio' && <HiddenGift today={today} />}
      {mode === 'full' && <TabBarCat label="Gatinho de gorro" lines={XMAS_CAT_LINES} hat="noel" />}
      {top && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 overflow-hidden" style={{ height: 'calc(env(safe-area-inset-top) + 120px)' }}>
          <div className="relative mx-auto h-full max-w-xl" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            {mode === 'summary' ? <SummaryGifts /> : (
              <>
                <div className="pr-14"><FairyLights count={tab === 'inicio' ? 8 : 7} /></div>
                {tab === 'progresso' && <SnowScene reduced={reduced} />}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/** Neve leve ao abrir o app, atrás dos cartões; para sozinha depois de uns segundos. */
function Snowfall() {
  const [on, setOn] = useState(true);
  const [flakes] = useState(() => Array.from({ length: 26 }, (_, i) => ({
    left: random(0, 100), size: random(3, 7), dur: random(7, 13), delay: random(0, 6), drift: random(-30, 30), key: i
  })));
  useEffect(() => {
    const t = setTimeout(() => setOn(false), 20_000);
    return () => clearTimeout(t);
  }, []);
  if (!on) return null;
  return (
    <div aria-hidden="true" className="nt-snow pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {flakes.map(f => (
        <span key={f.key} className="nt-flake absolute -top-3 rounded-full"
          style={{ left: `${f.left}%`, width: f.size, height: f.size, animationDuration: `${f.dur}s`, animationDelay: `${f.delay}s`, '--nt-drift': `${f.drift}px` } as CSSProperties} />
      ))}
    </div>
  );
}

const readFound = () => { try { return localStorage.getItem(GIFT_KEY); } catch { return null; } };
const saveFound = (today: DateKey) => { try { localStorage.setItem(GIFT_KEY, today); } catch { /* sem armazenamento: acha de novo */ } };

/** Lado e altura do presente mudam a cada dia (sempre os mesmos naquele dia). */
function giftSpot(today: DateKey) {
  const h = [...today].reduce((n, c) => (n * 37 + c.charCodeAt(0)) % 9973, 11);
  return { left: h % 2 === 1, top: 40 + (h % 26) };
}

const CONFETTI = ['#ef4444', '#facc15', '#22c55e', '#38bdf8', '#f8fafc', '#f472b6'];

/** Presente escondido no Início: espia pela beira; achado, abre e solta confete (uma vez por dia). */
function HiddenGift({ today }: { today: DateKey }) {
  const [available, setAvailable] = useState(() => giftAvailable(readFound(), today));
  const [peek, setPeek] = useState(false);
  const [found, setFound] = useState<string | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => { setAvailable(giftAvailable(readFound(), today)); }, [today]);
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
  const { left, top } = giftSpot(today);
  const hidden = found ? 0 : peek || reduced ? 18 : 32;
  const shift = left ? -hidden : hidden;
  const onFind = () => {
    if (found) return;
    saveFound(today);
    setFound(pickLine(GIFT_LINES, Math.random() * 1000));
  };
  return (
    <div className={`pointer-events-none fixed z-30 ${left ? 'left-0' : 'right-0'}`} style={{ top: `${top}%` }}>
      <button type="button" aria-label="Presente escondido" onClick={onFind}
        className={`hw-peek pointer-events-auto block p-1 ${found ? 'hw-found' : ''}`} style={{ transform: `translateX(${shift}px)` }}>
        <Gift size={40} open={!!found} />
      </button>
      {found && (
        <>
          {CONFETTI.map((color, i) => (
            <span key={color} aria-hidden="true" className="hw-candy pointer-events-none absolute left-5 top-4 h-2.5 w-1.5 rounded-sm"
              style={{ background: color, '--hw-x': `${(left ? 1 : -1) * (24 + i * 14)}px`, '--hw-y': `${-46 - (i % 3) * 28}px`, '--hw-r': `${i * 95}deg` } as CSSProperties} />
          ))}
          <Bubble text={`🎁 ${found}`} className={`top-12 ${left ? 'left-2' : 'right-2'}`} />
        </>
      )}
    </div>
  );
}

/** Progresso: boneco de neve espiando e, de vez em quando, o trenó passando. */
function SnowScene({ reduced }: { reduced: boolean }) {
  const [flight, setFlight] = useState(0);
  useEffect(() => {
    if (reduced) return;
    let t: ReturnType<typeof setTimeout>;
    const next = (delay: number) => {
      t = setTimeout(() => {
        setFlight(Date.now());
        t = setTimeout(() => { setFlight(0); next(random(25_000, 50_000)); }, 7200);
      }, delay);
    };
    next(3000);
    return () => clearTimeout(t);
  }, [reduced]);
  return (
    <>
      <span className="nt-peek absolute right-20 top-[calc(env(safe-area-inset-top)+18px)]"><Snowman size={40} /></span>
      {flight > 0 && (
        <span key={flight} className="hw-broom absolute right-0 top-[calc(env(safe-area-inset-top)+14px)]"><Sleigh size={96} /></span>
      )}
    </>
  );
}

/** Fim do treino: o gatinho de gorro entre dois presentes, ao lado do "Treino salvo". */
function SummaryGifts() {
  return (
    <div className="absolute right-4 flex items-end" style={{ top: 'calc(env(safe-area-inset-top) + 8px)' }}>
      <Gift size={26} />
      <WitchCat size={34} hat="noel" />
      <Gift size={22} color="#16a34a" ribbon="#fef08a" />
    </div>
  );
}
