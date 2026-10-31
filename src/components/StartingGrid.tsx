import { useCallback, useState } from 'react';
import { AppState, Pressable, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getQualifyingOrder, getStartingGrid } from '@/lib/repo';
import { openDriver } from '@/lib/nav';
import type { Driver, QualifyingOrder, Race, RaceResult, StartingGrid as Grid, StartingGridRow } from '@/lib/types';
import { Button, Card, H2, Muted, P, Row } from '@/ui/primitives';
import { colors } from '@/ui/theme';

type Props = { race: Race; drivers: Driver[]; results: RaceResult[] | null; compact?: boolean; onGridChange?: (grid: Grid | null) => void };

/** Dados para decidir o palpite: largada e qualy têm estados e seções independentes. */
export function StartingGrid({ race, drivers, results, compact = false, onGridChange }: Props) {
  const [grid, setGrid] = useState<Grid | null>(null);
  const [qualifying, setQualifying] = useState<QualifyingOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [expanded, setExpanded] = useState(false);
  useFocusEffect(useCallback(() => {
    let active = true, busy = false;
    setGrid(null); setQualifying(null); setLoading(true); setError(''); setExpanded(false);
    onGridChange?.(null);
    const load = async (refresh = false) => {
      if (busy || !results || AppState.currentState === 'background' || AppState.currentState === 'inactive') return;
      busy = true;
      try {
        const value = await getStartingGrid(race, drivers, results, refresh);
        if (active) { setGrid(value); onGridChange?.(value); setError(''); }
        // A qualy só entra como referência em outra seção, sem ocupar o grid real.
        if (!value) {
          const order = await getQualifyingOrder(race, drivers, refresh);
          if (active) setQualifying(order);
        } else if (active) setQualifying(null);
      } catch {
        if (active) setError('Não foi possível atualizar o grid de largada.');
        try {
          const order = await getQualifyingOrder(race, drivers, refresh);
          if (active) setQualifying(order);
        } catch { /* A falha da qualy não impede consultar/apostar. */ }
      } finally { busy = false; if (active) setLoading(false); }
    };
    void load(revision > 0);
    const interval = setInterval(() => { void load(); }, 60000);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') void load(); });
    return () => { active = false; clearInterval(interval); subscription.remove(); };
  }, [race.id, race.season, race.round, race.date_utc, race.quali_utc, drivers, results, revision, onGridChange]));

  if (race.series !== 'f1') return null;
  const beforeQualifying = race.quali_utc && Date.now() < Date.parse(race.quali_utc);
  // Na entrada do bolão só aparece quando já há grid ou qualy; antes disso não ocupa espaço.
  if (compact && !grid && !qualifying) return null;
  const top = compact ? 10 : 5;
  return <>
    <Card>
      <H2>🚦 Grid de largada</H2>
      <Muted>De onde cada piloto vai largar. Use como referência para o seu palpite.</Muted>
      {loading && !grid && <Muted>Consultando posições de largada…</Muted>}
      {!loading && !grid && <Muted>{error || (beforeQualifying ? 'Aguardando a classificação e a publicação do grid.' : 'Grid de largada ainda não publicado ou indisponível para esta corrida.')}</Muted>}
      {grid && <>
        <Row style={{ marginTop: 12 }}><Muted style={{ width: 60 }}>Largada</Muted><Muted>Piloto / equipe</Muted></Row>
        {(compact && !expanded ? grid.rows.slice(0, top) : grid.rows).map((row) => <GridDriver key={row.driver_id ?? row.driver_code} row={row} />)}
        {compact && grid.rows.length > top && <Button title={expanded ? 'Recolher grid' : `Ver grid completo (${grid.rows.length} pilotos)`} variant="ghost" onPress={() => setExpanded((value) => !value)} />}
      </>}
      {error && grid && <Muted>{error} As últimas posições carregadas foram mantidas.</Muted>}
      {!loading && !compact && <Button title="Atualizar grid de largada" variant="ghost" onPress={() => setRevision((r) => r + 1)} />}
    </Card>
    {!grid && qualifying && <Card>
      <H2>⏱️ Resultado da qualy</H2>
      <Muted>Referência enquanto o grid não é publicado. Punições e largadas dos boxes podem mudar a ordem de largada.</Muted>
      {(expanded ? qualifying.rows : qualifying.rows.slice(0, top)).map((row) => <GridDriver key={row.driver_id ?? row.driver_code} row={row} qualifying />)}
      {qualifying.rows.length > top && <Button title={expanded ? 'Recolher qualy' : `Ver qualy completa (${qualifying.rows.length} pilotos)`} variant="ghost" onPress={() => setExpanded((value) => !value)} />}
    </Card>}
  </>;
}

function GridDriver({ row, qualifying = false }: { row: StartingGridRow; qualifying?: boolean }) {
  return <Pressable onPress={() => openDriver({ series: 'f1', driver_id: row.driver_id ?? null })}>
    <Row style={{ marginTop: 10 }}>
      <Text style={{ color: colors.text, fontWeight: '800', width: 60 }}>{row.position && row.position > 0 ? `P${row.position}` : '—'}</Text>
      <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: row.team_color ?? colors.border }} />
      <View style={{ flex: 1 }}><P style={{ fontWeight: '600' }}>{row.name}</P><Muted>{row.team}{!qualifying && !row.position ? ' · boxes / posição não informada' : ''}</Muted></View>
    </Row>
  </Pressable>;
}
