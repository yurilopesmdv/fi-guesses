import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { InsightDetails, InsightMetric } from '@/components/insights/InsightUI';
import { getCircuitRaceInsight } from '@/lib/repo';
import type { CircuitInsightDriver, CircuitRaceInsight, Race } from '@/lib/types';
import { Card, H2, Muted, Row } from '@/ui/primitives';
import { colors } from '@/ui/theme';

const pct = (n: number, d: number) => (d ? `${Math.round((100 * n) / d)}%` : '—');

function Chip({ children, tone }: { children: React.ReactNode; tone?: string }) {
  return <View style={{ backgroundColor: colors.card2, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 }}><Text style={{ color: tone ?? colors.muted, fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{children}</Text></View>;
}

function DriverRow({ d, max }: { d: CircuitInsightDriver; max: number }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${d.name}: ${d.starts} largadas, ${d.wins} vitórias, ${d.podiums} pódios nesta pista`}
      onPress={() => router.push(`/driver/${d.driver_id}`)} style={{ minHeight: 44, paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.border, gap: 4 }}>
      <Row style={{ gap: 8 }}>
        <View style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: d.team_color ?? colors.border }} />
        <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }} numberOfLines={1}>{d.name}</Text>
        {d.starts ? <Text style={{ color: colors.muted, fontSize: 12 }}>{d.starts} GP{d.starts > 1 ? 's' : ''}</Text> : <Text style={{ color: colors.muted, fontSize: 12 }}>estreia aqui</Text>}
      </Row>
      {d.starts > 0 && (
        <Row style={{ gap: 6, flexWrap: 'wrap', paddingLeft: 12 }}>
          {d.wins > 0 && <Chip tone={colors.gold}>{d.wins}V</Chip>}
          {d.podiums > 0 && <Chip tone={colors.text}>{d.podiums} pódio{d.podiums > 1 ? 's' : ''}</Chip>}
          {d.best && <Chip>melhor P{d.best}</Chip>}
          {d.median && <Chip>mediana P{d.median}</Chip>}
          {d.last && <Chip tone={d.last.classified ? colors.muted : colors.red}>{d.last.season}: {d.last.classified ? `P${d.last.position}` : 'abandono'}</Chip>}
        </Row>
      )}
      {max > 0 && <View style={{ height: 3, borderRadius: 2, backgroundColor: colors.card2, marginLeft: 12 }}><View style={{ height: 3, borderRadius: 2, width: `${(100 * d.podiums) / max}%`, backgroundColor: colors.gold }} /></View>}
    </Pressable>
  );
}

/** Raio-X da pista antes do GP: conversão do grid e retrospecto do grid atual. Só provas anteriores. */
export function CircuitInsight({ race }: { race: Race }) {
  const [data, setData] = useState<CircuitRaceInsight | null>(null);
  const [all, setAll] = useState(false);
  useEffect(() => {
    let active = true;
    if (race.series === 'f1') getCircuitRaceInsight(race.id).then((v) => { if (active) setData(v); }).catch(() => {});
    return () => { active = false; };
  }, [race.id, race.series]);
  if (!data || !data.editions) return null;
  const maxPodiums = Math.max(0, ...data.drivers.map((d) => d.podiums));
  const shown = all ? data.drivers : data.drivers.slice(0, 6);
  return (
    <Card>
      <Muted style={{ fontSize: 12 }}>RAIO-X DA PISTA</Muted>
      <H2>{data.editions} GPs aqui desde {data.first_season}</H2>
      <Row style={{ alignItems: 'stretch' }}>
        <InsightMetric value={pct(data.from_p1, data.editions)} label="das vitórias saíram de P1" accent />
        <InsightMetric value={data.deepest_win ? `P${data.deepest_win.grid}` : '—'} label={data.deepest_win ? `vitória mais de trás (${data.deepest_win.season})` : 'vitória mais de trás'} />
      </Row>
      <Row style={{ alignItems: 'stretch', marginTop: 8 }}>
        <InsightMetric value={`${data.recent.from_p1}/${data.recent.editions}`} label="últimas edições vencidas de P1" />
        <InsightMetric value={data.avg_gain == null ? '—' : `${data.avg_gain > 0 ? '+' : ''}${String(data.avg_gain).replace('.', ',')}`} label="posições ganhas em média (classificados)" />
      </Row>
      <Muted style={{ fontSize: 12, marginTop: 14, marginBottom: 4 }}>GRID ATUAL NESTA PISTA</Muted>
      {shown.map((d) => <DriverRow key={d.driver_id} d={d} max={maxPodiums} />)}
      {data.drivers.length > 6 && (
        <Pressable accessibilityRole="button" onPress={() => setAll(!all)} style={{ minHeight: 44, justifyContent: 'center' }}>
          <Text style={{ color: colors.red, fontWeight: '700' }}>{all ? 'Mostrar menos' : `Ver os ${data.drivers.length} pilotos`}</Text>
        </Pressable>
      )}
      <InsightDetails title="Como ler">
        <Muted>Considera só GPs anteriores a esta etapa, no mesmo circuito. P1 é a posição de largada no grid, que pode diferir da pole (punições). Ganho médio compara largada e chegada; não é número de ultrapassagens.</Muted>
      </InsightDetails>
    </Card>
  );
}
