import { useState } from 'react';
import type { Workout } from '../../domain/model';
import { workoutCard } from '../../domain/workout-card';
import { shareImage } from '../../platform/share-image';
import { useAppStore } from '../../store';
import { ACCENTS } from '../../ui/theme';
import { workoutCardBlob } from './workout-card-image';

const APP_NAME = 'Treino Personalizado';

/** S9: o treino como imagem (cartão com números, exercícios e recordes) para mandar ou postar. */
export function ShareImageButton({ w, primary = false }: { w: Workout; primary?: boolean }) {
  const workouts = useAppStore(s => s.data?.workouts);
  const accentId = useAppStore(s => s.data?.settings.accent ?? 'azul');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const share = async () => {
    setBusy(true);
    setStatus('');
    try {
      const accent = ACCENTS.find(a => a.id === accentId)?.hex ?? ACCENTS[0]!.hex;
      const blob = await workoutCardBlob(workoutCard(workouts ?? [w], w), accent, APP_NAME);
      const result = await shareImage(blob, `treino-${w.date}.png`, w.dayName?.trim() || 'Treino');
      if (result === 'saved') setStatus('Imagem salva nos downloads.');
    } catch {
      setStatus('Não foi possível gerar a imagem.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <button type="button" onClick={() => void share()} disabled={busy}
        className={`h-11 rounded-xl px-4 font-semibold disabled:opacity-60 ${primary ? 'bg-primary text-white' : 'bg-surface-2'}`}>
        {busy ? 'Gerando imagem…' : 'Compartilhar como imagem'}
      </button>
      {status && <p role="status" className="w-full text-center text-sm text-muted">{status}</p>}
    </>
  );
}
