import { RaceView } from '@/components/RaceView';
import { usePool } from '@/lib/usePool';
import { Button, Loading, Muted, Screen } from '@/ui/primitives';

export default function NextRace() {
  const { pool, nextRace, loading, reload } = usePool();
  if (loading || !pool) return <Screen scroll={false}><Loading /></Screen>;
  if (!nextRace) return <Screen><Muted>Nenhuma corrida cadastrada pra {pool.season}.</Muted><Button title="Tentar novamente" variant="ghost" onPress={reload} /></Screen>;
  return <RaceView race={nextRace} />;
}
