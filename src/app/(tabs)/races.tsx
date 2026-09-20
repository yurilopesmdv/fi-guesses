import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { flag, fmtDate } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { SEASON, useSeason } from '@/lib/useSeason';
import { Card, H2, Loading, Muted, P, Pill, Row } from '@/ui/primitives';
import { colors, space } from '@/ui/theme';

type Podium = Record<number, string[]>; // round → [p1,p2,p3]

export default function Races() {
  const insets = useSafeAreaInsets();
  const { races, drivers, loading, reload } = useSeason();
  const [podiums, setPodiums] = useState<Podium>({});
  const [refreshing, setRefreshing] = useState(false);

  const loadPodiums = useCallback(async () => {
    const { data } = await supabase.from('race_results').select('round,position,driver_code').eq('season', SEASON).lte('position', 3).order('position');
    const m: Podium = {};
    for (const r of data ?? []) (m[r.round] ??= [])[r.position - 1] = r.driver_code;
    setPodiums(m);
  }, []);
  useFocusEffect(useCallback(() => { loadPodiums(); }, [loadPodiums]));

  if (loading) return <Loading />;
  const now = Date.now();
  const nextIdx = races.findIndex((r) => new Date(r.date_utc).getTime() > now);
  const byCode = Object.fromEntries(drivers.map((d) => [d.code, d]));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: space(2), paddingBottom: insets.bottom + space(3) }}
      refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.red} onRefresh={async () => { setRefreshing(true); await reload(); await loadPodiums(); setRefreshing(false); }} />}>
      <H2>Temporada {SEASON} · {races.length} GPs</H2>
      {races.map((r, i) => {
        const past = new Date(r.date_utc).getTime() < now;
        const isNext = i === nextIdx;
        const pod = podiums[r.round];
        return (
          <Pressable key={r.id} onPress={() => router.push(`/race/${r.id}`)}>
            <Card style={isNext ? { borderColor: colors.red } : past ? { opacity: 0.8 } : undefined}>
              <Row>
                <Text style={{ fontSize: 26 }}>{flag(r.country)}</Text>
                <View style={{ flex: 1 }}>
                  <P style={{ fontWeight: '800' }}>R{r.round} · {r.name}{r.has_sprint ? ' ⚡' : ''}</P>
                  <Muted>{r.circuit} · {fmtDate(r.date_utc)}</Muted>
                </View>
                {isNext ? <Pill color={colors.red}>próxima</Pill> : !past && <Text style={{ color: colors.muted }}>›</Text>}
              </Row>
              {pod && (
                <Row style={{ marginTop: space(1), flexWrap: 'wrap' }}>
                  {['🥇', '🥈', '🥉'].map((m, k) => pod[k] && (
                    <Pill key={k} color={colors.card2}>{m} {byCode[pod[k]]?.name.split(' ').pop() ?? pod[k]}</Pill>
                  ))}
                </Row>
              )}
            </Card>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
