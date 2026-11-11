// T22 e V13: as opções de volume de Perfil → Treino, para as telas que mostram volume.
import { useMemo } from 'react';
import { volumeOptions, type VolumeOptions } from '../domain/workouts';
import { useAppStore } from '../store';

export function useVolumeOptions(): VolumeOptions | undefined {
  const warmup = useAppStore(s => s.data?.settings.volumeWarmup);
  const body = useAppStore(s => s.data?.settings.volumeBodyweight);
  const profile = useAppStore(s => s.data?.profile);
  return useMemo(
    () => volumeOptions({ settings: { volumeWarmup: !!warmup, volumeBodyweight: !!body }, ...(profile ? { profile } : {}) }),
    [warmup, body, profile]
  );
}
