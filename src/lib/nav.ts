import { router } from 'expo-router';
import type { Driver } from './types';

/** Abre o perfil do piloto (só F1 tem carreira; F2/F3 ignoram). */
export const openDriver = (d?: Pick<Driver, 'driver_id' | 'series'> | null) => {
  if (d?.driver_id && d.series === 'f1') router.push(`/driver/${d.driver_id}`);
};
export const canOpenDriver = (d?: Pick<Driver, 'driver_id' | 'series'> | null) => Boolean(d?.driver_id && d.series === 'f1');
