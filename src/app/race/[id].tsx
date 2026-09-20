import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Schedule } from '@/components/Schedule';
import { flag, fmtDate } from '@/lib/format';
import { listRaceResults } from '@/lib/repo';
import type { RaceResult } from '@/lib/types';
import { useSeason } from '@/lib/useSeason';
import { Card, H2, Loading, Muted, P, Row, Screen } from '@/ui/primitives';
import { colors } from '@/ui/theme';

/** Corrida (fora de bolão): programação em horário de Brasília + classificação oficial. */
export default function RaceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { races, drivers } = useSeason();
  const race = races.find((r) => r.id === id);
  const [results, setResults] = useState<RaceResult[] | null>(null);
  useEffect(() => { if (race) listRaceResults(race.season, race.round).then(setResults); }, [race]);

  if (!race) return <Screen scroll={false}><Loading /></Screen>;
  const byCode = Object.fromEntries(drivers.map((d) => [d.code, d]));

  return (
    <Screen>
      <Stack.Screen options={{ title: race.name }} />
      <Card>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>{flag(race.country)} {race.name}</Text>
        <Muted>{race.circuit} · Rodada {race.round}{race.has_sprint ? ' · fim de semana com Sprint ⚡' : ''}</Muted>
        <Muted>Largada: {fmtDate(race.date_utc)}</Muted>
      </Card>
      <Schedule race={race} />
      {results && results.length > 0 && (
        <Card>
          <H2>🏁 Classificação</H2>
          {results.map((r) => {
            const d = byCode[r.driver_code];
            return (
              <Row key={r.position} style={{ marginBottom: 6 }}>
                <Text style={{ color: colors.muted, fontWeight: '800', width: 28 }}>{r.position}</Text>
                <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: d?.team_color ?? colors.border }} />
                <View style={{ flex: 1 }}>
                  <P style={{ fontWeight: '600' }}>{d?.name ?? r.driver_code}{r.fastest_lap ? ' ⏱️' : ''}</P>
                  <Muted>{r.team}{r.grid ? ` · grid ${r.grid}` : ''}</Muted>
                </View>
                <Muted>{r.status !== 'Finished' && !/^\+\d/.test(r.status) ? r.status : `${r.points} pts`}</Muted>
              </Row>
            );
          })}
        </Card>
      )}
    </Screen>
  );
}
