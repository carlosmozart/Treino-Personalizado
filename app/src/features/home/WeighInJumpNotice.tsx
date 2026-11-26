import type { WeighInJump } from '../../domain/weigh-in-check';
import { formatNumber, shortDate } from '../../ui/format';

/** Y1: aviso antes de salvar uma pesagem que destoa da anterior; "Salvar assim" confirma. */
export function WeighInJumpNotice({ jump, kg, onConfirm }: { jump: WeighInJump; kg: number; onConfirm: () => void }) {
  const pct = Math.round(Math.abs(jump.change) * 100);
  return (
    <div role="alert" className="mt-3 rounded-xl border border-warning/60 bg-warning/10 p-3 text-sm">
      <p className="font-semibold">{formatNumber(kg)} kg é {pct}% {jump.change > 0 ? 'a mais' : 'a menos'} que a pesagem de {shortDate(jump.ref.date)} ({formatNumber(jump.ref.weight)} kg). Está certo?</p>
      <p className="mt-1 text-muted">Se foi engano, corrija o número acima.</p>
      <button type="button" onClick={onConfirm} className="mt-2 h-11 w-full rounded-xl bg-surface-2 font-bold">Salvar assim</button>
    </div>
  );
}
