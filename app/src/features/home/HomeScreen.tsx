import { useState } from 'react';
import { addWater, logWeight, toggleCheckin } from '../../domain/actions';
import { toDateKey } from '../../domain/dates';
import { progressCard, todayCard, waterCard, weekStrip, weightCard, type WeightCard as WeightData } from '../../domain/home';
import { useAppStore } from '../../store';
import { useUiStore } from '../../store/ui-store';
import { askRestAlarmPermission } from '../workout/rest-alarm-instance';
import { HomeNotices } from './HomeNotices';
import { TemplateSheet } from '../plan/TemplateSheet';
import { NumberField } from '../../ui/NumberField';
import { Sheet } from '../../ui/Sheet';
import { formatNumber, plural, shortDate } from '../../ui/format';
import { DAY_FULL_NAMES } from '../../domain/model';

function greeting(now: Date): string {
  const h = now.getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

export function HomeScreen() {
  const data = useAppStore(s => s.data);
  const session = useAppStore(s => s.session);
  if (!data) return null;
  const now = new Date();
  const name = data.profile.name.trim().split(/\s+/)[0];

  return (
    <div className="space-y-4 pt-6">
      <header>
        <p className="text-muted">{greeting(now)}{name ? `, ${name}` : ''}</p>
        <h1 className="text-3xl font-black tracking-tight">Início</h1>
      </header>
      <HomeNotices />
      <WeekStrip />
      <TodayCard card={todayCard(data, now, session)} />
      <ProgressSection />
      <WeightSection card={weightCard(data)} />
      <WaterSection />
    </div>
  );
}

/** N6: semana com os dias treinados e hoje em destaque. */
function WeekStrip() {
  const data = useAppStore(s => s.data)!;
  const days = weekStrip(data, new Date());
  return (
    <section aria-label="Esta semana" className="rounded-2xl border border-line bg-surface p-3">
      <ol className="grid grid-cols-7 gap-1 text-center">
        {days.map(d => (
          <li key={d.date} aria-label={`${DAY_FULL_NAMES[d.dayKey]} ${d.dayOfMonth}${d.trained ? ', treinou' : d.planned && !d.future ? ', não treinou' : ''}${d.today ? ', hoje' : ''}`}
            className={`flex flex-col items-center gap-1 rounded-xl py-2 ${d.today ? 'bg-surface-2' : ''}`}>
            <span className={`text-xs font-semibold ${d.today ? 'text-ink' : 'text-faint'}`}>{d.letter}</span>
            <span className={`text-base font-bold tabular-nums ${d.today ? 'text-ink' : 'text-muted'}`}>{d.dayOfMonth}</span>
            <span aria-hidden="true" className={`size-2 rounded-full ${d.trained ? 'bg-success' : d.planned ? 'border border-line' : 'bg-transparent'}`} />
          </li>
        ))}
      </ol>
    </section>
  );
}

function TodayCard({ card }: { card: ReturnType<typeof todayCard> }) {
  const setTab = useUiStore(s => s.setTab);
  const start = useAppStore(s => s.startWorkout);
  const run = useAppStore(s => s.run);
  const data = useAppStore(s => s.data)!;
  const [templatesOpen, setTemplatesOpen] = useState(false);

  if (card.kind === 'no-plan') {
    return (
      <section className="rounded-2xl border border-primary bg-surface p-4">
        <h2 className="text-lg font-bold">Comece pelo seu plano</h2>
        <p className="mt-1 text-muted">Escolha um modelo pronto para o app montar o seu dia; dá para ajustar tudo depois.</p>
        <button type="button" onClick={() => setTemplatesOpen(true)} className="mt-4 h-12 w-full rounded-xl bg-primary text-base font-bold text-white">Escolher um modelo</button>
        <TemplateSheet open={templatesOpen} onClose={() => setTemplatesOpen(false)} />
      </section>
    );
  }
  if (card.kind === 'in-progress') {
    return (
      <section className="rounded-2xl border border-primary bg-surface p-4">
        <p className="text-xs font-semibold text-muted">Treino em andamento</p>
        <h2 className="text-lg font-bold">{card.title}</h2>
        <p className="text-sm text-muted">{card.setsDone} de {plural(card.setsTotal, 'série', 'séries')}</p>
        <button type="button" onClick={() => setTab('treino')} className="mt-4 h-12 w-full rounded-xl bg-primary text-base font-bold text-white">Continuar treino</button>
      </section>
    );
  }
  if (card.kind === 'rest') {
    return (
      <section className="rounded-2xl border border-line bg-surface p-4">
        <p className="text-xs font-semibold text-muted">Hoje</p>
        <h2 className="text-lg font-bold">Dia de descanso</h2>
        {card.next && (
          <p className="mt-1 text-muted">
            Próximo treino {card.next.inDays === 1 ? 'amanhã' : `em ${card.next.inDays} dias`}: {card.next.title}
          </p>
        )}
      </section>
    );
  }
  const checkedIn = card.doneToday;
  return (
    <section className={`rounded-2xl border bg-surface p-4 ${checkedIn ? 'border-success/60' : 'border-primary'}`}>
      <p className="text-xs font-semibold text-muted">Hoje{card.optional ? ' · opcional' : ''}</p>
      <h2 className="text-lg font-bold leading-snug">{card.title}</h2>
      <p className="text-sm text-muted">{plural(card.exercises, 'exercício', 'exercícios')}{card.focus ? ` · ${card.focus}` : ''}</p>
      {checkedIn ? (
        <p className="mt-3 font-semibold text-success">Treino de hoje feito.</p>
      ) : (
        <>
          <button type="button" onClick={() => { askRestAlarmPermission(); if (data.activePlanId && start(data.activePlanId, card.dayKey)) setTab('treino'); }}
            className="mt-4 h-12 w-full rounded-xl bg-primary text-base font-bold text-white">
            Começar treino
          </button>
          <button type="button" onClick={() => run((d, now) => toggleCheckin(d, card.dayKey, now))}
            className="mt-2 h-11 w-full rounded-xl text-sm font-semibold text-muted">
            Já treinei hoje, só marcar presença
          </button>
        </>
      )}
      {checkedIn && (
        <button type="button" onClick={() => run((d, now) => toggleCheckin(d, card.dayKey, now))} className="mt-1 h-11 text-sm font-semibold text-faint">
          Desfazer presença de hoje
        </button>
      )}
    </section>
  );
}

/** N8: sequência, semana e nível em números grandes. */
function ProgressSection() {
  const data = useAppStore(s => s.data)!;
  const card = progressCard(data, new Date());
  const levelPct = card.level.xpToNext ? Math.round((card.level.xpIntoLevel / card.level.xpToNext) * 100) : 100;
  return (
    <section aria-label="Progresso" className="rounded-2xl border border-line bg-surface p-4">
      <dl className="grid grid-cols-3 gap-2 text-center">
        <div><dt className="text-xs font-semibold text-muted">Sequência</dt><dd className="text-2xl font-black tabular-nums">{card.streak}</dd></div>
        <div><dt className="text-xs font-semibold text-muted">Semana</dt><dd className="text-2xl font-black tabular-nums">{card.weekDone}/{card.weekTarget}</dd></div>
        <div><dt className="text-xs font-semibold text-muted">Treinos</dt><dd className="text-2xl font-black tabular-nums">{card.totalWorkouts}</dd></div>
      </dl>
      <p className="mt-3 text-center text-sm text-muted">
        {card.freeMealUnlocked ? 'Refeição livre liberada nesta semana.'
          : `Faltam ${plural(card.freeMealMissing, 'treino', 'treinos')} para liberar a refeição livre.`}
      </p>
      <div className="mt-3">
        <div className="flex justify-between text-sm"><span className="font-bold">Nível {card.level.level}</span><span className="text-muted tabular-nums">{card.level.xpIntoLevel}/{card.level.xpToNext} XP</span></div>
        <div className="mt-1 h-2 rounded-full bg-surface-2" aria-hidden="true"><div className="h-2 rounded-full bg-success" style={{ width: `${levelPct}%` }} /></div>
      </div>
    </section>
  );
}

/** N7: peso com variação, meta e registro direto. */
function WeightSection({ card }: { card: WeightData | null }) {
  const run = useAppStore(s => s.run);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(card?.current ?? 70);
  const save = () => { run((d, now) => logWeight(d, value, toDateKey(now), now)); setOpen(false); };
  const deltaTone = card?.towardGoal === null || card?.towardGoal === undefined ? 'text-muted' : card.towardGoal ? 'text-success' : 'text-danger';

  return (
    <section aria-label="Peso" className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-muted">Peso</p>
          {card ? (
            <p className="text-3xl font-black tabular-nums">{formatNumber(card.current)} <span className="text-base font-bold text-muted">kg</span></p>
          ) : <p className="mt-1 text-muted">Nenhuma pesagem ainda.</p>}
          {card?.delta !== null && card?.delta !== undefined && (
            <p className={`text-sm font-semibold ${deltaTone}`}>{card.delta > 0 ? '+' : ''}{formatNumber(card.delta)} kg desde a anterior</p>
          )}
        </div>
        <button type="button" onClick={() => { setValue(card?.current ?? 70); setOpen(true); }} className="h-11 shrink-0 rounded-xl bg-surface-2 px-4 font-bold">+ Registrar</button>
      </div>
      {card && card.target !== null && (
        <p className="mt-2 text-sm text-muted">
          Meta {formatNumber(card.target)} kg · faltam {formatNumber(card.remaining ?? 0)} kg{card.goalPercent !== null ? ` · ${card.goalPercent}% do caminho` : ''}
        </p>
      )}
      {card && card.points.length >= 2 && <WeightChart points={card.points} target={card.target} />}
      <Sheet title="Registrar peso" open={open} onClose={() => setOpen(false)}>
        <label className="block text-sm font-semibold text-muted">Peso de hoje (kg)
          <NumberField label="Peso de hoje em kg" decimal value={value} onChange={setValue} className="mt-1" />
        </label>
        <button type="button" onClick={save} className="mt-4 h-12 w-full rounded-xl bg-primary text-base font-bold text-white">Salvar</button>
      </Sheet>
    </section>
  );
}

function WeightChart({ points, target }: { points: { date: string; weight: number }[]; target: number | null }) {
  const W = 300, H = 90, PAD = 8;
  const values = [...points.map(p => p.weight), ...(target ? [target] : [])];
  const min = Math.min(...values) - 0.5, max = Math.max(...values) + 0.5;
  const x = (i: number) => PAD + (i / (points.length - 1)) * (W - 2 * PAD);
  const y = (v: number) => PAD + (1 - (v - min) / (max - min)) * (H - 2 * PAD);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.weight).toFixed(1)}`).join(' ');
  const last = points[points.length - 1]!;
  return (
    <figure className="mt-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-24 w-full" role="img" aria-label={`Peso nas últimas ${points.length} pesagens, de ${formatNumber(points[0]!.weight)} a ${formatNumber(last.weight)} kg`}>
        {target && <line x1={PAD} x2={W - PAD} y1={y(target)} y2={y(target)} stroke="var(--color-success)" strokeDasharray="4 4" strokeWidth={1.5} />}
        <path d={path} fill="none" stroke="var(--color-primary)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(points.length - 1)} cy={y(last.weight)} r={4} fill="var(--color-primary)" />
      </svg>
      <figcaption className="flex justify-between text-xs text-faint"><span>{shortDate(points[0]!.date)}</span>{target && <span className="text-success">— meta</span>}<span>{shortDate(last.date)}</span></figcaption>
    </figure>
  );
}

/** Água do dia com atalhos de copo e garrafa (O22). */
function WaterSection() {
  const data = useAppStore(s => s.data)!;
  const run = useAppStore(s => s.run);
  const card = waterCard(data, new Date());
  if (!card) return null;
  const add = (ml: number) => run((d, now) => addWater(d, ml, now));
  return (
    <section aria-label="Água" className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-semibold text-muted">Água hoje</p>
        <p className="text-sm text-muted tabular-nums">{formatNumber(card.ml / 1000)} de {formatNumber(card.target / 1000)} L</p>
      </div>
      <div className="mt-2 h-2 rounded-full bg-surface-2" aria-hidden="true"><div className="h-2 rounded-full bg-info" style={{ width: `${card.percent}%` }} /></div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <button type="button" onClick={() => add(-250)} disabled={card.ml === 0} className="h-11 rounded-xl bg-surface-2 font-bold disabled:opacity-40">−250 ml</button>
        <button type="button" onClick={() => add(250)} className="h-11 rounded-xl bg-surface-2 font-bold">+ Copo</button>
        <button type="button" onClick={() => add(500)} className="h-11 rounded-xl bg-surface-2 font-bold">+ Garrafa</button>
      </div>
    </section>
  );
}
