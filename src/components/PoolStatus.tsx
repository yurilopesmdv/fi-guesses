import type { PoolLifecycle } from '@/lib/types';
import { poolStatusLabel } from '@/lib/poolStatus';
import { Pill } from '@/ui/primitives';
import { colors } from '@/ui/theme';

export function PoolStatus({ state }: { state?: PoolLifecycle | null }) {
  return <Pill color={state?.status === 'ongoing' ? '#14532d' : colors.card2}>{poolStatusLabel(state)}</Pill>;
}
