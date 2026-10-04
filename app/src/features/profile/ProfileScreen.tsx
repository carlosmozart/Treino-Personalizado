import { useState, type ReactNode } from 'react';
import { updateProfile } from '../../domain/actions';
import { levelInfo } from '../../domain/gamification';
import { TMB_FORMULAS, type ActivityLevel, type Sex, type TmbFormulaId } from '../../domain/health';
import { healthSummary } from '../../domain/profile-view';
import type { UserProfile } from '../../domain/model';
import { useAppStore } from '../../store';
import { useNow } from '../../hooks/use-now';
import { NumberField } from '../../ui/NumberField';
import { formatNumber } from '../../ui/format';
import { SettingsSection } from './SettingsSection';

const ACTIVITY: Record<ActivityLevel, string> = { sedentario: 'Sedentário', moderado: 'Moderado (3–5 treinos)', intenso: 'Intenso (6–7 treinos)' };
const TONE = { info: 'text-primary', success: 'text-success', warning: 'text-warning', danger: 'text-danger' } as const;

/** Perfil, saúde e configurações (O19, O21). */
export function ProfileScreen() {
  const data = useAppStore(s => s.data);
  const run = useAppStore(s => s.run);
  const now = new Date(useNow(60_000));
  if (!data) return null;
  const p = data.profile;
  const set = (patch: Partial<Omit<UserProfile, 'weighIns' | 'weightKg'>>) => run((d, t) => updateProfile(d, patch, t));
  const h = healthSummary(p, now);
  const level = levelInfo(data.gamification.totalXP);

  return (
    <>
      <h1 className="pt-6 text-3xl font-black tracking-tight">{p.name.trim() || 'Perfil'}</h1>
      <p className="text-muted">{[h.age !== null ? `${h.age} anos` : '', `Nível ${level.level}`, `${data.gamification.totalXP} XP`].filter(Boolean).join(' · ')}</p>

      <Card title="Seus dados">
        <Field label="Nome">
          <input value={p.name} onChange={e => set({ name: e.target.value })} className={INPUT} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nascimento">
            <input type="date" value={p.birthdate} onChange={e => set({ birthdate: e.target.value })} className={INPUT} />
          </Field>
          <Field label="Sexo">
            <select value={p.sex} onChange={e => set({ sex: e.target.value as Sex })} className={INPUT}>
              <option value="">—</option><option value="masculino">Masculino</option><option value="feminino">Feminino</option>
            </select>
          </Field>
          <Field label="Altura (cm)">
            <NumberField label="Altura em cm" value={p.heightCm ?? 0} onChange={n => set({ heightCm: n > 0 ? n : null })} />
          </Field>
          <Field label="% de gordura">
            <NumberField label="Percentual de gordura" decimal value={p.bodyFatPercent ?? 0} onChange={n => set({ bodyFatPercent: n > 0 ? n : null })} />
          </Field>
          <Field label="Meta de peso (kg)">
            <NumberField label="Meta de peso em kg" decimal value={p.weightGoal?.targetWeight ?? p.targetWeightKg ?? 0}
              onChange={n => set(p.weightGoal ? { weightGoal: { ...p.weightGoal, targetWeight: n } } : { targetWeightKg: n > 0 ? n : null })} />
          </Field>
          <Field label="Peso atual">
            <p className="flex h-12 items-center text-base">{h.weightKg ? `${formatNumber(h.weightKg)} kg` : '—'}</p>
          </Field>
        </div>
        <Field label="Atividade">
          <select value={p.activityLevel} onChange={e => set({ activityLevel: e.target.value as ActivityLevel })} className={INPUT}>
            {Object.entries(ACTIVITY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <p className="text-xs text-faint">O peso é registrado na tela de Início, para manter o histórico.</p>
      </Card>

      <Card title="Saúde">
        {h.missing.length > 0 && <p className="text-sm text-warning">Para todos os cálculos, preencha: {h.missing.join(', ')}.</p>}
        <dl className="grid grid-cols-2 gap-3">
          <Stat label="IMC" value={h.bmi ? formatNumber(h.bmi) : '—'}>
            {h.bmiClass && <span className={`text-sm font-semibold ${TONE[h.bmiClass.tone]}`}>{h.bmiClass.label}</span>}
          </Stat>
          <Stat label="Peso saudável" value={h.ideal ? `${formatNumber(h.ideal.min)}–${formatNumber(h.ideal.max)}` : '—'}><span className="text-sm text-muted">kg</span></Stat>
          <Stat label="Metabolismo basal" value={h.tmb ? `${h.tmb}` : '—'}><span className="text-sm text-muted">kcal/dia</span></Stat>
          <Stat label="Gasto diário" value={h.tdee ? `${h.tdee}` : '—'}><span className="text-sm text-muted">kcal com atividade</span></Stat>
          <Stat label="Água" value={h.waterMl ? formatNumber(h.waterMl / 1000) : '—'}><span className="text-sm text-muted">litros por dia</span></Stat>
        </dl>
        <Field label="Fórmula do metabolismo">
          <select value={p.tmbFormula} onChange={e => set({ tmbFormula: e.target.value as TmbFormulaId })} className={INPUT}>
            {Object.entries(TMB_FORMULAS).map(([k, f]) => <option key={k} value={k}>{f.label}{f.recommended ? ' (recomendada)' : ''}</option>)}
          </select>
        </Field>
        <More>
          {h.bmiClass && <p>{h.bmiClass.explain}</p>}
          <p className="mt-2">{TMB_FORMULAS[p.tmbFormula]?.explain}</p>
          <p className="mt-2">O IMC não separa gordura de músculo; use junto com o espelho, as medidas e o % de gordura.</p>
        </More>
      </Card>

      <SettingsSection />
    </>
  );
}

export const INPUT = 'mt-1 h-12 w-full rounded-xl border border-line bg-surface-2 px-3 text-base text-ink';

export function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-4 space-y-3 rounded-2xl border border-line bg-surface p-4">
      <h2 className="text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-sm font-semibold text-muted">{label}{children}</label>;
}

function Stat({ label, value, children }: { label: string; value: string; children?: ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd><span className="block text-2xl font-black">{value}</span>{children}</dd>
    </div>
  );
}

/** Resumo curto com "Saiba mais" expansível (O21). */
function More({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="h-11 font-semibold text-primary">
        {open ? 'Menos' : 'Saiba mais'}
      </button>
      {open && <div className="text-sm text-muted">{children}</div>}
    </div>
  );
}
