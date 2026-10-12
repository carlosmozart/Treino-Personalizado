import { useRef, useState } from 'react';
import { addPlan } from '../../domain/actions';
import { toDateKey } from '../../domain/dates';
import { newId } from '../../domain/ids';
import type { Plan } from '../../domain/model';
import { exportPlan, readPlanFile } from '../../domain/plan-share';
import { saveBackupFile } from '../../platform/backup-file';
import { useAppStore } from '../../store';
import { Icon } from '../../ui/Icon';
import { Sheet, SheetAction } from '../../ui/Sheet';

const fileName = (name: string) =>
  `plano-${name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'treino'}.json`;

/** M23: compartilhar o plano por arquivo (sem dados pessoais) e importar o plano de outra pessoa. */
export function PlanFileActions({ plan, onDone }: { plan?: Plan | undefined; onDone: () => void }) {
  const run = useAppStore(s => s.run);
  const input = useRef<HTMLInputElement>(null);
  const [sharing, setSharing] = useState(false);
  const [withLoads, setWithLoads] = useState(false);
  const [message, setMessage] = useState('');

  const share = async () => {
    if (!plan) return;
    try {
      const r = await saveBackupFile(fileName(plan.name), JSON.stringify(exportPlan(plan, withLoads), null, 2));
      setMessage(r === 'saved' ? 'Arquivo do plano salvo. Mande para quem quiser: a pessoa importa em Plano → Planos.' : '');
    } catch { setMessage('Não deu para salvar o arquivo.'); }
  };

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    const r = readPlanFile(text, toDateKey(new Date()), prefix => newId(prefix));
    if ('error' in r) { setMessage(r.error); return; }
    run((d, now) => addPlan(d, r.plan, now));
    setMessage(`Plano “${r.plan.name}” importado e ativado.`);
    onDone();
  };

  return (
    <>
      {plan && (
        <SheetAction onClick={() => { setMessage(''); setSharing(true); }}><Icon name="mais" /> Compartilhar este plano (arquivo)</SheetAction>
      )}
      <SheetAction onClick={() => input.current?.click()}><Icon name="mais" /> Importar plano de um arquivo</SheetAction>
      <input ref={input} type="file" accept="application/json,.json" hidden aria-label="Arquivo do plano"
        onChange={e => { void importFile(e.target.files?.[0]); e.target.value = ''; }} />
      {message && !sharing && <p role="status" className="px-3 pb-2 text-sm text-muted">{message}</p>}
      <Sheet title="Compartilhar o plano" open={sharing} onClose={() => setSharing(false)}>
        <div className="space-y-3 px-1 pb-3">
          <p className="text-sm text-muted">
            Vai só o plano: treinos, exercícios, séries e repetições. Nada do seu histórico, peso ou perfil.
          </p>
          <label className="flex min-h-11 items-center gap-3">
            <input type="checkbox" checked={withLoads} onChange={e => setWithLoads(e.target.checked)} className="size-5 accent-[var(--color-primary)]" />
            <span className="text-sm font-semibold">Incluir as cargas (para quem treina com você ou para o seu personal)</span>
          </label>
          <button type="button" onClick={() => void share()} className="h-12 w-full rounded-xl bg-primary text-base font-bold text-white">Salvar o arquivo do plano</button>
          {message && <p role="status" className="text-sm text-muted">{message}</p>}
        </div>
      </Sheet>
    </>
  );
}
