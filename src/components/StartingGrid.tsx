import { useCallback, useState } from 'react';
import { AppState, Pressable, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getStartingGrid } from '@/lib/repo';
import { openDriver } from '@/lib/nav';
import type { Driver, Race, RaceResult, StartingGrid as Grid } from '@/lib/types';
import { Button, Card, H2, Muted, P, Row } from '@/ui/primitives';
import { colors } from '@/ui/theme';

export function StartingGrid({ race, drivers, results }: { race: Race; drivers: Driver[]; results: RaceResult[] | null }) {
  const [grid, setGrid] = useState<Grid | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true, busy = false;
    setGrid(null); setLoading(true); setError('');
    const load = async (refresh = false) => {
      if (busy || !results || AppState.currentState !== 'active') return;
      busy = true;
      try {
        const value = await getStartingGrid(race, drivers, results, refresh);
        if (active) { setGrid(value); setError(''); }
      } catch (e: any) { if (active) setError(e.message); }
      finally { busy = false; if (active) setLoading(false); }
    };
    void load(revision > 0);
    const interval = setInterval(() => { void load(); }, 60000);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') void load(); });
    return () => { active = false; clearInterval(interval); subscription.remove(); };
  }, [race.id, race.season, race.round, race.date_utc, race.quali_utc, drivers, results, revision]));

  if (race.series !== 'f1') return null;
  const beforeQualifying = race.quali_utc && Date.now() < Date.parse(race.quali_utc);
  return <Card>
    <H2>🚦 Grid de largada</H2>
    {grid?.source === 'qualifying' && <Muted>Ordem da classificação · grid provisório, sujeito a punições e alterações.</Muted>}
    {grid && grid.source !== 'qualifying' && <Muted>Posições de largada publicadas para a corrida.</Muted>}
    {loading && !grid && <Muted>Consultando grid…</Muted>}
    {!loading && !grid && <Muted>{error || (beforeQualifying ? 'Disponível após a classificação e a publicação dos dados.' : 'Grid ainda não publicado ou indisponível para esta corrida.')}</Muted>}
    {grid?.rows.map((r) => <Pressable key={r.driver_id ?? r.driver_code} onPress={() => openDriver({ series: 'f1', driver_id: r.driver_id ?? null })}>
      <Row style={{ marginTop: 10 }}>
        <Text style={{ color: colors.muted, fontWeight: '800', width: 34 }}>{r.position && r.position > 0 ? r.position : '—'}</Text>
        <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: r.team_color ?? colors.border }} />
        <View style={{ flex: 1 }}><P style={{ fontWeight: '600' }}>{r.name}</P><Muted>{r.team}{!r.position ? ' · boxes / posição não informada' : ''}</Muted></View>
      </Row>
    </Pressable>)}
    {error && grid && <Muted>{error}</Muted>}
    {!loading && <Button title="Atualizar grid" variant="ghost" onPress={() => setRevision((r) => r + 1)} />}
  </Card>;
}
