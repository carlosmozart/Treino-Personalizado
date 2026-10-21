import { useMemo, useState } from 'react';
import { parseAiPlan } from '../../domain/ai-plan';
import { AI_GOALS, suggestedGoal, type AiGoal } from '../../domain/ai-prompt';
import { applyReview, buildReviewPrompt, reviewChanges, targetText, type Review, type ReviewChange } from '../../domain/ai-review';
import { DAY_FULL_NAMES } from '../../domain/model';
import { editPlan } from '../../domain/plan-edit';
import { newId } from '../../domain/ids';
import { isCardioName } from '../../data/exercise-library';
import { useAppStore } from '../../store';
import { Sheet } from '../../ui/Sheet';
import { plural } from '../../ui/format';

const INPUT = 'mt-1 w-full rounded-xl border border-line bg-surface-2 px-3 text-base text-ink';
const KIND = { change: 'Alterar', swap: 'Trocar', add: 'Incluir', remove: 'Tirar' } as const;

async function copy(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

function title(c: ReviewChange): string {
  const name = c.kind === 'add' ? c.after!.name : c.before!.name;
  return c.kind === 'swap' ? `${KIND.swap} ${name}` : `${KIND[c.kind]} ${name}`;
}

/**
 * M34: revisão do plano pela IA. 1) o pedido leva o plano atual, o histórico real e o objetivo;
 * 2) a resposta vira uma lista de mudanças, cada uma com o motivo, e só as marcadas entram no plano.
 */
export function AiReviewSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const data = useAppStore(s => s.data);
  const run = useAppStore(s => s.run);
  const [step, setStep] = useState<'prompt' | 'import'>('prompt');
  const [goal, setGoal] = useState<AiGoal | null>(null);
  const [notes, setNotes] = useState('');
  const [answer, setAnswer] = useState('');
  const [review, setReview] = useState<Review | null>(null);
  const [approved, setApproved] = useState<Set<string>>(new Set());
  const [failed, setFailed] = useState(false);
  const [message, setMessage] = useState('');

  const plan = data?.activePlanId ? data.plans[data.activePlanId] : undefined;
  const g = goal ?? (data ? suggestedGoal(data) : 'hipertrofia');
  const prompt = useMemo(() => (data && plan ? buildReviewPrompt(data, plan, { goal: g, notes }, new Date()) : ''), [data, plan, g, notes]);
  if (!data || !plan) return null;

  const close = () => { setStep('prompt'); setReview(null); setFailed(false); setMessage(''); onClose(); };
  const read = () => {
    const ai = parseAiPlan(answer);
    if (!ai || !ai.dias.length) { setReview(null); setFailed(true); return; }
    const r = reviewChanges(plan, ai, { makeId: () => newId('ex'), isCardioName });
    setFailed(false);
    setMessage('');
    setReview(r);
    setApproved(new Set(r.changes.map(c => c.id)));
  };
  const toggle = (id: string) => setApproved(cur => { const next = new Set(cur); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const apply = () => {
    if (!review || !approved.size) return;
    const { plan: next, skipped } = applyReview(plan, review, approved);
    run((cur, now) => editPlan(cur, plan.id, () => next, now));
    setMessage(`${plural(approved.size, 'mudança aplicada', 'mudanças aplicadas')} em “${plan.name}”.${skipped ? ` ${plural(skipped, 'exercício ficou', 'exercícios ficaram')} de fora: o dia já tinha 10.` : ''}`);
    setReview(null);
    setAnswer('');
  };

  return (
    <Sheet title="Revisar meu plano com IA" open={open} onClose={close}>
      <div role="tablist" className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
        {(['prompt', 'import'] as const).map(s => (
          <button key={s} type="button" role="tab" aria-selected={step === s} onClick={() => setStep(s)}
            className={`h-10 rounded-lg text-sm font-semibold ${step === s ? 'bg-surface text-ink' : 'text-muted'}`}>
            {s === 'prompt' ? '1. Gerar o pedido' : '2. Colar a resposta'}
          </button>
        ))}
      </div>

      {step === 'prompt' ? (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-muted">O pedido leva o plano “{plan.name}” e o que você fez de verdade nas últimas semanas (cargas, repetições, quantos treinos). A IA sugere ajustes com o motivo, e você aprova um a um.</p>
          <label className="block text-sm font-semibold text-muted">Objetivo
            <select value={g} onChange={e => setGoal(e.target.value as AiGoal)} className={`${INPUT} h-12`}>
              {Object.entries(AI_GOALS).map(([k, v]) => <option key={k} value={k}>{v[0]!.toUpperCase() + v.slice(1)}</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold text-muted">Observações (lesões, dores, o que quer mudar)
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} maxLength={1000} className={`${INPUT} py-2`} />
          </label>
          <textarea readOnly value={prompt} rows={6} aria-label="Pedido de revisão para a IA" className={`${INPUT} py-2 font-mono text-xs`} />
          <button type="button" onClick={() => void copy(prompt).then(ok => setMessage(ok ? 'Pedido copiado. Cole na IA e depois volte em "2. Colar a resposta".' : 'Não foi possível copiar.'))}
            className="h-12 w-full rounded-xl bg-primary font-bold text-white">Copiar pedido de revisão</button>
          {message && <p role="status" className="text-sm text-muted">{message}</p>}
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <label className="block text-sm font-semibold text-muted">Resposta da IA
            <textarea value={answer} onChange={e => { setAnswer(e.target.value); setFailed(false); }} rows={6} placeholder="Cole aqui a resposta inteira" className={`${INPUT} py-2 text-sm`} />
          </label>
          <button type="button" disabled={!answer.trim()} onClick={read} className="h-12 w-full rounded-xl bg-primary font-bold text-white disabled:opacity-50">Ver mudanças</button>
          {failed && <p className="rounded-xl border border-danger/40 p-3 text-sm">Não encontrei o plano revisado no formato do app. Peça à IA para repetir o plano inteiro entre [PLANO] e [FIM].</p>}
          {review && !review.changes.length && <p className="rounded-xl bg-surface-2 p-3 text-sm">A IA devolveu o plano sem mudanças: está tudo como antes.</p>}
          {review && review.changes.length > 0 && (
            <div className="space-y-2">
              <p className="font-semibold">{plural(review.changes.length, 'mudança sugerida', 'mudanças sugeridas')}. Desmarque o que não quiser.</p>
              <ul className="space-y-2">
                {review.changes.map(c => (
                  <li key={c.id}>
                    <label className="flex gap-3 rounded-xl bg-surface-2 p-3">
                      <input type="checkbox" checked={approved.has(c.id)} onChange={() => toggle(c.id)} className="mt-1 size-5 shrink-0 accent-[var(--color-primary)]" />
                      <span className="min-w-0 text-sm">
                        <span className="block text-xs font-semibold text-muted">{DAY_FULL_NAMES[c.day]}</span>
                        <span className="block font-semibold">{title(c)}</span>
                        {c.details.map(d => <span key={d} className="block">{d}</span>)}
                        {c.kind === 'remove' && c.before && <span className="block text-muted">Hoje: {targetText(c.before)}</span>}
                        {c.reason && <span className="mt-1 block text-muted">Por quê: {c.reason}</span>}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <button type="button" disabled={!approved.size} onClick={apply} className="h-12 w-full rounded-xl bg-primary font-bold text-white disabled:opacity-50">
                {approved.size ? `Aplicar ${plural(approved.size, 'mudança', 'mudanças')}` : 'Nada marcado'}
              </button>
            </div>
          )}
          {message && <p role="status" className="text-sm text-success">{message}</p>}
        </div>
      )}
    </Sheet>
  );
}
