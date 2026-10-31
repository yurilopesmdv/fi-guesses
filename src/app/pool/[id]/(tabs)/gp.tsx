import { useLocalSearchParams } from 'expo-router';
import { RaceView } from '@/components/RaceView';
import { usePool } from '@/lib/usePool';
import { Loading, Muted, Screen } from '@/ui/primitives';

/** Detalhes do GP: programação completa, grid, resultado, raio-X, volta a volta e ferramentas. */
export default function GpTab() {
  const { pool, races, nextRace, loading } = usePool();
  const { raceId } = useLocalSearchParams<{ raceId?: string }>();
  if (loading || !pool) return <Screen scroll={false}><Loading /></Screen>;
  const race = races.find((r) => r.id === raceId) ?? nextRace;
  if (!race) return <Screen><Muted>Nenhuma corrida cadastrada.</Muted></Screen>;
  return <RaceView key={race.id} race={race} mode="gp" />;
}
