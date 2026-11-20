// Z1: a aba Protocolo do Progresso: doses de hoje, protocolos, próximos dias, diário e exames.
import { useState } from 'react';
import { toDateKey } from '../../domain/dates';
import type { DoseLog, HealthEntry, HealthEntryKind, Protocol } from '../../domain/model';
import {
  adherence, canReopen, clearProtocolData, EXAM_INTERVALS, examSchedule, deleteDose, deleteHealthEntry, deleteProtocol, doctorSummary, doseList, doseText, endProtocol, examMarkers,
  healthList, itemLine, lastExamDate, missedDoses, pressureHigh, protocolKindLabel, itemSchedule, protocolStatus, reopenProtocol, routeShort, siteLabel, slotLabel, doseVolume, volumeText, upcomingDoses
} from '../../domain/protocol';
import { updateSettings } from '../../domain/actions';
import { useAppStore } from '../../store';
import { useNow } from '../../hooks/use-now';
import { Icon } from '../../ui/Icon';
import { formatNumber, plural, relativeDate, shortDate } from '../../ui/format';
import { CurveCard } from './CurveCard';
import { DoseRemindersCard } from './DoseRemindersCard';
import { DoseSheet, type DoseTarget } from './DoseSheet';
import { TodayDoses } from './TodayDoses';
import { HealthSheet } from './HealthSheet';
import { ProtocolEditor } from './ProtocolEditor';

const CARD = 'rounded-2xl border border-line bg-surface p-4';
const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

