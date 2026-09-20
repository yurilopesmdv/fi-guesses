import { Stack, useLocalSearchParams } from 'expo-router';
import { RaceView } from '@/components/RaceView';
import { usePool } from '@/lib/usePool';
import { Loading, Screen } from '@/ui/primitives';

export default function RaceScreen() {
  const { raceId } = useLocalSearchParams<{ raceId: string }>();
  const { races } = usePool();
  const race = races.find((r) => r.id === raceId);
  if (!race) return <Screen scroll={false}><Loading /></Screen>;
  return <><Stack.Screen options={{ title: race.name }} /><RaceView race={race} /></>;
}
