// V10: juntar um exercício com outro (nomes duplicados), com prévia e Desfazer.
import { useMemo, useState } from 'react';
import { mergeExercises, mergePreview, undoMerge, type MergeUndo } from '../../domain/exercise-merge';
import { searchNames } from '../../domain/search';
import { normalizeExerciseName } from '../../domain/text';
import { useSearchPool } from '../../hooks/use-search-pool';
import { useAppStore } from '../../store';
import { Sheet, SheetAction } from '../../ui/Sheet';
import { plural } from '../../ui/format';

export function MergeExerciseButton({ name, onMerged }: { name: string; onMerged: (to: string) => void }) {
  const data = useAppStore(s => s.data);
  const run = useAppStore(s => s.run);
  const pool = useSearchPool();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [target, setTarget] = useState<string | null>(null);
  const [undo, setUndo] = useState<{ from: string; to: string; data: MergeUndo; timer: number } | null>(null);
  const matches = useMemo(() => {
    const k = normalizeExerciseName(name);
    const names = pool.names.filter(n => normalizeExerciseName(n) !== k);
    return query.trim() ? searchNames(query, names, 8, pool.done, pool.favorites, pool.aliases) : [];
  }, [query, pool, name]);
  if (!data) return null;
  const preview = target ? mergePreview(data, name, target) : null;
  const close = () => { setOpen(false); setQuery(''); setTarget(null); };
  const merge = () => {
    if (!target) return;
    let saved: MergeUndo | null = null;
    run((d, now) => { const out = mergeExercises(d, name, target, now); saved = out.undo; return out.result; });
    const to = target;
    close();
    if (undo) clearTimeout(undo.timer);
    if (saved) setUndo({ from: name, to, data: saved, timer: window.setTimeout(() => setUndo(null), 10000) });
    onMerged(to);
  };
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="mt-2 h-10 text-sm font-semibold text-primary">Juntar com outro exercício</button>
      {undo && (
        <div role="status" className="mt-1 flex items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-1 text-sm">
          <span className="min-w-0">“{undo.from}” agora é “{undo.to}”.</span>
          <button type="button" onClick={() => { const u = undo; clearTimeout(u.timer); run((d, now) => undoMerge(d, u.data, now)); setUndo(null); onMerged(u.from); }}
            className="h-10 shrink-0 px-2 font-bold text-info">Desfazer</button>
        </div>
      )}
      <Sheet title={`Juntar “${name}”`} open={open && !target} onClose={close}>
        <p className="px-1 pb-2 text-sm text-muted">Para nomes repetidos do mesmo exercício: o histórico, os recordes e os planos de “{name}” passam para o exercício escolhido, e “{name}” vira um outro nome dele na busca.</p>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar o exercício certo" aria-label="Juntar com"
          className="h-12 w-full rounded-xl border border-line bg-surface-2 px-3 text-base text-ink" />
        <ul className="mt-2">{matches.map(n => <li key={n}><SheetAction onClick={() => setTarget(n)}>{n}</SheetAction></li>)}</ul>
      </Sheet>
      <Sheet title="Juntar exercícios" open={open && !!target} onClose={() => setTarget(null)}>
        {preview && target && (
          <div className="space-y-3 px-1 pb-3">
            <p>“{name}” vira <strong>“{target}”</strong>.</p>
            <ul className="list-disc pl-5 text-sm text-muted">
              <li>{plural(preview.workouts, 'treino', 'treinos')} ({plural(preview.sets, 'série', 'séries')}) {preview.workouts === 1 ? 'passa' : 'passam'} para “{target}”, com os recordes;</li>
              <li>{preview.plans ? `${plural(preview.plans, 'plano troca', 'planos trocam')} o nome` : 'nenhum plano usa este nome'};</li>
              <li>“{name}” continua achando o exercício na busca.</li>
            </ul>
            <button type="button" onClick={merge} className="h-12 w-full rounded-xl bg-primary text-base font-bold text-white">Juntar</button>
            <button type="button" onClick={() => setTarget(null)} className="h-11 w-full rounded-xl font-semibold text-muted">Escolher outro</button>
          </div>
        )}
      </Sheet>
    </>
  );
}
