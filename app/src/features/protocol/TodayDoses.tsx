// Z1: as doses previstas para hoje. Arquivo pequeno de propósito: o Início usa este cartão, e o
// resto da seção (editor, curva, diário) baixa só quando a aba Protocolo abre.
import { toDateKey } from '../../domain/dates';
import { doseText, doseTime, dosesDue, examSchedule, doseVolume, routeShort, siteLabel, slotLabel, volumeText, type DueDose } from '../../domain/protocol';
import { useAppStore } from '../../store';
import { useNow } from '../../hooks/use-now';
import { Icon } from '../../ui/Icon';
import { plural, shortDate } from '../../ui/format';
import type { DoseTarget } from './DoseSheet';

const CARD = 'rounded-2xl border border-line bg-surface p-4';

/** As doses previstas para hoje, com o registro de cada uma. Também aparece no Início. */
export function TodayDoses({ onRegister, compact = false }: { onRegister: (t: DoseTarget) => void; compact?: boolean }) {
  const data = useAppStore(s => s.data);
  const today = toDateKey(new Date(useNow(60_000)));
  if (!data) return null;
  const due = dosesDue(data, today);
  if (!due.length) return compact ? null : <p className={`${CARD} text-sm text-muted`}>Nenhuma dose prevista para hoje.</p>;
  const left = due.filter(d => !d.taken).length;
  return (
    <section aria-label="Doses de hoje" className={`rounded-2xl border bg-surface p-4 ${left ? 'border-primary' : 'border-success/60'}`}>
      <h2 className="font-bold">{left ? `Hoje: ${plural(left, 'dose', 'doses')} para registrar` : 'Doses de hoje registradas'}</h2>
      <ul className="mt-2 space-y-1">{due.map(d => <DueRow key={`${d.protocol.id}-${d.item.id}-${d.slot}`} d={d} onRegister={onRegister} />)}</ul>
    </section>
  );
}

function DueRow({ d, onRegister }: { d: DueDose; onRegister: (t: DoseTarget) => void }) {
  // Z3: os ml da dose (com a concentração do frasco) e qual das doses do dia
  const ml = doseVolume(d.item.dose, d.item.unit, d.item.perMl);
  const label = `${d.item.name} · ${doseText(d.item.dose, d.item.unit)}${ml !== null ? ` (${volumeText(ml)})` : ''} · ${routeShort(d.item.route)}`;
  // Z4: o horário, quando informado
  const time = doseTime(d.item, d.slot)?.text;
  const which = [d.of > 1 ? slotLabel(d.slot, d.of) : '', time ? `às ${time}` : ''].filter(Boolean).join(' · ');
  return (
    <li className="flex min-h-12 items-center gap-2">
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{label}</span>
        {which && !d.taken && <span className="block text-sm text-muted">{which}</span>}
        {d.taken && <span className="block text-sm text-success">Registrada{which ? ` (${which})` : ''}{d.taken.site ? ` · ${siteLabel(d.taken.site).toLowerCase()}` : ''}</span>}
      </span>
      {d.taken ? <Icon name="check" className="size-6 shrink-0 text-success" />
        : <button type="button" aria-label={`Registrar ${d.item.name}${which ? ` (${which})` : ''}`} onClick={() => onRegister({ protocolId: d.protocol.id, item: d.item, date: d.date, slot: d.slot, of: d.of })}
          className="h-11 shrink-0 rounded-xl bg-primary px-4 font-bold text-white">Registrar</button>}
    </li>
  );
}

/** Z5: no Início, aviso quando passou da hora de refazer os exames (com o intervalo escolhido). */
export function ExamOverdue() {
  const data = useAppStore(s => s.data);
  const today = toDateKey(new Date(useNow(60_000)));
  if (!data) return null;
  const plan = examSchedule(data, today);
  if (!plan.overdue) return null;
  return (
    <section aria-label="Exames de sangue" className="rounded-2xl border border-warning/60 bg-surface p-4">
      <h2 className="font-bold">Hora de refazer os exames</h2>
      <p className="mt-1 text-sm text-muted">O último foi em {shortDate(plan.last!)}. Ao registrar o resultado em Progresso → Protocolo, o aviso some.</p>
    </section>
  );
}

