// V6: a retrospectiva do ano em telas de stories. Toque à direita avança, à esquerda volta; cada
// tela vira imagem para compartilhar. Tudo calculado no aparelho, nada sai sem a pessoa escolher.
import { useEffect, useMemo, useRef, useState } from 'react';
import { reviewSlides, reviewYearFor, yearReview, yearsWithWorkouts } from '../../domain/year-review';
import { useToday } from '../../hooks/use-today';
import { shareImage } from '../../platform/share-image';
import { useAppStore } from '../../store';
import { backNav } from '../../store/ui-store';
import { Icon } from '../../ui/Icon';
import { APP_NAME } from '../progress/ShareImageButton';
import { slideBlob, TONES } from './review-image';

const NO_WEIGHT_KEY = 'tp-retro-sem-peso';
const dismissKey = (year: number) => `tp-retro-${year}-fechado`;
const readFlag = (k: string) => { try { return localStorage.getItem(k) === '1'; } catch { return false; } };
const setFlag = (k: string) => { try { localStorage.setItem(k, '1'); } catch { /* sem armazenamento: aparece de novo */ } };

export function YearReviewViewer({ year, onClose }: { year: number; onClose: () => void }) {
  const data = useAppStore(s => s.data);
  const [showWeight, setShowWeight] = useState(() => !readFlag(NO_WEIGHT_KEY));
  const slides = useMemo(() => (data ? reviewSlides(yearReview(data, year), { showWeight }) : []), [data, year, showWeight]);
  const [i, setI] = useState(0);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  // o voltar do Android fecha a retrospectiva (referência fixa: onClose muda a cada desenho)
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => backNav.pushLayer(() => closeRef.current()), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
      if (e.key === 'ArrowRight') setI(n => Math.min(slides.length - 1, n + 1));
      if (e.key === 'ArrowLeft') setI(n => Math.max(0, n - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [slides.length]);
  useEffect(() => { setStatus(''); }, [i]);
  const slide = slides[Math.min(i, slides.length - 1)];
  if (!slide) return null;
  const [top, bottom] = TONES[slide.tone % TONES.length]!;
  const last = i >= slides.length - 1;

  const share = async () => {
    setBusy(true);
    setStatus('');
    try {
      const result = await shareImage(await slideBlob(slide, APP_NAME), `retrospectiva-${year}-${slide.id}.png`, `Retrospectiva ${year}`);
      if (result === 'saved') setStatus('Imagem salva nos downloads.');
    } catch {
      setStatus('Não foi possível gerar a imagem.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={`Retrospectiva ${year}`} className="safe-top safe-bottom fixed inset-0 z-[60] flex flex-col text-white"
      style={{ background: `linear-gradient(180deg, ${top}, ${bottom})` }}>
      {/* barrinhas de progresso, uma por tela */}
      <div className="flex gap-1 px-3 pt-3" aria-hidden="true">
        {slides.map((s, n) => <span key={s.id} className={`h-1 flex-1 rounded-full ${n <= i ? 'bg-white' : 'bg-white/30'}`} />)}
      </div>
      <div className="flex items-center justify-between px-3 pt-2">
        <span className="text-sm font-semibold opacity-80">{i + 1} de {slides.length}</span>
        <button type="button" onClick={onClose} aria-label="Fechar a retrospectiva" className="flex size-11 items-center justify-center rounded-full bg-white/15">
          <Icon name="fechar" />
        </button>
      </div>

      <div className="relative flex flex-1 flex-col justify-center px-7">
        {/* áreas de toque: esquerda volta, direita avança */}
        <button type="button" aria-label="Tela anterior" disabled={i === 0} onClick={() => setI(x => Math.max(0, x - 1))} className="absolute inset-y-0 left-0 w-1/3" />
        <button type="button" aria-label="Próxima tela" disabled={last} onClick={() => setI(x => Math.min(slides.length - 1, x + 1))} className="absolute inset-y-0 right-0 w-2/3" />
        <section aria-live="polite" className="pointer-events-none relative">
          <p className="text-sm font-bold uppercase tracking-widest opacity-80">{slide.eyebrow}</p>
          <h2 className={`mt-2 font-black leading-none ${slide.big.length > 14 ? 'text-5xl' : 'text-7xl'}`}>{slide.big}</h2>
          <p className="mt-4 text-xl font-medium leading-snug">{slide.text}</p>
          {slide.stats && (
            <dl className="mt-6 space-y-3">
              {slide.stats.map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-4 border-b border-white/20 pb-2">
                  <dt className="opacity-80">{label}</dt><dd className="truncate text-right text-xl font-black">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      </div>

      <div className="space-y-2 px-5 pb-5">
        {slide.id === 'peso' && (
          <button type="button" onClick={() => { setFlag(NO_WEIGHT_KEY); setShowWeight(false); }}
            className="h-11 w-full rounded-xl bg-white/15 text-sm font-semibold">Não mostrar meu peso</button>
        )}
        <button type="button" onClick={() => void share()} disabled={busy} className="h-12 w-full rounded-xl bg-white text-base font-bold text-slate-900 disabled:opacity-60">
          {busy ? 'Gerando imagem…' : 'Compartilhar esta tela'}
        </button>
        {status && <p role="status" className="text-center text-sm">{status}</p>}
      </div>
    </div>
  );
}

/** Cartão no Início de 1º de dezembro ao fim de janeiro: "Seu ano está pronto". O × some com ele no ano. */
export function YearReviewCard() {
  const today = useToday(s => s.today);
  const workouts = useAppStore(s => s.data?.workouts);
  const year = reviewYearFor(today);
  const [hidden, setHidden] = useState(() => (year ? readFlag(dismissKey(year)) : true));
  const [open, setOpen] = useState(false);
  if (!year || hidden || !workouts?.some(w => w.date.startsWith(`${year}-`))) return null;
  return (
    <section aria-label={`Retrospectiva ${year}`} className="relative overflow-hidden rounded-2xl p-4 text-white"
      style={{ background: `linear-gradient(135deg, ${TONES[0]![0]}, ${TONES[4]![1]})` }}>
      <button type="button" onClick={() => { setFlag(dismissKey(year)); setHidden(true); }} aria-label="Esconder a retrospectiva"
        className="absolute right-2 top-2 z-10 flex size-11 items-center justify-center rounded-full text-white/80"><Icon name="fechar" className="size-5" /></button>
      <p className="text-xs font-bold uppercase tracking-widest opacity-80">Retrospectiva</p>
      <h2 className="text-xl font-black">Seu {year} está pronto</h2>
      <p className="mt-1 pr-8 text-sm opacity-90">Treinos, toneladas, recordes e o seu jeito de treinar, em telas para ver e compartilhar.</p>
      <button type="button" onClick={() => setOpen(true)} className="mt-3 h-11 rounded-xl bg-white px-4 font-bold text-slate-900">Ver a retrospectiva</button>
      {open && <YearReviewViewer year={year} onClose={() => setOpen(false)} />}
    </section>
  );
}

/** No Progresso: a retrospectiva de qualquer ano com treino, o atual incluído. */
export function YearReviewLinks() {
  const workouts = useAppStore(s => s.data?.workouts);
  const [year, setYear] = useState<number | null>(null);
  const years = useMemo(() => yearsWithWorkouts(workouts ?? []).slice(0, 4), [workouts]);
  if (!years.length) return null;
  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <h2 className="font-bold">Retrospectiva</h2>
      <p className="text-sm text-muted">O seu ano em telas para ver e compartilhar.</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {years.map(y => (
          <button key={y} type="button" onClick={() => setYear(y)} className="h-11 rounded-xl bg-surface-2 px-4 font-semibold">Ver {y}</button>
        ))}
      </div>
      {year !== null && <YearReviewViewer year={year} onClose={() => setYear(null)} />}
    </section>
  );
}
