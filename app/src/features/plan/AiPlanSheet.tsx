import { useMemo, useState } from 'react';
import { addPlan } from '../../domain/actions';
import { parseAiPlan, DAY_KEYS } from '../../domain/ai-plan';
import { aiPlanToPlan, type AiPlanImport } from '../../domain/ai-plan-import';
import { AI_FORMAT_REMINDER, AI_GOALS, buildAiPrompt, suggestedGoal, trainingDaysOfActive, type AiGoal } from '../../domain/ai-prompt';
import { toDateKey } from '../../domain/dates';
import { newId } from '../../domain/ids';
import { isCardioName } from '../../data/exercise-library';
import { useAppStore } from '../../store';
import { NumberField } from '../../ui/NumberField';
import { Sheet } from '../../ui/Sheet';
import { plural, shortDate } from '../../ui/format';

const INPUT = 'mt-1 w-full rounded-xl border border-line bg-surface-2 px-3 text-base text-ink';

async function copy(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

/**
 * Montar treino com IA: 1) o app monta o prompt para copiar e colar na IA preferida;
 * 2) a pessoa cola a resposta, confere o que foi entendido e cria o plano.
 */
export function AiPlanSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const data = useAppStore(s => s.data);
  const run = useAppStore(s => s.run);
  const [step, setStep] = useState<'prompt' | 'import'>('prompt');
  const [goal, setGoal] = useState<AiGoal | null>(null);
  const [days, setDays] = useState<number | null>(null);
  const [minutes, setMinutes] = useState(60);
  const [notes, setNotes] = useState('');
  const [includeHealth, setIncludeHealth] = useState(true);
  const [includeCurrent, setIncludeCurrent] = useState(true);
  const [message, setMessage] = useState('');
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<AiPlanImport | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [failed, setFailed] = useState(false);
  const [name, setName] = useState('');

  const g = goal ?? (data ? suggestedGoal(data) : 'hipertrofia');
  const d = days ?? (data ? trainingDaysOfActive(data) : 3);
  const prompt = useMemo(
    () => (data ? buildAiPrompt(data, { goal: g, days: d, minutes, notes, includeHealth, includeCurrent }, new Date()) : ''),
    [data, g, d, minutes, notes, includeHealth, includeCurrent]
  );
  if (!data) return null;

  const close = () => { setStep('prompt'); setResult(null); setFailed(false); setMessage(''); onClose(); };
  const read = () => {
    const ai = parseAiPlan(answer);
    if (!ai || !ai.dias.length) { setResult(null); setFailed(true); return; }
    const today = toDateKey(new Date());
    setFailed(false);
    setWarnings(ai.avisos);
    setResult(aiPlanToPlan(ai, { id: newId('plano'), name: '', today, makeId: () => newId('ex'), isCardioName }));
    setName(`Plano da IA — ${shortDate(today)}`);
  };
  const create = () => {
    if (!result || !name.trim()) return;
    const first = !data.activePlanId;
    // sem plano ativo, o novo já vira o ativo; com plano, a pessoa ativa quando quiser
    run((cur, now) => addPlan(cur, { ...result.plan, name: name.trim() }, now, !cur.activePlanId));
    setMessage(first ? `“${name.trim()}” criado e ativado.` : `“${name.trim()}” criado. Ative em Plano → Planos quando quiser começar.`);
    setResult(null);
    setAnswer('');
  };

  return (
    <Sheet title="Montar treino com IA" open={open} onClose={close}>
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
          <p className="text-sm text-muted">O app não conversa com nenhuma IA: ele monta o pedido para você copiar e colar no ChatGPT, Gemini ou outra. Nenhum dado sai do aparelho sozinho.</p>
          <label className="block text-sm font-semibold text-muted">Objetivo
            <select value={g} onChange={e => setGoal(e.target.value as AiGoal)} className={`${INPUT} h-12`}>
              {Object.entries(AI_GOALS).map(([k, v]) => <option key={k} value={k}>{v[0]!.toUpperCase() + v.slice(1)}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-semibold text-muted">Dias por semana
              <NumberField label="Dias de treino por semana" value={d} onChange={n => setDays(Math.min(7, Math.max(1, Math.round(n))))} className="mt-1" />
            </label>
            <label className="block text-sm font-semibold text-muted">Minutos por treino
              <NumberField label="Minutos por treino" value={minutes} onChange={setMinutes} className="mt-1" />
            </label>
          </div>
          <label className="block text-sm font-semibold text-muted">Observações (lesões, dores, equipamentos)
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} maxLength={1000} className={`${INPUT} py-2`} />
          </label>
          {!notes.trim() && <p className="text-xs text-warning">Sem observações, a IA não sabe de nenhuma limitação sua. O pedido avisa isso e pede alternativas mais seguras.</p>}
          <Check label="Enviar meus dados de saúde (idade, peso, IMC, gasto)" checked={includeHealth} onChange={setIncludeHealth} />
          <Check label="Enviar meu treino atual e as cargas que uso" checked={includeCurrent} onChange={setIncludeCurrent} />
          <textarea readOnly value={prompt} rows={6} aria-label="Pedido para a IA" className={`${INPUT} py-2 font-mono text-xs`} />
          <p className="text-xs text-faint">{prompt.split('\n').length} linhas · {prompt.length} caracteres</p>
          <button type="button" onClick={() => void copy(prompt).then(ok => setMessage(ok ? 'Pedido copiado. Cole na IA e depois volte em "2. Colar a resposta".' : 'Não foi possível copiar.'))}
            className="h-12 w-full rounded-xl bg-primary font-bold text-white">Copiar pedido</button>
          {message && <p role="status" className="text-sm text-muted">{message}</p>}
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <label className="block text-sm font-semibold text-muted">Resposta da IA
            <textarea value={answer} onChange={e => { setAnswer(e.target.value); setFailed(false); }} rows={6} placeholder="Cole aqui a resposta inteira"
              className={`${INPUT} py-2 text-sm`} />
          </label>
          <button type="button" disabled={!answer.trim()} onClick={read} className="h-12 w-full rounded-xl bg-primary font-bold text-white disabled:opacity-50">Ler plano</button>
          {failed && (
            <div className="space-y-2 rounded-xl border border-danger/40 p-3 text-sm">
              <p>Não encontrei o bloco do plano nessa resposta. Peça à IA para repetir o plano entre [PLANO] e [FIM].</p>
              <button type="button" onClick={() => void copy(AI_FORMAT_REMINDER).then(ok => setMessage(ok ? 'Pedido do formato copiado.' : 'Não foi possível copiar.'))}
                className="h-11 rounded-xl bg-surface-2 px-3 font-semibold">Copiar pedido do formato</button>
            </div>
          )}
          {result && (
            <div className="space-y-3">
              <p className="font-semibold">{plural(result.dayCount, 'dia de treino', 'dias de treino')} · {plural(result.exerciseCount, 'exercício', 'exercícios')}</p>
              {[...warnings, ...result.notes].length > 0 && (
                <ul className="space-y-1 rounded-xl bg-warning/10 p-3 text-sm text-warning">
                  {[...warnings, ...result.notes].map(n => <li key={n}>{n}</li>)}
                </ul>
              )}
              <ul className="space-y-2">
                {DAY_KEYS.filter(k => result.plan.days[k].exercises.length).map(k => {
                  const day = result.plan.days[k];
                  return (
                    <li key={k} className="rounded-xl bg-surface-2 p-3 text-sm">
                      <p className="font-semibold">{day.name}</p>
                      {day.focus && <p className="text-muted">{day.focus}</p>}
                      <p className="mt-1 text-muted">{day.exercises.map(e => e.name).join(' · ')}</p>
                    </li>
                  );
                })}
              </ul>
              <label className="block text-sm font-semibold text-muted">Nome do plano
                <input value={name} onChange={e => setName(e.target.value)} className={`${INPUT} h-12`} />
              </label>
              <button type="button" disabled={!name.trim()} onClick={create} className="h-12 w-full rounded-xl bg-primary font-bold text-white disabled:opacity-50">Criar plano</button>
            </div>
          )}
          {message && <p role="status" className="text-sm text-success">{message}</p>}
        </div>
      )}
    </Sheet>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-11 items-center gap-3">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="size-5 shrink-0 accent-[var(--color-primary)]" />
      <span className="text-sm">{label}</span>
    </label>
  );
}
