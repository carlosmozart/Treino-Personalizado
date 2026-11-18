// Z1: no Início, as doses de hoje (só com a seção ligada e quando há dose prevista).
import { useState } from 'react';
import { useAppStore } from '../../store';
import { DoseSheet, type DoseTarget } from './DoseSheet';
import { TodayDoses } from './ProtocolView';

export function HomeDoses() {
  const enabled = useAppStore(s => !!s.data?.settings.protocolEnabled);
  const [target, setTarget] = useState<DoseTarget | null>(null);
  if (!enabled) return null;
  return (
    <>
      <TodayDoses compact onRegister={setTarget} />
      {target && <DoseSheet target={target} onClose={() => setTarget(null)} />}
    </>
  );
}
