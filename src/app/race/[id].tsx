import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Schedule } from '@/components/Schedule';
import { StartingGrid } from '@/components/StartingGrid';
import { RaceClassification } from '@/components/RaceClassification';
import { flag, fmtDate } from '@/lib/format';
import { getRace, listDrivers, listRaceResults, listSupportRaces } from '@/lib/repo';
import { SERIES_LABEL, type Driver, type Race, type RaceResult } from '@/lib/types';
import { Card, Loading, Muted, Screen } from '@/ui/primitives';
import { colors } from '@/ui/theme';

/** Corrida (fora de bolão): programação em horário de Brasília + classificação oficial. */
export default function RaceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [race, setRace] = useState<Race | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [results, setResults] = useState<RaceResult[] | null>(null);
  const [support, setSupport] = useState<Race[]>([]);
  useEffect(() => {
    getRace(id).then(async (r) => {
      setRace(r);
      const [d, res, sup] = await Promise.all([listDrivers(r.season, r.series), listRaceResults(r.season, r.round, r.series), r.series === 'f1' ? listSupportRaces(r) : Promise.resolve([])]);
      setDrivers(d); setResults(res); setSupport(sup);
    });
  }, [id]);

  if (!race) return <Screen scroll={false}><Loading /></Screen>;

  return (
    <Screen>
      <Stack.Screen options={{ title: race.name }} />
      <Card>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>{flag(race.country)} {race.series !== 'f1' ? `${SERIES_LABEL[race.series]} · ` : ''}{race.name}</Text>
        <Muted>{race.circuit} · Rodada {race.round}{race.has_sprint ? ' · fim de semana com Sprint ⚡' : ''}</Muted>
        {!race.times_tbc && <Muted>{race.series === 'f1' ? 'Largada' : 'Feature Race'}: {fmtDate(race.date_utc)}</Muted>}
      </Card>
      <Schedule race={race} support={support} />
      <StartingGrid race={race} drivers={drivers} results={results} />
      <RaceClassification race={race} drivers={drivers} results={results} />
    </Screen>
  );
}
