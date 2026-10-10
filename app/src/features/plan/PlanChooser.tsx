import { addPlan, setActivePlan } from '../../domain/actions';
import { toDateKey } from '../../domain/dates';
import { newId } from '../../domain/ids';
import { blankPlan } from '../../domain/plan-edit';
import { useAppStore } from '../../store';
import { useUiStore } from '../../store/ui-store';
import { Icon } from '../../ui/Icon';
import { Sheet, SheetAction } from '../../ui/Sheet';
import { AiPlanSheet } from './AiPlanSheet';
import { TemplateSheet } from './TemplateSheet';
import { GuidedSetup } from './GuidedSetup';

export type ChooserMode = 'menu' | 'templates' | 'ai' | 'guided' | null;

/** Novo plano a partir do Início: modelo pronto, do zero, com IA ou outro plano já salvo. */
export function PlanChooser({ mode, setMode }: { mode: ChooserMode; setMode: (m: ChooserMode) => void }) {
  const data = useAppStore(s => s.data);
  const run = useAppStore(s => s.run);
  const setTab = useUiStore(s => s.setTab);
  const others = Object.values(data?.plans ?? {}).filter(p => p.id !== data?.activePlanId);
  const close = () => setMode(null);
  const fromScratch = () => {
    run((d, now) => addPlan(d, blankPlan(newId('plano'), toDateKey(now)), now));
    close();
    setTab('plano');
  };
  return (
    <>
      <Sheet title="Novo plano de treino" open={mode === 'menu'} onClose={close}>
        <SheetAction onClick={() => setMode('guided')}><Icon name="check" /> Montar meu plano (5 perguntas)</SheetAction>
        <SheetAction onClick={() => setMode('templates')}><Icon name="mais" /> Usar um modelo pronto</SheetAction>
        <SheetAction onClick={fromScratch}><Icon name="editar" /> Criar do zero</SheetAction>
        <SheetAction onClick={() => setMode('ai')}><Icon name="dica" /> Montar treino com IA</SheetAction>
        {others.length > 0 && <p className="px-3 pb-1 pt-3 text-sm font-semibold text-muted">Voltar a um plano salvo</p>}
        {others.map(p => (
          <SheetAction key={p.id} onClick={() => { run((d, now) => setActivePlan(d, p.id, now)); close(); }}>
            Usar “{p.name}”
          </SheetAction>
        ))}
      </Sheet>
      <GuidedSetup open={mode === 'guided'} onClose={close} onOther={() => setMode('templates')} />
      <TemplateSheet open={mode === 'templates'} onClose={close} />
      <AiPlanSheet open={mode === 'ai'} onClose={close} />
    </>
  );
}
