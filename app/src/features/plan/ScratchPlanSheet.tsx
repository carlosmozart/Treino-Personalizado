// Criar um plano do zero: nome, dias de treino e se é semana fixa ou rotação. O plano nasce com os
// treinos vazios e nomeados, e a tela Plano mostra onde pôr os exercícios.
import { useEffect, useState } from 'react';
import { DAY_KEYS, type DayKey } from '../../domain/ai-plan';
import { addPlan } from '../../domain/actions';
import { toDateKey } from '../../domain/dates';
import { newId } from '../../domain/ids';
import { DAY_FULL_NAMES } from '../../domain/model';
import { scratchPlan } from '../../domain/plan-edit';
import { useAppStore } from '../../store';
import { useUiStore } from '../../store/ui-store';
import { Sheet } from '../../ui/Sheet';

const SHORT: Record<DayKey, string> = { SEG: 'Seg', TER: 'Ter', QUA: 'Qua', QUI: 'Qui', SEX: 'Sex', SAB: 'Sáb', DOM: 'Dom' };
const DEFAULT_DAYS: DayKey[] = ['SEG', 'QUA', 'SEX'];
const LETTERS = 'ABCDEFG';

const listPt = (items: string[]) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`);

export function ScratchPlanSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const run = useAppStore(s => s.run);
  const setTab = useUiStore(s => s.setTab);
  const [name, setName] = useState('');
  const [days, setDays] = useState<DayKey[]>(DEFAULT_DAYS);
  const [rotation, setRotation] = useState(false);
  useEffect(() => {
    if (!open) return;
    setName('');
    setDays(DEFAULT_DAYS);
    setRotation(false);
  }, [open]);
  const toggleDay = (k: DayKey) => setDays(d => (d.includes(k) ? d.filter(x => x !== k) : DAY_KEYS.filter(x => x === k || d.includes(x))));
  const chosen = DAY_KEYS.filter(k => days.includes(k));
  const create = () => {
    run((d, now) => addPlan(d, scratchPlan(newId('plano'), toDateKey(now), { name, days: chosen, rotation }), now));
    onClose();
    setTab('plano');
  };
  const preview = rotation
    ? `Meta de ${chosen.length} ${chosen.length === 1 ? 'treino' : 'treinos'} por semana, em qualquer dia. Você monta o treino A, depois o B, e assim por diante.`
    : `${chosen.length === 1 ? 'Um treino vazio' : `${chosen.length} treinos vazios`}: ${listPt(chosen.map((k, i) => `${DAY_FULL_NAMES[k].toLowerCase()} (Treino ${LETTERS[i]})`))}. Depois é só pôr os exercícios em cada um.`;

  return (
    <Sheet title="Criar do zero" open={open} onClose={onClose}>
      <div className="space-y-4 px-1 pb-3">
        <label className="block text-sm font-semibold text-muted">Nome do plano
          <input value={name} maxLength={80} onChange={e => setName(e.target.value)} placeholder="Meu treino"
            className="mt-1 h-12 w-full rounded-xl border border-line bg-surface-2 px-3 text-base text-ink" />
        </label>

        <fieldset>
          <legend className="text-sm font-semibold text-muted">Em quais dias você vai treinar?</legend>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {DAY_KEYS.map(k => {
              const on = days.includes(k);
              return (
                <button key={k} type="button" aria-pressed={on} aria-label={DAY_FULL_NAMES[k]} onClick={() => toggleDay(k)}
                  className={`h-11 rounded-xl text-sm font-bold ${on ? 'bg-primary text-white' : 'bg-surface-2 text-muted'}`}>{SHORT[k]}</button>
              );
            })}
          </div>
        </fieldset>

        <div>
          <p className="text-sm font-semibold text-muted">Como os treinos se repetem?</p>
          <div role="radiogroup" aria-label="Como os treinos se repetem" className="mt-1 space-y-2">
            {([
              [false, 'Cada dia tem o seu treino', 'Semana fixa: segunda é sempre o Treino A, quarta o B…'],
              [true, 'Rotação A, B, C…', 'O próximo treino é o seguinte ao último feito, em qualquer dia. Faltar um dia não bagunça nada.']
            ] as const).map(([value, label, hint]) => (
              <button key={label} type="button" role="radio" aria-checked={rotation === value} onClick={() => setRotation(value)}
                className={`w-full rounded-xl border p-3 text-left ${rotation === value ? 'border-primary bg-primary/10' : 'border-line bg-surface-2'}`}>
                <span className="block font-semibold">{label}</span>
                <span className="block text-sm text-muted">{hint}</span>
              </button>
            ))}
          </div>
        </div>

        {chosen.length > 0 && <p className="rounded-xl bg-surface-2 p-3 text-sm" data-testid="previa-do-zero">{preview}</p>}
        <button type="button" disabled={!chosen.length} onClick={create}
          className="h-12 w-full rounded-xl bg-primary text-base font-bold text-white disabled:opacity-50">
          {chosen.length ? 'Criar plano e adicionar exercícios' : 'Escolha pelo menos um dia'}
        </button>
      </div>
    </Sheet>
  );
}
