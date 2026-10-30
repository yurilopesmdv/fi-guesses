import { Pressable, Text, View } from 'react-native';
import { openDriver } from '@/lib/nav';
import type { Driver, Race, RaceResult } from '@/lib/types';
import { Card, H2, Muted, P, Row } from '@/ui/primitives';
import { colors } from '@/ui/theme';

const classified = (status: string) => status === 'Finished' || /^\+\d/.test(status);
const STATUS_PT: Record<string, string> = { Retired: 'Abandono', Disqualified: 'Desclassificado', 'Did not start': 'Não largou', Accident: 'Acidente', Collision: 'Colisão', Withdrew: 'Retirou-se' };
/** Ganho líquido largada → chegada; não é número de ultrapassagens. Largada dos boxes/sem grid fica de fora. */
const delta = (r: RaceResult) => (r.grid && r.grid > 0 && classified(r.status) ? r.grid - r.position : null);

/** A chegada tem sua própria seção; nunca recebe dados da qualy ou do grid. */
export function RaceClassification({ race, drivers, results }: { race: Race; drivers: Driver[]; results: RaceResult[] | null }) {
  const rows = results?.filter((r) => r.session === (race.series === 'f1' ? 'race' : 'feature')) ?? [];
  const name = (code: string) => drivers.find((d) => d.code === code)?.name.split(' ').pop() ?? code;
  const moves = rows.map((r) => ({ r, d: delta(r) })).filter((x): x is { r: RaceResult; d: number } => x.d !== null);
  const up = moves.reduce<typeof moves[number] | null>((b, x) => (x.d > (b?.d ?? 0) ? x : b), null);
  const down = moves.reduce<typeof moves[number] | null>((b, x) => (x.d < (b?.d ?? 0) ? x : b), null);
  const out = rows.filter((r) => !classified(r.status)).length;
  const p1 = rows.find((r) => r.position === 1)?.time_ms, p2 = rows.find((r) => r.position === 2)?.time_ms;
  const margin = p1 && p2 && p2 >= p1 ? ((p2 - p1) / 1000).toFixed(3).replace('.', ',') : null;
  return <Card>
    <H2>🏁 {race.series === 'f1' ? 'Resultado final da corrida' : 'Feature Race · resultado'}</H2>
    {margin && <Muted style={{ marginTop: 2 }}>Vitória por {margin} s sobre o 2º colocado</Muted>}
    {!rows.length && <Muted>{results === null ? 'Carregando resultado…' : 'Resultado final ainda não disponível. As posições de largada aparecem na seção Grid de largada.'}</Muted>}
    {rows.length > 0 && (up || down || out > 0) && (
      <Row style={{ marginTop: 10, gap: 8 }}>
        {up && <Highlight tone={colors.green} value={`▲ ${up.d}`} label={name(up.r.driver_code)} sub={`P${up.r.grid} → P${up.r.position}`} />}
        {down && <Highlight tone={colors.red} value={`▼ ${-down.d}`} label={name(down.r.driver_code)} sub={`P${down.r.grid} → P${down.r.position}`} />}
        <Highlight tone={colors.muted} value={String(out)} label={out === 1 ? 'abandono' : 'abandonos'} />
      </Row>
    )}
    {rows.length > 0 && <Row style={{ marginTop: 10 }}><Muted style={{ width: 66 }}>Chegada</Muted><Muted>Piloto · largada</Muted></Row>}
    {rows.map((r) => {
      const d = drivers.find((driver) => driver.code === r.driver_code);
      return <Pressable key={`${r.session}-${r.driver_code}`} onPress={() => openDriver(d)}>
        <Row style={{ marginTop: 10 }}>
          <View style={{ width: 66, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ color: colors.text, fontWeight: '800' }}>P{r.position}</Text>
            {(() => { const g = delta(r); return g ? <Text style={{ color: g > 0 ? colors.green : colors.red, fontSize: 11, fontWeight: '800' }}>{g > 0 ? `▲${g}` : `▼${-g}`}</Text> : null; })()}
          </View>
          <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: d?.team_color ?? colors.border }} />
          <View style={{ flex: 1 }}>
            <P style={{ fontWeight: '600' }}>{d?.name ?? r.driver_code}{r.fastest_lap ? ' ⏱️' : ''}</P>
            <Muted>{r.team}{r.grid && r.grid > 0 ? ` · Largou em P${r.grid}` : ' · Largada não informada / boxes'}</Muted>
          </View>
          <Muted>{classified(r.status) ? `${r.points} pts` : STATUS_PT[r.status] ?? r.status}</Muted>
        </Row>
      </Pressable>;
    })}
  </Card>;
}

function Highlight({ value, label, sub, tone }: { value: string; label: string; sub?: string; tone: string }) {
  return (
    <View style={{ flex: 1, minWidth: 0, backgroundColor: colors.card2, borderRadius: 12, padding: 10, gap: 2 }}>
      <Text style={{ color: tone, fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{value}</Text>
      <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }} numberOfLines={1}>{label}</Text>
      {sub ? <Text style={{ color: colors.muted, fontSize: 11 }} numberOfLines={1}>{sub}</Text> : null}
    </View>
  );
}
