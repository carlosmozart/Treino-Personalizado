// Tour guiado: um giro pelas abas, destacando cada uma na barra de baixo, e o "?" da Ajuda no fim.
// Não abre sozinho: o Início convida uma vez, e a Ajuda refaz quando a pessoa quiser.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { updateMeta } from '../../domain/actions';
import { useAppStore } from '../../store';
import { backNav, useUiStore } from '../../store/ui-store';
import { helpAnchor } from './help-nav';

export interface TourStep {
  title: string;
  text: string;
  /** data-help do elemento destacado; sem ele, o cartão fica no meio da tela. */
  anchor?: string;
}

export const TOUR_STEPS: readonly TourStep[] = [
  {
    title: 'Um giro rápido pelo app',
    text: 'Em um minuto você vê onde fica cada coisa. Dá para sair quando quiser e refazer depois, pela Ajuda.'
  },
  {
    title: 'Início',
    text: 'O seu dia: o treino de hoje, a semana, o peso e a água. Toque num dia da semana que passou sem treino para anotar o motivo.',
    anchor: 'aba-inicio'
  },
  {
    title: 'Plano',
    text: 'Onde se monta e se edita o plano: modelos prontos, "Montar meu plano", IA, a Biblioteca de exercícios e se o plano segue os dias da semana ou a rotação A/B/C.',
    anchor: 'aba-plano'
  },
  {
    title: 'Treino',
    text: 'Começa o treino do dia. Durante o treino, toque no número da série para técnica, esforço e nota; nos ⋯ do exercício ficam anilhas, troca e histórico.',
    anchor: 'aba-treino'
  },
  {
    title: 'Progresso',
    text: 'Estatísticas e gráficos, Metas (peso e medidas), o Histórico dos treinos e, se você ligar, o Protocolo.',
    anchor: 'aba-progresso'
  },
  {
    title: 'Perfil',
    text: 'Seus dados e a saúde, as seções opcionais (modo RPG e Protocolo), todos os ajustes e o backup.',
    anchor: 'aba-perfil'
  },
  {
    title: 'Ficou com dúvida?',
    text: 'O ? ao lado do título de cada tela abre a Ajuda: ela diz onde fica e o que faz cada função, e leva você até lá.',
    anchor: 'ajuda'
  }
];

/** Começa o tour do primeiro passo, no Início. */
export function startTour() {
  useUiStore.getState().setTab('inicio');
  window.scrollTo({ top: 0 });
  useUiStore.setState({ tourStep: 0 });
}

const finishTour = () => {
  useUiStore.setState({ tourStep: null });
  useAppStore.getState().run(d => updateMeta(d, { hintsSeen: { tour: true } }));
};

/** A camada do tour, por cima de tudo. */
export function Tour() {
  const step = useUiStore(s => s.tourStep);
  const active = step !== null;
  // voltar do Android sai do tour
  useEffect(() => (active ? backNav.pushLayer(finishTour) : undefined), [active]);
  if (step === null) return null;
  return <TourLayer index={Math.min(step, TOUR_STEPS.length - 1)} />;
}

const PAD = 6;

function TourLayer({ index }: { index: number }) {
  const step = TOUR_STEPS[index]!;
  const last = index === TOUR_STEPS.length - 1;
  const [rect, setRect] = useState<DOMRect | null>(null);
  const card = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!step.anchor) { setRect(null); return; }
    const el = helpAnchor(step.anchor);
    if (el && step.anchor === 'ajuda') el.scrollIntoView({ block: 'center' });
    const measure = () => setRect(helpAnchor(step.anchor!)?.getBoundingClientRect() ?? null);
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => { window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true); };
  }, [step.anchor]);

  useEffect(() => { card.current?.focus(); }, [index]);

  const go = (to: number) => useUiStore.setState({ tourStep: to });
  const below = rect ? rect.top + rect.height / 2 < window.innerHeight / 2 : false;
  const place = rect ? 'inset-x-4' : 'inset-x-4 top-1/2 -translate-y-1/2';
  const style = !rect ? undefined
    : below ? { top: rect.bottom + PAD + 12 } : { bottom: window.innerHeight - rect.top + PAD + 12 };

  return (
    <div className="fixed inset-0 z-[70]" onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); finishTour(); } }}>
      {/* segura os toques fora do cartão (o tour não deixa mexer no app por baixo) */}
      <div className={`absolute inset-0 ${rect ? '' : 'bg-black/65'}`} aria-hidden="true" />
      {rect && (
        <div aria-hidden="true" data-testid="destaque-do-tour" className="pointer-events-none absolute rounded-2xl ring-2 ring-[var(--color-primary)]"
          style={{ left: rect.left - PAD, top: rect.top - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2, boxShadow: '0 0 0 9999px rgb(0 0 0 / 0.65)' }} />
      )}
      <div ref={card} role="dialog" aria-modal="true" aria-label={`Tour do app: ${step.title}`} tabIndex={-1} style={style}
        className={`absolute mx-auto max-w-md rounded-2xl border border-line bg-surface p-4 text-ink shadow-2xl outline-none ${place}`}>
        <p className="text-xs font-semibold text-muted">{index + 1} de {TOUR_STEPS.length}</p>
        <h2 className="mt-1 text-lg font-bold">{step.title}</h2>
        <p className="mt-1 text-muted">{step.text}</p>
        <div className="mt-4 flex items-center gap-2">
          <button type="button" onClick={finishTour} className="h-11 px-2 text-sm font-semibold text-muted">{last ? 'Fechar' : 'Sair do tour'}</button>
          <span className="flex-1" />
          {index > 0 && <button type="button" onClick={() => go(index - 1)} className="h-11 rounded-xl bg-surface-2 px-4 font-semibold">Voltar</button>}
          <button type="button" onClick={() => (last ? finishTour() : go(index + 1))} className="h-11 rounded-xl bg-primary px-4 font-bold text-white">
            {last ? 'Concluir' : 'Próximo'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Convite no Início, até a pessoa fazer o tour ou dispensar. */
export function TourInvite() {
  const seen = useAppStore(s => !s.data || !!s.data.meta.hintsSeen.tour);
  const touring = useUiStore(s => s.tourStep !== null);
  const run = useAppStore(s => s.run);
  if (seen || touring) return null;
  return (
    <section aria-label="Tour do app" className="rounded-2xl border border-line bg-surface p-4">
      <h2 className="font-bold">Conheça o app em 1 minuto</h2>
      <p className="mt-1 text-sm text-muted">Um tour mostra onde fica cada coisa. Depois, o ? ao lado do título de cada tela explica qualquer função.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => run(d => updateMeta(d, { hintsSeen: { tour: true } }))} aria-label="Dispensar o tour"
          className="h-11 rounded-xl bg-surface-2 text-sm font-bold">Dispensar</button>
        <button type="button" onClick={startTour} className="h-11 rounded-xl bg-primary text-sm font-bold text-white">Fazer o tour</button>
      </div>
    </section>
  );
}
