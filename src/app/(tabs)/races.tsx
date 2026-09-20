import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SeriesPicker } from '@/components/SeriesPicker';
import { YearPicker } from '@/components/YearPicker';
import type { Series } from '@/lib/types';
import { flag, fmtDate } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { SEASON } from '@/lib/useSeason';
import { useYear } from '@/lib/useYear';
import { Card, Loading, Muted, P, Pill, Row } from '@/ui/primitives';
import { colors, space } from '@/ui/theme';

type Podium = Record<number, string[]>; // round → [p1,p2,p3]

export default function Races() {
  const insets = useSafeAreaInsets();
  const [year, setYearRaw] = useState(SEASON);
  const [series, setSeries] = useState<Series>('f1');
  const setYear = (y: number) => { setYearRaw(y); if (y !== SEASON) setSeries('f1'); };
  const { races, drivers, loading, importing, refresh } = useYear(year, series);
  const [podiums, setPodiums] = useState<Podium>({});
  const [refreshing, setRefreshing] = useState(false);

  const loadPodiums = useCallback(async () => {
    const { data } = await supabase.from('race_results').select('round,position,driver_code').eq('series', series).eq('season', year).in('session', ['race', 'feature']).lte('position', 3).order('position');
    const m: Podium = {};
    for (const r of data ?? []) (m[r.round] ??= [])[r.position - 1] = r.driver_code;
    setPodiums(m);
  }, [year, series]);
  useEffect(() => { loadPodiums(); }, [loadPodiums, loading]);

  const now = Date.now();
  const nextIdx = races.findIndex((r) => new Date(r.date_utc).getTime() > now);
  const byCode = Object.fromEntries(drivers.map((d) => [d.code, d]));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: space(2), paddingBottom: insets.bottom + space(3) }}
      refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.red} onRefresh={async () => { setRefreshing(true); await refresh(); await loadPodiums(); setRefreshing(false); }} />}>
      <YearPicker value={year} onChange={setYear} />
      <SeriesPicker value={series} onChange={setSeries} onlyF1={year !== SEASON} />
      {loading ? (
        <><Loading />{importing && <Muted style={{ textAlign: 'center' }}>Importando temporada {year} da API…</Muted>}</>
      ) : (
        <>
          <Muted style={{ marginBottom: space(1) }}>{races.length} {series === 'f1' ? 'GPs' : 'etapas'} · {Object.keys(podiums).length} disputad{series === 'f1' ? 'os' : 'as'}{year === SEASON ? ' · puxe pra atualizar' : ''}</Muted>
          {races.map((r, i) => {
            const past = new Date(r.date_utc).getTime() < now;
            const isNext = year === SEASON && i === nextIdx;
            const pod = podiums[r.round];
            return (
              <Pressable key={r.id} onPress={() => router.push(`/race/${r.id}`)}>
                <Card style={isNext ? { borderColor: colors.red } : past && !pod ? { opacity: 0.8 } : undefined}>
                  <Row>
                    <Text style={{ fontSize: 26 }}>{flag(r.country)}</Text>
                    <View style={{ flex: 1 }}>
                      <P style={{ fontWeight: '800' }}>R{r.round} · {r.name}{r.has_sprint && series === 'f1' ? ' ⚡' : ''}</P>
                      <Muted>{r.circuit} · {fmtDate(r.date_utc)}</Muted>
                    </View>
                    {isNext ? <Pill color={colors.red}>próxima</Pill> : <Text style={{ color: colors.muted }}>›</Text>}
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
        </>
      )}
    </ScrollView>
  );
}
