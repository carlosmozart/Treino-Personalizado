// W2: check-in do dia no começo do treino (Perfil → Treino liga). Num dia puxado, oferece ir mais
// leve hoje: 10% a menos na carga ou uma série a menos; o treino fica fora da progressão.
import { useState } from 'react';
import { updateSettings } from '../../domain/actions';
import { FORM_FIELDS, roughDay } from '../../domain/daily-form';
import type { DailyForm, LightKind } from '../../domain/model';
import { lightenSession, setSessionForm, type ActiveSession } from '../../domain/session';
import { useAppStore } from '../../store';

const LIGHT_TEXT: Record<LightKind, string> = {
  carga: '10% a menos na carga das séries que faltam',
  series: 'uma série a menos em cada exercício'
};

export function DailyFormNotice({ session }: { session: ActiveSession }) {
  const data = useAppStore(s => s.data);
  const run = useAppStore(s => s.run);
  const update = useAppStore(s => s.updateSession);
  const [form, setForm] = useState<DailyForm>({});
  const [offer, setOffer] = useState(false);
  if (!data || session.backdated) return null;

  if (session.light) {
    return (
      <p role="status" className="mt-3 rounded-2xl bg-surface-2 p-3 text-sm">
        <span className="font-semibold">Treino mais leve hoje:</span> {LIGHT_TEXT[session.light]}. Ele fica no histórico, mas não conta para a progressão.
      </p>
    );
  }
  if (offer && session.form) {
    const go = (kind: LightKind) => { update(s => lightenSession(s, kind, data.settings)); setOffer(false); };
    return (
      <section aria-label="Ir mais leve hoje" className="mt-3 rounded-2xl border border-warning/60 bg-surface p-4">
        <h2 className="font-bold">Dia puxado. Quer ir mais leve hoje?</h2>
        <p className="mt-1 text-sm text-muted">Só hoje: o treino fica fora da progressão, e as próximas cargas continuam de onde estavam.</p>
        <div className="mt-3 grid gap-2">
          <button type="button" onClick={() => go('carga')} className="h-11 rounded-xl bg-primary font-bold text-white">10% a menos na carga</button>
          <button type="button" onClick={() => go('series')} className="h-11 rounded-xl bg-surface-2 font-bold">Uma série a menos</button>
          <button type="button" onClick={() => setOffer(false)} className="h-11 rounded-xl font-semibold text-muted">Treinar normal</button>
        </div>
      </section>
    );
  }
  if (!data.settings.dailyForm || session.form || session.exercises.some(ex => ex.sets.some(x => x.done))) return null;

  const save = () => {
    update(s => setSessionForm(s, form));
    if (roughDay(form)) setOffer(true);
  };
  return (
    <section aria-label="Como você está hoje" className="mt-3 rounded-2xl border border-line bg-surface p-4">
      <h2 className="font-bold">Como você está hoje?</h2>
      <p className="text-sm text-muted">De 1 a 5, tudo opcional.</p>
      <div className="mt-2 space-y-2">
        {FORM_FIELDS.map(f => (
          <div key={f.key}>
            <p className="text-sm font-semibold">{f.label} <span className="font-normal text-faint">(1 {f.low}, 5 {f.high})</span></p>
            <div role="radiogroup" aria-label={f.label} className="mt-1 grid grid-cols-5 gap-1">
              {[1, 2, 3, 4, 5].map(n => {
                const on = form[f.key] === n;
                return (
                  <button key={n} type="button" role="radio" aria-checked={on} aria-label={`${f.label}: ${n}`}
                    onClick={() => setForm(v => { const next = { ...v }; if (on) delete next[f.key]; else next[f.key] = n; return next; })}
                    className={`h-10 rounded-lg text-sm font-bold ${on ? 'bg-primary text-white' : 'bg-surface-2 text-muted'}`}>{n}</button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={save} className="h-11 flex-1 rounded-xl bg-primary font-bold text-white">Pronto</button>
        <button type="button" onClick={() => update(s => setSessionForm(s, {}))} className="h-11 rounded-xl px-3 font-semibold text-muted">Pular</button>
      </div>
      <button type="button" onClick={() => run((d, now) => updateSettings(d, { dailyForm: false }, now))}
        className="mt-1 h-9 text-xs font-semibold text-faint">Não perguntar mais</button>
    </section>
  );
}
