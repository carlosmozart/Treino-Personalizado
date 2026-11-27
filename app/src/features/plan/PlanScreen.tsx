import { collapseKey, useCollapsedDays } from './plan-collapse';
import { Suspense, useState } from 'react';
import { DAY_KEYS } from '../../domain/ai-plan';
import { addPlan, setActivePlan } from '../../domain/actions';
import { toDateKey } from '../../domain/dates';
import { newId } from '../../domain/ids';
import { dayKeyOf, trainingDaysPerWeek, type Plan } from '../../domain/model';
import { deletePlan, duplicatePlan, editPlan } from '../../domain/plan-edit';
import { ScratchPlanSheet } from './ScratchPlanSheet';
import { FromWorkoutSheet } from '../progress/SaveToPlanSheet';
import { useAppStore } from '../../store';
import { Icon } from '../../ui/Icon';
import { LibrarySheet } from './LibrarySheet';
import { LazyAiPlanSheet, LazyAiReviewSheet } from './lazy-sheets';
import { useOpenedOnce } from '../../hooks/use-opened-once';
import { TemplateSheet } from './TemplateSheet';
import { PlanFileActions } from './PlanFileActions';
import { HelpButton, ScreenTitle } from '../help/HelpButton';
import { Sheet, SheetAction } from '../../ui/Sheet';
import { disableRotation, enableRotation } from '../../domain/rotation';
import { plural } from '../../ui/format';
import { rotationCards, RotationPanel } from './PlanRotation';
import { DayCard } from './PlanDayCard';

