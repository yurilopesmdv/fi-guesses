import { RaceView } from '@/components/RaceView';
import { usePool } from '@/lib/usePool';
import { Loading, Muted, Screen } from '@/ui/primitives';

export default function NextRace() {
  const { pool, nextRace } = usePool();
  if (!pool) return <Screen scroll={false}><Loading /></Screen>;
  if (!nextRace) return <Screen><Muted>Nenhuma corrida cadastrada pra {pool.season}.</Muted></Screen>;
  return <RaceView race={nextRace} />;
}
