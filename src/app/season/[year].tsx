import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Redirect, Stack, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MapSheet, WorldMap, type MapPoint } from '@/components/circuits/WorldMap';
import { InsightMetric } from '@/components/insights/InsightUI';
import { useAuth } from '@/lib/auth';
import { flag } from '@/lib/format';
import { openTeam } from '@/lib/nav';
import { getSeasonOverview, type SeasonOverview } from '@/lib/repo';
import { SEASON } from '@/lib/useSeason';
import { Button, Card, H1, H2, Loading, Muted, P, Row, Screen } from '@/ui/primitives';
import { colors } from '@/ui/theme';

function Champion({ label, name, sub, color, onPress }: { label: string; name: string; sub: string; color?: string | null; onPress?: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ flex: 1, minWidth: 0, backgroundColor: colors.card2, borderRadius: 12, padding: 12, gap: 4, borderLeftWidth: 4, borderLeftColor: color ?? colors.gold }}>
      <Text style={{ color: colors.gold, fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }} numberOfLines={2}>{name}</Text>
      <Text style={{ color: colors.muted, fontSize: 12 }}>{sub}</Text>
    </Pressable>
  );
}

/** Temporada em uma tela: campeões, distribuição de vitórias e etapas no mapa. */
export default function SeasonScreen() {
  const auth = useAuth();
  const year = Number(useLocalSearchParams<{ year: string }>().year) || SEASON;
  const [data, setData] = useState<SeasonOverview | null>(null);
  const [error, setError] = useState('');
  const [picked, setPicked] = useState<MapPoint[]>([]);
  useEffect(() => {
    let active = true;
    setData(null); setError(''); setPicked([]);
    if (auth.session) getSeasonOverview(year).then((v) => { if (active) setData(v); }).catch(() => { if (active) setError('Não foi possível carregar a temporada.'); });
    return () => { active = false; };
  }, [year, auth.session]);
  if (!auth.loading && !auth.session) return <Redirect href="/login" />;
  const go = (y: number) => router.setParams({ year: String(y) });
  const maxWins = Math.max(1, ...(data?.winners ?? []).map((w) => w.wins));
  const points: MapPoint[] = (data?.stops ?? []).flatMap((s) => s.lat != null && s.lon != null ? [{ id: s.race_id, lat: s.lat, lon: s.lon, label: `R${s.round} ${s.name}` }] : []);
  return (
    <Screen>
      <Stack.Screen options={{ title: `Temporada ${year}` }} />
      <Row style={{ justifyContent: 'space-between' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Temporada anterior" disabled={year <= 1950} onPress={() => go(year - 1)} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', opacity: year <= 1950 ? 0.3 : 1 }}><Ionicons name="chevron-back" size={22} color={colors.text} /></Pressable>
        <View style={{ alignItems: 'center' }}><Muted style={{ color: colors.red, fontWeight: '800', letterSpacing: 2 }}>TEMPORADA</Muted><H1>{year}</H1></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Próxima temporada" disabled={year >= SEASON} onPress={() => go(year + 1)} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', opacity: year >= SEASON ? 0.3 : 1 }}><Ionicons name="chevron-forward" size={22} color={colors.text} /></Pressable>
      </Row>
      {error ? <Card><Muted>{error}</Muted><Button title="Tentar novamente" onPress={() => go(year)} /></Card> : !data ? <Loading /> : !data.races ? <Card><Muted>Temporada ainda não importada. Abra Corridas neste ano para importar.</Muted></Card> : <>
        <Row style={{ alignItems: 'stretch', marginBottom: 12 }}>
          {data.finished && data.driver_champion
            ? <Champion label="CAMPEÃO" name={data.driver_champion.name} sub={`${Number(data.driver_champion.points)} pts · ${data.driver_champion.wins} vitórias`} onPress={() => router.push(`/driver/${data.driver_champion!.driver_id}`)} />
            : <Champion label="LÍDER" name={data.leader?.name ?? '—'} sub={data.leader ? `${Number(data.leader.points)} pts · em andamento` : 'sem resultados'} onPress={data.leader ? () => router.push(`/driver/${data.leader!.driver_id}`) : undefined} />}
          {data.finished && data.constructor_champion
            ? <Champion label="CONSTRUTORES" name={data.constructor_champion.team} sub={`${Number(data.constructor_champion.points)} pts`} color={data.constructor_champion.color} onPress={() => openTeam(data.constructor_champion!.team)} />
            : <Champion label="ANDAMENTO" name={`${data.completed}/${data.races} GPs`} sub={data.finished ? 'sem campeonato de construtores' : 'temporada em curso'} />}
        </Row>
        <Row style={{ alignItems: 'stretch' }}>
          <InsightMetric value={data.winners.length} label="vencedores diferentes" accent />
          <InsightMetric value={data.completed ? `${Math.round((100 * data.from_p1) / data.completed)}%` : '—'} label="das vitórias saíram de P1" />
        </Row>
        <H2 style={{ marginTop: 16 }}>Quem venceu</H2>
        <Card>
          {data.winners.map((w) => (
            <Pressable key={w.driver_id} accessibilityRole="button" accessibilityLabel={`${w.name}: ${w.wins} vitórias`} onPress={() => router.push(`/driver/${w.driver_id}`)} style={{ minHeight: 36, justifyContent: 'center', gap: 4 }}>
              <Row><Text style={{ flex: 1, color: colors.text, fontWeight: '700', fontSize: 13 }} numberOfLines={1}>{w.name ?? w.driver_id}</Text><Text style={{ color: colors.gold, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{w.wins}</Text></Row>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.card2 }}><View style={{ height: 6, borderRadius: 3, width: `${(100 * w.wins) / maxWins}%`, backgroundColor: w.team_color ?? colors.red }} /></View>
            </Pressable>
          ))}
          {!data.winners.length && <Muted>Nenhum GP disputado ainda.</Muted>}
        </Card>
        {points.length > 0 && <>
          <H2>Etapas pelo mundo</H2>
          <WorldMap points={points} onSelect={setPicked} caption={`${data.races} etapas · toque em um pino`} />
          {picked.length > 0 && <MapSheet>{picked.map((p) => { const s = data.stops.find((x) => x.race_id === p.id)!; return (
            <Pressable key={p.id} accessibilityRole="button" onPress={() => router.push(`/race/${s.race_id}`)} style={{ minHeight: 44, justifyContent: 'center' }}>
              <P style={{ fontWeight: '700' }}>{flag(s.country)} R{s.round} · {s.name} ›</P>
              <Muted style={{ fontSize: 12 }}>{s.circuit ?? ''}{s.winner ? ` · vencedor: ${s.winner}` : ''}</Muted>
            </Pressable>); })}</MapSheet>}
        </>}
      </>}
    </Screen>
  );
}
