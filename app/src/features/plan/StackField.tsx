// T23: a pilha de pesos da máquina, editada no exercício do plano. Saiu de PlanScreen.tsx (X13).
import { useState } from 'react';
import { type PlanExercise } from '../../domain/model';
import { formatStack, parseStack } from '../../domain/stack';

/**
 * T23: a pilha da máquina: os pesos que o pino escolhe ("5, 10, 15" ou "5-100/5"). Com ela, a
 * carga sugerida e os botões de carga andam de pino em pino.
 */
export function StackField({ ex, onChange }: { ex: PlanExercise; onChange: (patch: Partial<PlanExercise>) => void }) {
  const [text, setText] = useState(ex.stack?.length ? ex.stack.join('; ').replace(/\./g, ',') : '');
  const parsed = parseStack(text);
  const saved = (ex.stack ?? []).join(';');
  return (
    <div className="mt-2">
      <label className="block text-xs font-semibold text-muted">Pilha da máquina (kg)
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Ex.: 5-100/5 ou 7; 14; 21" aria-label={`Pilha da máquina de ${ex.name}`}
          className="mt-1 h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-base text-ink" />
      </label>
      <p className="mt-1 text-xs text-faint">{parsed.length ? `${parsed.length} pesos: ${formatStack(parsed)}` : 'Opcional: os pesos que o pino escolhe, para a carga andar de pino em pino.'}</p>
      {parsed.join(';') !== saved && (
        <button type="button" onClick={() => onChange({ stack: parsed.length ? parsed : undefined })} className="mt-1 h-10 rounded-lg bg-surface-2 px-3 text-sm font-semibold">
          {parsed.length ? 'Salvar a pilha' : 'Tirar a pilha'}
        </button>
      )}
    </div>
  );
}
