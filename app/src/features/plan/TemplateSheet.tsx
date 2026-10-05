import { DAY_KEYS } from '../../domain/ai-plan';
import { addPlan } from '../../domain/actions';
import { toDateKey } from '../../domain/dates';
import { newId } from '../../domain/ids';
import { trainingDaysPerWeek } from '../../domain/model';
import { PLAN_TEMPLATES } from '../../data/plan-templates';
import { useAppStore } from '../../store';
import { Sheet } from '../../ui/Sheet';
import { dayTitle, plural } from '../../ui/format';

// prévia montada uma vez: os modelos são fixos
const PREVIEWS = PLAN_TEMPLATES.map(t => ({ template: t, plan: t.build('2000-01-01', t.id) }));

/** Escolha de um plano pronto (M45): vira um plano novo, ativo e editável. */
export function TemplateSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const run = useAppStore(s => s.run);
  const use = (id: string) => {
    const t = PLAN_TEMPLATES.find(x => x.id === id);
    if (!t) return;
    run((d, now) => addPlan(d, t.build(toDateKey(now), newId('plano')), now));
    onClose();
  };
  return (
    <Sheet title="Modelos de plano" open={open} onClose={onClose}>
      <p className="px-1 pb-3 text-sm text-muted">O modelo vira um plano seu: dá para trocar exercícios, dias e séries depois. As cargas começam em zero; anote as suas no primeiro treino.</p>
      <ul className="space-y-3 pb-3">
        {PREVIEWS.map(({ template: t, plan }) => {
          const days = DAY_KEYS.filter(k => plan.days[k].exercises.length > 0);
          return (
            <li key={t.id} className="rounded-2xl border border-line bg-surface-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold leading-snug">{t.name}</h3>
                <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-muted">{t.level}</span>
              </div>
              <p className="mt-1 text-sm text-muted">{t.summary}</p>
              <p className="mt-1 text-xs text-faint">{plural(trainingDaysPerWeek(plan), 'dia', 'dias')} por semana</p>
              <details className="mt-2 text-sm">
                <summary className="cursor-pointer py-1 font-semibold text-primary">Ver os treinos</summary>
                <ul className="mt-1 space-y-2">
                  {days.map(k => (
                    <li key={k}>
                      <p className="font-semibold">{dayTitle(plan.days[k], k).title}</p>
                      <p className="text-muted">{plan.days[k].exercises.map(e => (e.optional ? `${e.name} (opcional)` : e.name)).join(' · ')}</p>
                    </li>
                  ))}
                </ul>
              </details>
              <button type="button" onClick={() => use(t.id)} aria-label={`Usar ${t.name}`}
                className="mt-3 h-11 w-full rounded-xl bg-primary font-bold text-white">
                Usar este modelo
              </button>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