/** Plano em cartões por dia, com descanso explícito e edição no próprio cartão (N10, O25). */
export function PlanScreen() {
  const data = useAppStore(s => s.data);
  const run = useAppStore(s => s.run);
  const [plansOpen, setPlansOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState<false | 'new' | 'convert'>(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  // X14: os painéis de IA baixam na primeira vez que abrem
  const aiLoaded = useOpenedOnce(!!aiOpen);
  const reviewLoaded = useOpenedOnce(reviewOpen);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [scratchOpen, setScratchOpen] = useState(false);
  const [fromWorkoutOpen, setFromWorkoutOpen] = useState(false);
  const plan = data?.activePlanId ? data.plans[data.activePlanId] : undefined;
  // X6: dias recolhidos, neste aparelho
  const collapsed = useCollapsedDays();

  if (!data) return null;
  if (!plan) {
    return (
      <>
        <ScreenTitle>Plano</ScreenTitle>
        <section className="mt-6 rounded-2xl border border-line bg-surface p-4">
          <h2 className="text-lg font-bold">Você ainda não tem um plano</h2>
          <p className="mt-1 text-muted">Comece por um modelo pronto (corpo inteiro, ABC, superior/inferior, em casa…) e ajuste os dias aqui.</p>
          <button type="button" onClick={() => setTemplatesOpen(true)} className="mt-4 h-12 w-full rounded-xl bg-primary text-base font-bold text-white">
            Escolher um modelo
          </button>
          <button type="button" onClick={() => setAiOpen('new')} className="mt-2 h-12 w-full rounded-xl bg-surface-2 text-base font-bold">
            Montar treino com IA
          </button>
          <button type="button" onClick={() => setScratchOpen(true)} className="mt-2 h-12 w-full rounded-xl bg-surface-2 text-base font-bold">
            Criar do zero
          </button>
          {/* W1: quem já tem histórico (app antigo, treino livre) aproveita um treino feito */}
          {data.workouts.length > 0 && (
            <button type="button" onClick={() => setFromWorkoutOpen(true)} className="mt-2 h-12 w-full rounded-xl bg-surface-2 text-base font-bold">
              Usar um treino que já fiz
            </button>
          )}
          <button type="button" onClick={() => setAiOpen('convert')} className="mt-2 h-12 w-full rounded-xl text-base font-semibold text-primary">
            Já tenho um treino feito em IA
          </button>
        </section>
        {/* mesma chave nos dois retornos: o painel continua aberto quando o plano criado vira o ativo */}
        {aiLoaded && <Suspense key="ai" fallback={null}><LazyAiPlanSheet open={!!aiOpen} initialKind={aiOpen || 'new'} onClose={() => setAiOpen(false)} /></Suspense>}
        <TemplateSheet key="modelos" open={templatesOpen} onClose={() => setTemplatesOpen(false)} />
        <ScratchPlanSheet key="do-zero" open={scratchOpen} onClose={() => setScratchOpen(false)} />
        <FromWorkoutSheet key="de-um-treino" open={fromWorkoutOpen} onClose={() => setFromWorkoutOpen(false)} />
      </>
    );
  }

  const edit = (fn: (p: Plan) => Plan) => run((d, now) => editPlan(d, plan.id, fn, now));
  const days = trainingDaysPerWeek(plan);
  const today = dayKeyOf(new Date());
  const others = Object.values(data.plans).filter(p => p.id !== plan.id);
  const empty = !Object.values(plan.days).some(d => d.exercises.length > 0);

  return (
    <>
      <div className="flex items-end justify-between gap-3 pt-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black tracking-tight">Plano</h1>
            <HelpButton />
          </div>
          <p className="truncate text-muted">{plan.name}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" data-help="biblioteca" onClick={() => setLibraryOpen(true)} className="h-11 rounded-xl bg-surface-2 px-4 font-semibold">
            Biblioteca
          </button>
          <button type="button" data-help="planos" onClick={() => setPlansOpen(true)} className="h-11 rounded-xl bg-surface-2 px-4 font-semibold">
            Planos
          </button>
        </div>
      </div>
      <LibrarySheet open={libraryOpen} onClose={() => setLibraryOpen(false)} />
      {reviewLoaded && <Suspense fallback={null}><LazyAiReviewSheet open={reviewOpen} onClose={() => setReviewOpen(false)} /></Suspense>}
      <div role="radiogroup" aria-label="Como o plano anda" data-help="como-anda" className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
        {([['week', 'Semana fixa'], ['rotation', 'Rotação A/B/C']] as const).map(([mode, label]) => {
          const on = (mode === 'rotation') === !!plan.rotation;
          return (
            <button key={mode} type="button" role="radio" aria-checked={on}
              onClick={() => {
                if (on) return;
                if (mode === 'rotation') edit(enableRotation);
                else if (confirm('Voltar para a semana fixa? Cada treino volta ao seu dia da semana.')) edit(disableRotation);
              }}
              className={`min-h-11 rounded-lg text-sm font-semibold ${on ? 'bg-primary text-white' : 'text-muted'}`}>
              {label}
            </button>
          );
        })}
      </div>
      {plan.rotation ? <RotationPanel plan={plan} edit={edit} /> : !empty && (
        /* O3: calculado pelos dias obrigatórios com exercícios, sem campo manual (vazio: o aviso abaixo explica) */
        <p className="mt-2 text-sm text-muted" data-testid="dias-semana">{plural(days, 'dia de treino', 'dias de treino')} por semana</p>
      )}

      {/* plano do zero ainda vazio: o passo seguinte, com palavras */}
      {empty && (
        <p className="mt-3 rounded-2xl border border-primary bg-surface p-4 text-sm" data-testid="plano-vazio">
          <span className="block text-base font-bold">Agora, os exercícios</span>
          Toque em <span className="font-semibold">Adicionar exercício</span> {plan.rotation ? 'no Treino A' : 'em cada treino'}. Dá para buscar pelo nome ou escolher pelo grupo muscular, e pôr vários de uma vez. Séries, repetições e carga se ajustam tocando no exercício.
        </p>
      )}
      {/* X6: recolher ou abrir todos os treinos de uma vez */}
      {(() => {
        const ids = DAY_KEYS.filter(k => plan.days[k].exercises.length > 0).map(k => collapseKey(plan.id, k));
        if (ids.length < 2) return null;
        const all = ids.every(id => collapsed.has(id));
        return (
          <button type="button" onClick={() => collapsed.setAll(ids, !all)} className="mt-2 flex min-h-11 items-center gap-1 text-sm font-semibold text-muted">
            <Icon name={all ? 'descer' : 'subir'} className="size-4" />{all ? 'Abrir todos os treinos' : 'Recolher todos os treinos'}
          </button>
        );
      })()}
      <div data-help="dias" className="mt-2 space-y-3">
        {plan.rotation
          ? rotationCards(plan).map(({ key, letter, ...rest }) => (
              <DayCard key={key} plan={plan} dayKey={key} today={false} edit={edit} collapsed={collapsed} rotation={{ letter, next: 'next' in rest ? rest.next : '' }} />
            ))
          : DAY_KEYS.map(k => <DayCard key={k} plan={plan} dayKey={k} today={k === today} edit={edit} collapsed={collapsed} />)}
      </div>

      <Sheet title="Planos" open={plansOpen} onClose={() => setPlansOpen(false)}>
        <div className="space-y-3 pb-3">
          <label className="block text-sm font-semibold text-muted">Nome do plano
            <input value={plan.name} onChange={e => edit(p => ({ ...p, name: e.target.value }))}
              className="mt-1 h-12 w-full rounded-xl border border-line bg-surface-2 px-3 text-base text-ink" />
          </label>
          <label className="block text-sm font-semibold text-muted">Descrição
            <textarea value={plan.description} rows={2} maxLength={500} onChange={e => edit(p => ({ ...p, description: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-base text-ink" />
          </label>
          <label className="block text-sm font-semibold text-muted">Horário do treino
            <input type="time" value={plan.trainingTime} onChange={e => edit(p => ({ ...p, trainingTime: e.target.value }))}
              className="mt-1 h-12 w-full rounded-xl border border-line bg-surface-2 px-3 text-base text-ink" />
            <span className="mt-1 block text-xs font-normal text-faint">Usado nos lembretes dos dias de treino (Perfil → Treino).</span>
          </label>
          {/* M10: como a carga sugerida sobe neste plano */}
          <div>
            <p className="text-sm font-semibold text-muted">Progressão de carga</p>
            <div role="radiogroup" aria-label="Progressão de carga" className="mt-1 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
              {([['double', 'Dupla'], ['linear', 'Linear']] as const).map(([id, label]) => {
                const on = (plan.progression ?? 'double') === id;
                return (
                  <button key={id} type="button" role="radio" aria-checked={on}
                    onClick={() => edit(p => (id === 'double' ? (({ progression: _p, ...rest }) => rest)(p) : { ...p, progression: 'linear' }))}
                    className={`min-h-11 rounded-lg text-sm font-semibold ${on ? 'bg-primary text-white' : 'text-muted'}`}>{label}</button>
                );
              })}
            </div>
            <span className="mt-1 block text-xs text-faint">
              {plan.progression === 'linear'
                ? 'Linear: completou todas as séries nas reps do plano, a carga sobe no próximo treino. Boa para iniciantes.'
                : 'Dupla: primeiro as repetições sobem até o topo da faixa (ex.: 8–12), depois a carga.'}
            </span>
          </div>
        </div>
        {others.length > 0 && <p className="px-3 pb-1 pt-2 text-sm font-semibold text-muted">Outros planos</p>}
        {others.map(p => (
          <div key={p.id} className="flex items-center gap-2">
            <SheetAction onClick={() => { run((d, now) => setActivePlan(d, p.id, now)); setPlansOpen(false); }}>
              Usar “{p.name}”
            </SheetAction>
            <button type="button" aria-label={`Apagar ${p.name}`} className="flex size-11 shrink-0 items-center justify-center rounded-full text-danger"
              onClick={() => { if (confirm(`Apagar o plano “${p.name}”?`)) run((d, now) => deletePlan(d, p.id, now)); }}>
              <Icon name="lixo" />
            </button>
          </div>
        ))}
        <SheetAction onClick={() => { setPlansOpen(false); setAiOpen('new'); }}>
          <Icon name="dica" /> Montar treino com IA
        </SheetAction>
        <SheetAction onClick={() => { setPlansOpen(false); setAiOpen('convert'); }}>
          <Icon name="dica" /> Importar treino feito em IA
        </SheetAction>
        <SheetAction onClick={() => { setPlansOpen(false); setReviewOpen(true); }}>
          <Icon name="dica" /> Revisar este plano com IA
        </SheetAction>
        <SheetAction onClick={() => { run((d, now) => addPlan(d, duplicatePlan(plan, newId('plano'), toDateKey(now)), now)); setPlansOpen(false); }}>
          <Icon name="mais" /> Duplicar este plano
        </SheetAction>
        <PlanFileActions plan={plan} onDone={() => {}} />
        <SheetAction onClick={() => { setPlansOpen(false); setScratchOpen(true); }}>
          <Icon name="mais" /> Novo plano do zero
        </SheetAction>
        {data.workouts.length > 0 && (
          <SheetAction onClick={() => { setPlansOpen(false); setFromWorkoutOpen(true); }}>
            <Icon name="mais" /> Novo plano a partir de um treino feito
          </SheetAction>
        )}
        <SheetAction onClick={() => { setPlansOpen(false); setTemplatesOpen(true); }}>
          <Icon name="mais" /> Novo plano a partir de um modelo
        </SheetAction>
      </Sheet>
      {aiLoaded && <Suspense key="ai" fallback={null}><LazyAiPlanSheet open={!!aiOpen} initialKind={aiOpen || 'new'} onClose={() => setAiOpen(false)} /></Suspense>}
      <TemplateSheet key="modelos" open={templatesOpen} onClose={() => setTemplatesOpen(false)} />
      <ScratchPlanSheet key="do-zero" open={scratchOpen} onClose={() => setScratchOpen(false)} />
      <FromWorkoutSheet key="de-um-treino" open={fromWorkoutOpen} onClose={() => setFromWorkoutOpen(false)} />
    </>
  );
}


