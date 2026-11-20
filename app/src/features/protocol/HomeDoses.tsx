// Z1: no Início, as doses de hoje (só com a seção ligada e quando há dose prevista). O painel de
// registrar baixa sob demanda, para a seção não pesar na abertura do app (X14).
import { lazy, Suspense, useState } from 'react';
import { useAppStore } from '../../store';
import type { DoseTarget } from './DoseSheet';
import { ExamOverdue, TodayDoses } from './TodayDoses';

const DoseSheet = lazy(() => import('./DoseSheet').then(m => ({ default: m.DoseSheet })));

export function HomeDoses() {
  const enabled = useAppStore(s => !!s.data?.settings.protocolEnabled);
  const [target, setTarget] = useState<DoseTarget | null>(null);
  if (!enabled) return null;
  return (
    <>
      <TodayDoses compact onRegister={setTarget} />
      <ExamOverdue />
      {target && <Suspense fallback={null}><DoseSheet target={target} onClose={() => setTarget(null)} /></Suspense>}
    </>
  );
}
