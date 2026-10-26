import { Pressable, Text, View } from 'react-native';
import { openDriver } from '@/lib/nav';
import type { Driver, Race, RaceResult } from '@/lib/types';
import { Card, H2, Muted, P, Row } from '@/ui/primitives';
import { colors } from '@/ui/theme';

/** A chegada tem sua própria seção; nunca recebe dados da qualy ou do grid. */
export function RaceClassification({ race, drivers, results }: { race: Race; drivers: Driver[]; results: RaceResult[] | null }) {
  const rows = results?.filter((r) => r.session === (race.series === 'f1' ? 'race' : 'feature')) ?? [];
  return <Card>
    <H2>🏁 {race.series === 'f1' ? 'Resultado final da corrida' : 'Feature Race · resultado'}</H2>
    {!rows.length && <Muted>{results === null ? 'Carregando resultado…' : 'Resultado final ainda não disponível. As posições de largada aparecem na seção Grid de largada.'}</Muted>}
    {rows.length > 0 && <Row style={{ marginTop: 10 }}><Muted style={{ width: 54 }}>Chegada</Muted><Muted>Piloto · largada</Muted></Row>}
    {rows.map((r) => {
      const d = drivers.find((driver) => driver.code === r.driver_code);
      return <Pressable key={`${r.session}-${r.driver_code}`} onPress={() => openDriver(d)}>
        <Row style={{ marginTop: 10 }}>
          <Text style={{ color: colors.text, fontWeight: '800', width: 54 }}>P{r.position}</Text>
          <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: d?.team_color ?? colors.border }} />
          <View style={{ flex: 1 }}>
            <P style={{ fontWeight: '600' }}>{d?.name ?? r.driver_code}{r.fastest_lap ? ' ⏱️' : ''}</P>
            <Muted>{r.team}{r.grid && r.grid > 0 ? ` · Largou em P${r.grid}` : ' · Largada não informada / boxes'}</Muted>
          </View>
          <Muted>{r.status !== 'Finished' && !/^\+\d/.test(r.status) ? r.status : `${r.points} pts`}</Muted>
        </Row>
      </Pressable>;
    })}
  </Card>;
}
