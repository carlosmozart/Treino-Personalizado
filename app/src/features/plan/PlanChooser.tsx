import { setActivePlan } from '../../domain/actions';
import { useAppStore } from '../../store';
import { Icon } from '../../ui/Icon';
import { Sheet, SheetAction } from '../../ui/Sheet';
import { AiPlanSheet } from './AiPlanSheet';
import { TemplateSheet } from './TemplateSheet';
import { GuidedSetup } from './GuidedSetup';
import { PlanFileActions } from './PlanFileActions';
import { ScratchPlanSheet } from './ScratchPlanSheet';

export type ChooserMode = 'menu' | 'templates' | 'ai' | 'ai-convert' | 'guided' | 'scratch' | null;

/** Novo plano a partir do Início: modelo pronto, do zero, com IA ou outro plano já salvo. */
export function PlanChooser({ mode, setMode }: { mode: ChooserMode; setMode: (m: ChooserMode) => void }) {
  const data = useAppStore(s => s.data);
  const run = useAppStore(s => s.run);
  const others = Object.values(data?.plans ?? {}).filter(p => p.id !== data?.activePlanId);
  const close = () => setMode(null);
  return (
    <>
      <Sheet title="Novo plano de treino" open={mode === 'menu'} onClose={close}>
        <SheetAction onClick={() => setMode('guided')}><Icon name="check" /> Montar meu plano (5 perguntas)</SheetAction>
        <SheetAction onClick={() => setMode('templates')}><Icon name="mais" /> Usar um modelo pronto</SheetAction>
        <SheetAction onClick={() => setMode('scratch')}><Icon name="editar" /> Criar do zero</SheetAction>
        <SheetAction onClick={() => setMode('ai')}><Icon name="dica" /> Montar treino com IA</SheetAction>
        <SheetAction onClick={() => setMode('ai-convert')}><Icon name="dica" /> Importar treino feito em IA</SheetAction>
        <PlanFileActions onDone={close} />
        {others.length > 0 && <p className="px-3 pb-1 pt-3 text-sm font-semibold text-muted">Voltar a um plano salvo</p>}
        {others.map(p => (
          <SheetAction key={p.id} onClick={() => { run((d, now) => setActivePlan(d, p.id, now)); close(); }}>
            Usar “{p.name}”
          </SheetAction>
        ))}
      </Sheet>
      <GuidedSetup open={mode === 'guided'} onClose={close} onOther={() => setMode('templates')} />
      <TemplateSheet open={mode === 'templates'} onClose={close} />
      <ScratchPlanSheet open={mode === 'scratch'} onClose={close} />
      <AiPlanSheet open={mode === 'ai'} onClose={close} />
      <AiPlanSheet open={mode === 'ai-convert'} onClose={close} initialKind="convert" />
    </>
  );
}
