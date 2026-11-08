// V4: "Sua semana" e "Seu mês" no Início, nos primeiros dias da semana e do mês seguintes. O ×
// fecha aquele resumo; Perfil → Aparência desliga todos. A imagem usa o desenho da retrospectiva.
import { useState } from 'react';
import { recapsFor, type Recap } from '../../domain/recap';
import type { ReviewSlide } from '../../domain/year-review';
import { useToday } from '../../hooks/use-today';
import { shareImage } from '../../platform/share-image';
import { useAppStore } from '../../store';
import { formatNumber, plural } from '../../ui/format';
import { Icon } from '../../ui/Icon';
import { APP_NAME } from '../progress/ShareImageButton';
import { slideBlob } from '../year-review/review-image';

const keyOf = (r: Recap) => `tp-resumo-${r.kind}-${r.id}`;
const isClosed = (r: Recap) => { try { return localStorage.getItem(keyOf(r)) === '1'; } catch { return false; } };
const close = (r: Recap) => { try { localStorage.setItem(keyOf(r), '1'); } catch { /* sem armazenamento: aparece de novo */ } };

const volumeText = (kg: number) => (kg >= 1000 ? `${formatNumber(Math.round(kg / 100) / 10)} t` : `${formatNumber(kg)} kg`);
const title = (r: Recap) => (r.kind === 'semana' ? 'Sua semana' : 'Seu mês');

/** O resumo como uma tela da retrospectiva, para a imagem 9:16. */
export function recapSlide(r: Recap): ReviewSlide {
  const stats: [string, string][] = [['Treinos', String(r.workouts)], ['Volume', volumeText(r.volume)]];
  if (r.records) stats.push(['Recordes', String(r.records)]);
  if (r.topGroup) stats.push(['Mais treinado', r.topGroup]);
  return { id: `${r.kind}-${r.id}`, eyebrow: r.label, big: title(r), text: `${plural(r.days, 'dia', 'dias')} de treino.`, stats, tone: r.kind === 'semana' ? 2 : 4 };
}

function RecapCard({ r, onClose }: { r: Recap; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const share = async () => {
    setBusy(true);
    setStatus('');
    try {
      const result = await shareImage(await slideBlob(recapSlide(r), APP_NAME), `resumo-${r.kind}-${r.id}.png`, `${title(r)} · ${r.label}`);
      if (result === 'saved') setStatus('Imagem salva nos downloads.');
    } catch {
      setStatus('Não foi possível gerar a imagem.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section aria-label={`${title(r)}: ${r.label}`} className="relative rounded-2xl border border-line bg-surface p-4">
      <button type="button" onClick={onClose} aria-label={`Fechar o resumo ${r.kind === 'semana' ? 'da semana' : 'do mês'}`}
        className="absolute right-2 top-2 z-10 flex size-11 items-center justify-center rounded-full text-faint"><Icon name="fechar" className="size-5" /></button>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{title(r)} · {r.label}</p>
      <dl className="mt-2 grid grid-cols-3 gap-2 pr-6">
        <div><dt className="text-xs text-muted">Treinos</dt><dd className="text-2xl font-black tabular-nums">{r.workouts}</dd></div>
        <div><dt className="text-xs text-muted">Volume</dt><dd className="text-2xl font-black tabular-nums">{volumeText(r.volume)}</dd></div>
        <div><dt className="text-xs text-muted">Recordes</dt><dd className="text-2xl font-black tabular-nums">{r.records}</dd></div>
      </dl>
      {r.topGroup && <p className="mt-1 text-sm text-muted">Grupo que mais trabalhou: <span className="font-semibold text-ink">{r.topGroup}</span></p>}
      <button type="button" onClick={() => void share()} disabled={busy} className="mt-3 h-11 rounded-xl bg-surface-2 px-4 font-semibold disabled:opacity-60">
        {busy ? 'Gerando imagem…' : 'Compartilhar'}
      </button>
      {status && <p role="status" className="mt-1 text-sm text-muted">{status}</p>}
    </section>
  );
}

export function RecapCards() {
  const data = useAppStore(s => s.data);
  const today = useToday(s => s.today);
  const [closed, setClosed] = useState<string[]>([]);
  if (!data || data.settings.recaps === false) return null;
  // `today` faz o cartão aparecer e sumir na virada do dia
  void today;
  const recaps = recapsFor(data, new Date()).filter(r => !isClosed(r) && !closed.includes(keyOf(r)));
  if (!recaps.length) return null;
  return <>{recaps.map(r => <RecapCard key={keyOf(r)} r={r} onClose={() => { close(r); setClosed(c => [...c, keyOf(r)]); }} />)}</>;
}