export function ProtocolView() {
  const data = useAppStore(s => s.data);
  const run = useAppStore(s => s.run);
  const today = toDateKey(new Date(useNow(60_000)));
  const [editing, setEditing] = useState<Protocol | 'new' | null>(null);
  const [dose, setDose] = useState<DoseTarget | 'avulsa' | null>(null);
  const [health, setHealth] = useState<HealthEntryKind | null>(null);
  // Z6: corrigir uma dose ou um registro do diário
  const [fixDose, setFixDose] = useState<DoseLog | null>(null);
  const [fixHealth, setFixHealth] = useState<HealthEntry | null>(null);
  const [copied, setCopied] = useState(false);
  const [showAll, setShowAll] = useState(false);
  if (!data) return null;
  const protocols = Object.values(data.protocols ?? {}).sort((a, b) => b.startDate.localeCompare(a.startDate));
  const current = protocols.filter(p => !protocolStatus(p, today).ended);
  const past = protocols.filter(p => protocolStatus(p, today).ended);
  const upcoming = upcomingDoses(data, today, 7);
  const missed = missedDoses(data, today, 3);
  const journal: { date: string; sort: string; dose?: DoseLog; health?: HealthEntry }[] = [
    ...doseList(data).map(d => ({ date: d.date, sort: d.at, dose: d })),
    ...healthList(data).map(h => ({ date: h.date, sort: h.date, health: h }))
  ];
  journal.sort((a, b) => (a.date !== b.date ? b.date.localeCompare(a.date) : b.sort.localeCompare(a.sort)));
  const markers = examMarkers(data);
  const lastExam = lastExamDate(data);
  const copy = async () => {
    try { await navigator.clipboard.writeText(doctorSummary(data, today)); setCopied(true); } catch { setCopied(false); }
  };

  return (
    <div className="mt-4 space-y-4">
      <p className="rounded-2xl bg-surface-2 px-4 py-3 text-sm text-muted">
        Histórico e controle para quem já faz uso. O app não incentiva o uso nem indica substâncias ou doses: o acompanhamento é com o seu médico, com exames em dia.
      </p>

      <TodayDoses onRegister={setDose} />
      {missed.length > 0 && (
        <section aria-label="Doses sem registro" className="rounded-2xl border border-warning/60 bg-surface p-4">
          <h2 className="font-bold">Sem registro nos últimos dias</h2>
          <ul className="mt-2 space-y-1">
            {missed.map(m => (
              <li key={`${m.protocol.id}-${m.item.id}-${m.date}-${m.slot}`} className="flex min-h-11 items-center justify-between gap-2 text-sm">
                <span className="min-w-0"><span className="font-semibold">{m.item.name}</span>{m.of > 1 ? ` (${slotLabel(m.slot, m.of)})` : ''} · {WEEKDAYS[new Date(`${m.date}T12:00`).getDay()]}, {shortDate(m.date)}</span>
                <button type="button" onClick={() => setDose({ protocolId: m.protocol.id, item: m.item, date: m.date, slot: m.slot, of: m.of })} className="h-10 shrink-0 rounded-xl bg-surface-2 px-3 font-semibold">Registrar</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Protocolos" className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold">Protocolos</h2>
          <button type="button" onClick={() => setEditing('new')} className="h-11 rounded-xl bg-primary px-4 font-bold text-white">+ Novo</button>
        </div>
        {!protocols.length && <p className={`${CARD} text-muted`}>Nenhum protocolo ainda. Cadastre o que você já usa, com a dose e a frequência; o app mostra o que é de hoje e guarda o histórico.</p>}
        {current.map(p => <ProtocolCard key={p.id} p={p} today={today} onEdit={() => setEditing(p)} />)}
        {past.length > 0 && (
          <details className={CARD}>
            <summary className="min-h-8 cursor-pointer font-semibold">Encerrados ({past.length})</summary>
            <div className="mt-3 space-y-3">{past.map(p => <ProtocolCard key={p.id} p={p} today={today} onEdit={() => setEditing(p)} />)}</div>
          </details>
        )}
      </section>

      {current.length > 0 && <DoseRemindersCard protocols={current} />}

      {protocols.length > 0 && <CurveCard protocols={[...current, ...past]} />}

      {upcoming.length > 0 && (
        <section aria-label="Próximos 7 dias" className={CARD}>
          <h2 className="font-bold">Próximos 7 dias</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {upcoming.map(u => (
              <li key={u.date} className="flex gap-2">
                <span className="w-24 shrink-0 font-semibold">{WEEKDAYS[new Date(`${u.date}T12:00`).getDay()]} {Number(u.date.slice(8))}</span>
                <span className="min-w-0 text-muted">{u.doses.filter(d => d.slot === 0).map(d => `${d.item.name} ${doseText(d.item.dose, d.item.unit)}${d.of > 1 ? ` ${d.of}×` : ''}`).join(' · ')}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Diário" className={CARD}>
        <h2 className="font-bold">Diário</h2>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setDose('avulsa')} className="h-11 rounded-xl bg-surface-2 text-sm font-semibold">+ Dose avulsa</button>
          <button type="button" onClick={() => setHealth('sintomas')} className="h-11 rounded-xl bg-surface-2 text-sm font-semibold">+ Sintomas</button>
          <button type="button" onClick={() => setHealth('pressao')} className="h-11 rounded-xl bg-surface-2 text-sm font-semibold">+ Pressão</button>
          <button type="button" onClick={() => setHealth('exame')} className="h-11 rounded-xl bg-surface-2 text-sm font-semibold">+ Exame</button>
          <button type="button" onClick={() => setHealth('nota')} className="col-span-2 h-11 rounded-xl bg-surface-2 text-sm font-semibold">+ Anotação</button>
        </div>
        {journal.length === 0 ? <p className="mt-3 text-sm text-muted">As doses registradas, os sintomas, a pressão e os exames aparecem aqui.</p> : (
          <ul aria-label="Registros do diário" className="mt-3 divide-y divide-line">
            {(showAll ? journal : journal.slice(0, 12)).map(j => j.dose
              ? <DoseItem key={`d-${j.dose.id}`} d={j.dose} onEdit={() => setFixDose(j.dose!)} onDelete={() => { if (confirm(`Apagar a dose de ${j.dose!.name} de ${shortDate(j.dose!.date)}?`)) run((x, now) => deleteDose(x, j.dose!.id, now)); }} />
              : <HealthItem key={`h-${j.health!.id}`} e={j.health!} onEdit={() => setFixHealth(j.health!)} onDelete={() => { if (confirm(`Apagar o registro de ${shortDate(j.health!.date)}?`)) run((x, now) => deleteHealthEntry(x, j.health!.id, now)); }} />)}
          </ul>
        )}
        {journal.length > 12 && <button type="button" onClick={() => setShowAll(!showAll)} className="mt-2 h-11 font-semibold text-primary">{showAll ? 'Mostrar menos' : `Ver tudo (${journal.length})`}</button>}
      </section>

      <section aria-label="Exames" className={CARD}>
        <h2 className="font-bold">Exames</h2>
        {!markers.length ? <p className="mt-1 text-sm text-muted">Registre os resultados dos exames de sangue para acompanhar cada valor ao longo do tempo.</p> : (
          <>
            <p className="mt-1 text-sm text-muted">Último exame {relativeDate(lastExam!, today)}. Os valores de referência variam por laboratório: compare com o seu laudo.</p>
            <ul className="mt-2 space-y-1 text-sm">
              {markers.map(m => (
                <li key={m.name} className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold">{m.name}</span>
                  <span className="text-right">
                    {formatNumber(m.last.value)} {m.unit}
                    {m.previous && <span className="text-faint"> (antes {formatNumber(m.previous.value)}{m.last.value > m.previous.value ? ' ↑' : m.last.value < m.previous.value ? ' ↓' : ''})</span>}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
        <ExamInterval today={today} />
      </section>

      {(protocols.length > 0 || journal.length > 0) && (
        <section className={`${CARD} space-y-2`}>
          <h2 className="font-bold">Levar à consulta</h2>
          <p className="text-sm text-muted">Copia um resumo com o que está em uso, as doses registradas, a pressão, os sintomas e os últimos exames.</p>
          <button type="button" onClick={() => void copy()} className="h-11 w-full rounded-xl bg-surface-2 font-semibold">{copied ? 'Resumo copiado' : 'Copiar resumo'}</button>
        </section>
      )}

      {(protocols.length > 0 || journal.length > 0) && (
        <button type="button" onClick={() => { if (confirm('Apagar todos os protocolos, doses e registros do diário? Não dá para desfazer.')) run((x, now) => clearProtocolData(x, now)); }}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl font-semibold text-danger">
          <Icon name="lixo" className="size-5" />Apagar todos os dados do protocolo
        </button>
      )}
      <p className="text-xs text-faint">Fica só neste aparelho e nos backups que você fizer. Para esconder esta aba, desligue em Perfil → Saúde.</p>

      {editing && <ProtocolEditor {...(editing !== 'new' ? { initial: editing } : {})} onClose={() => setEditing(null)} />}
      {dose && <DoseSheet {...(dose !== 'avulsa' ? { target: dose } : {})} onClose={() => setDose(null)} />}
      {health && <HealthSheet kind={health} onClose={() => setHealth(null)} />}
      {fixDose && <DoseSheet editing={fixDose} onClose={() => setFixDose(null)} />}
      {fixHealth && <HealthSheet kind={fixHealth.kind} editing={fixHealth} onClose={() => setFixHealth(null)} />}
    </div>
  );
}

function ProtocolCard({ p, today, onEdit }: { p: Protocol; today: string; onEdit: () => void }) {
  const run = useAppStore(s => s.run);
  const doses = useAppStore(s => s.data?.doses);
  const s = protocolStatus(p, today);
  const a = adherence({ ...(doses ? { doses } : {}) }, p, today);
  const when = s.future ? `Começa em ${shortDate(p.startDate)}`
    : s.ended ? `${shortDate(p.startDate)} a ${shortDate(s.end!)}`
      : `Semana ${s.week}${s.totalWeeks ? ` de ${s.totalWeeks}` : ''}${s.daysLeft !== null ? ` · ${s.daysLeft === 0 ? 'termina hoje' : `faltam ${plural(s.daysLeft, 'dia', 'dias')}`}` : ' · contínuo'}`;
  return (
    <article aria-label={p.name} className={CARD}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-bold">{p.name}</h3>
          <p className="text-sm text-muted">{protocolKindLabel(p.kind)} · {when}</p>
        </div>
        <button type="button" onClick={onEdit} aria-label={`Editar ${p.name}`} className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted"><Icon name="editar" className="size-5" /></button>
      </div>
      {s.totalWeeks && !s.future && (
        <div className="mt-2 h-2 rounded-full bg-surface-2" role="img" aria-label={`Semana ${s.week} de ${s.totalWeeks}`}>
          <span className="block h-2 rounded-full bg-primary" style={{ width: `${Math.min(100, (s.week / s.totalWeeks) * 100)}%` }} />
        </div>
      )}
      <ul className="mt-3 space-y-1 text-sm">
        {p.items.map(i => <li key={i.id} title={itemLine(i)}><span className="font-semibold">{i.name}</span> · {doseText(i.dose, i.unit)}{doseVolume(i.dose, i.unit, i.perMl) !== null ? ` (${volumeText(doseVolume(i.dose, i.unit, i.perMl)!)})` : ''} {itemSchedule(i)} · {routeShort(i.route)}{i.fromWeek || i.toWeek ? ` · semanas ${i.fromWeek ?? 1}${i.toWeek ? `–${i.toWeek}` : '+'}` : ''}</li>)}
      </ul>
      {a.due > 0 && <p className="mt-2 text-sm text-muted">{a.taken} de {plural(a.due, 'dose registrada', 'doses registradas')} até hoje</p>}
      {p.note && <p className="mt-1 text-sm italic text-muted">{p.note}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        {/* protocolo que ainda não começou não se encerra: apaga ou muda a data */}
        {!s.ended && !s.future && !p.endedOn && <button type="button" onClick={() => { if (confirm(`Encerrar ${p.name} hoje?`)) run((d, now) => endProtocol(d, p.id, today, now)); }} className="h-10 rounded-xl bg-surface-2 px-3 text-sm font-semibold">Encerrar hoje</button>}
        {canReopen(p, today) && <button type="button" onClick={() => run((d, now) => reopenProtocol(d, p.id, today, now))} className="h-10 rounded-xl bg-surface-2 px-3 text-sm font-semibold">Reabrir</button>}
        <button type="button" onClick={() => { if (confirm(`Apagar ${p.name}? As doses registradas continuam no diário.`)) run((d, now) => deleteProtocol(d, p.id, now)); }} className="h-10 rounded-xl px-3 text-sm font-semibold text-danger">Apagar</button>
      </div>
    </article>
  );
}

function DoseItem({ d, onEdit, onDelete }: { d: DoseLog; onEdit: () => void; onDelete: () => void }) {
  return (
    <li className="flex min-h-12 items-center gap-2 py-1">
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{d.name} · {doseText(d.dose, d.unit)}</p>
        <p className="text-sm text-muted">{shortDate(d.date)} · {routeShort(d.route)}{d.site ? ` · ${siteLabel(d.site).toLowerCase()}` : ''}{d.slot ? ` · ${d.slot + 1}ª do dia` : ''}{d.protocolId ? '' : ' · avulsa'}{d.note ? ` · ${d.note}` : ''}</p>
      </div>
      <button type="button" aria-label={`Corrigir dose de ${d.name} de ${shortDate(d.date)}`} onClick={onEdit} className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted"><Icon name="editar" className="size-5" /></button>
      <button type="button" aria-label={`Apagar dose de ${d.name} de ${shortDate(d.date)}`} onClick={onDelete} className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted"><Icon name="lixo" className="size-5" /></button>
    </li>
  );
}

function HealthItem({ e, onEdit, onDelete }: { e: HealthEntry; onEdit: () => void; onDelete: () => void }) {
  const title = e.kind === 'pressao' && e.pressure ? `Pressão ${e.pressure.sys}/${e.pressure.dia}${e.pressure.pulse ? ` · pulso ${e.pressure.pulse}` : ''}`
    : e.kind === 'exame' ? `Exame: ${(e.exam ?? []).map(x => `${x.name} ${formatNumber(x.value)} ${x.unit}`.trim()).join(', ')}`
      : e.kind === 'sintomas' ? (e.symptoms?.length ? e.symptoms.join(', ') : 'Sintomas') : 'Anotação';
  const high = e.kind === 'pressao' && e.pressure && pressureHigh(e.pressure);
  return (
    <li className="flex min-h-12 items-center gap-2 py-1">
      <div className="min-w-0 flex-1">
        <p className={`font-semibold ${high ? 'text-warning' : ''}`}>{title}{high ? ' · acima de 14 por 9' : ''}</p>
        <p className="text-sm text-muted">{shortDate(e.date)}{e.text ? ` · ${e.text}` : ''}</p>
      </div>
      <button type="button" aria-label={`Corrigir registro de ${shortDate(e.date)}`} onClick={onEdit} className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted"><Icon name="editar" className="size-5" /></button>
      <button type="button" aria-label={`Apagar registro de ${shortDate(e.date)}`} onClick={onDelete} className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted"><Icon name="lixo" className="size-5" /></button>
    </li>
  );
}

/** Z5: de quanto em quanto tempo refazer os exames, e quando é o próximo. */
function ExamInterval({ today }: { today: string }) {
  const data = useAppStore(s => s.data);
  const run = useAppStore(s => s.run);
  if (!data) return null;
  const weeks = data.settings.examEveryWeeks ?? 0;
  const plan = examSchedule(data, today);
  return (
    <div className="mt-3 border-t border-line pt-3">
      <label className="flex min-h-11 items-center justify-between gap-3 text-sm font-semibold">
        <span>Lembrar de refazer os exames</span>
        <select aria-label="Refazer os exames a cada" value={weeks} onChange={e => run((d, t) => updateSettings(d, { examEveryWeeks: Number(e.target.value) }, t))}
          className="h-11 rounded-xl border border-line bg-surface-2 px-3 text-base text-ink">
          <option value={0}>Não lembrar</option>
          {EXAM_INTERVALS.map(w => <option key={w} value={w}>a cada {w} semanas</option>)}
        </select>
      </label>
      {weeks > 0 && (
        <p data-testid="proximo-exame" className={`mt-1 text-sm ${plan.overdue ? 'font-semibold text-warning' : 'text-muted'}`}>
          {!plan.due ? 'Registre o primeiro exame para o app saber quando lembrar.'
            : plan.overdue ? `Passou da hora: o último foi em ${shortDate(plan.last!)}, há mais de ${weeks} semanas.`
              : `Próximo: até ${shortDate(plan.due)} (${plan.daysLeft === 1 ? 'amanhã' : `em ${plan.daysLeft} dias`}).`}
        </p>
      )}
    </div>
  );
}

