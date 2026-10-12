import { useState } from 'react';
import type { Workout } from '../../domain/model';
import { workoutAsText } from '../../domain/workout-text';

/** M33: o treino como texto, para colar no WhatsApp. */
export function CopyTextButton({ w }: { w: Workout }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button" className="h-11 rounded-xl bg-surface-2 px-4 font-semibold"
      onClick={() => { navigator.clipboard.writeText(workoutAsText(w)).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }, () => setCopied(false)); }}>
      {copied ? 'Copiado!' : 'Copiar como texto'}
    </button>
  );
}
