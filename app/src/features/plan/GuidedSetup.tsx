import { useState } from 'react';
import { DAY_KEYS } from '../../domain/ai-plan';
import { addPlan } from '../../domain/actions';
import { toDateKey } from '../../domain/dates';
import { newId } from '../../domain/ids';
import { recommendPlan, type Goal, type Level, type Place, type Schedule, type SetupAnswers } from '../../domain/onboarding';
import { dedupeForRotation, enableRotation, rotationOrder, rotationTitle, setRotationPerWeek } from '../../domain/rotation';
import { PLAN_TEMPLATES } from '../../data/plan-templates';
import { useAppStore } from '../../store';
import { Sheet } from '../../ui/Sheet';
import { dayTitle } from '../../ui/format';

type Step = { key: keyof SetupAnswers; question: string; options: { value: SetupAnswers[keyof SetupAnswers]; label: string; hint?: string }[] };

const STEPS: Step[] = [
  { key: 'goal', question: 'Qual é o seu objetivo?', options: [
    { value: 'massa' as Goal, label: 'Ganhar massa muscular' },
    { value: 'forca' as Goal, label: 'Ficar mais forte' },
    { value: 'emagrecer' as Goal, label: 'Emagrecer' },
    { value: 'saude' as Goal, label: 'Saúde e condicionamento' }
  ] },
  { key: 'place', question: 'Onde você vai treinar?', options: [
    { value: 'academia' as Place, label: 'Na academia' },
    { value: 'casa' as Place, label: 'Em casa', hint: 'Sem aparelhos, com o peso do corpo' }
  ] },
  { key: 'days', question: 'Quantos dias por semana?', options: [2, 3, 4, 5, 6].map(n => ({ value: n, label: `${n} dias` })) },
  { key: 'level', question: 'Há quanto tempo você treina?', options: [
    { value: 'iniciante' as Level, label: 'Estou começando', hint: 'Ou voltando depois de muito tempo' },
    { value: 'intermediario' as Level, label: 'De 6 meses a 2 anos' },
    { value: 'avancado' as Level, label: 'Mais de 2 anos' }
  ] },
  { key: 'schedule', question: 'Seus dias de treino são fixos?', options: [
    { value: 'fixo' as Schedule, label: 'Sim, sempre nos mesmos dias' },
    { value: 'flexivel' as Schedule, label: 'Não, treino quando dá', hint: 'O plano vem em rotação A/B/C: faltar um dia não bagunça nada' }
  ] }
];

/** Primeira abertura guiada: cinco toques e o app monta o plano a partir de um modelo pronto. */
export function GuidedSetup({ open, onClose, onOther }: { open: boolean; onClose: () => void; onOther: () => void }) {
  const run = useAppStore(s => s.run);
  const [answers, setAnswers] = useState<Partial<SetupAnswers>>({});
  const [step, setStep] = useState(0);
  const close = () => { setAnswers({}); setStep(0); onClose(); };
  const current = STEPS[step];
  const done = step >= STEPS.length;
  const choice = done ? recommendPlan(answers as SetupAnswers) : null;
  const template = choice ? PLAN_TEMPLATES.find(t => t.id === choice.templateId) : undefined;
  const built = template?.build('2000-01-01', 'previa');
  const preview = built && choice?.rotation ? enableRotation(dedupeForRotation(built)) : built;

  const use = () => {
    if (!template || !choice) return;
    run((d, now) => {
      let plan = template.build(toDateKey(now), newId('plano'));
      // a meta de treinos por semana é a que a pessoa respondeu, não o número de treinos do modelo
      if (choice.rotation) plan = setRotationPerWeek(enableRotation(dedupeForRotation(plan)), answers.days ?? 3);
      if (choice.linear) plan = { ...plan, progression: 'linear' };
      return addPlan(d, plan, now);
    });
    close();
  };

  return (
    <Sheet title="Montar meu plano" open={open} onClose={close}>
      <div className="px-1 pb-3">
        {!done && current && (
          <>
            <p className="text-xs font-semibold text-muted">Pergunta {step + 1} de {STEPS.length}</p>
            <h3 className="mt-1 text-lg font-bold">{current.question}</h3>
            <div className="mt-3 space-y-2">
              {current.options.map(o => (
                <button key={String(o.value)} type="button"
                  onClick={() => { setAnswers(a => ({ ...a, [current.key]: o.value })); setStep(s => s + 1); }}
                  className="w-full rounded-xl bg-surface-2 px-4 py-3 text-left">
                  <span className="block font-semibold">{o.label}</span>
                  {o.hint && <span className="block text-sm text-muted">{o.hint}</span>}
                </button>
              ))}
            </div>
            {step > 0 && (
              <button type="button" onClick={() => setStep(s => s - 1)} className="mt-3 h-11 font-semibold text-muted">Voltar</button>
            )}
          </>
        )}
        {done && template && choice && preview && (
          <>
            <p className="text-xs font-semibold text-muted">Seu plano</p>
            <h3 className="mt-1 text-xl font-black">{template.name}</h3>
            <p className="mt-1 text-sm text-muted">{choice.why}</p>
            <ul className="mt-2 space-y-1 text-sm">
              {choice.rotation && <li>• Em rotação A/B/C: o próximo treino é o seguinte ao último feito, em qualquer dia.</li>}
              <li>• {choice.linear ? 'Progressão linear: completou todas as séries, a carga sobe no próximo treino.' : 'Progressão dupla: primeiro as repetições, depois a carga.'}</li>
              <li>• As cargas começam em zero: anote as suas no primeiro treino.</li>
            </ul>
            <ul className="mt-3 space-y-2 rounded-xl bg-surface-2 p-3 text-sm">
              {(preview.rotation ? rotationOrder(preview) : DAY_KEYS.filter(k => preview.days[k].exercises.length > 0)).map(k => (
                <li key={k}>
                  <p className="font-semibold">{preview.rotation ? rotationTitle(preview, k) : dayTitle(preview.days[k], k).title}</p>
                  <p className="text-muted">{preview.days[k].exercises.map(e => e.name).join(' · ')}</p>
                </li>
              ))}
            </ul>
            <button type="button" onClick={use} className="mt-4 h-12 w-full rounded-xl bg-primary text-base font-bold text-white">Usar este plano</button>
            <button type="button" onClick={() => { close(); onOther(); }} className="mt-2 h-11 w-full rounded-xl font-semibold text-muted">Ver outros modelos</button>
            <button type="button" onClick={() => setStep(0)} className="mt-1 h-11 w-full rounded-xl font-semibold text-muted">Refazer as perguntas</button>
          </>
        )}
      </div>
    </Sheet>
  );
}
