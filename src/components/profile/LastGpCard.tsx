import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { flag, fmtDate } from '@/lib/format';
import { getMyLastGpSummary } from '@/lib/repo';
import type { LastGpPool, MyLastGpSummary } from '@/lib/types';
import { Button, Card, H2, Muted, P, Row } from '@/ui/primitives';
import { colors } from '@/ui/theme';

const STATUS: Record<LastGpPool['status'], string> = { waiting: 'aguardando apuração', partial: 'apuração parcial', settled: 'apurado' };

function Move({ p }: { p: LastGpPool }) {
  const d = p.rank_before - p.rank_after;
  const label = d > 0 ? `▲ ${d}` : d < 0 ? `▼ ${-d}` : '=';
  return <Text style={{ color: d > 0 ? colors.green : d < 0 ? colors.red : colors.muted, fontWeight: '800' }}>{label}</Text>;
}

/** Último GP com resultado oficial: o que mudou nos seus bolões. Não substitui a apuração do bolão. */
export function LastGpCard({ refreshKey }: { refreshKey: number }) {
  const [data, setData] = useState<MyLastGpSummary | null>(null);
  useFocusEffect(useCallback(() => {
    let active = true;
    getMyLastGpSummary().then((v) => { if (active) setData(v); }).catch(() => {});
    return () => { active = false; };
  }, [refreshKey]));
  if (!data?.race) return null;
  const { race, pools, next_race: next } = data;
  return (
    <Card>
      <Muted style={{ fontSize: 12 }}>SEU ÚLTIMO GP</Muted>
      <H2>{flag(race.country)} {race.name}</H2>
      {pools.length ? pools.map((p) => (
        <Pressable key={p.id} accessibilityRole="button" accessibilityLabel={`Abrir bolão ${p.name}`} onPress={() => router.push(`/pool/${p.id}`)}
          style={{ minHeight: 44, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Row>
            <View style={{ flex: 1 }}>
              <P style={{ fontWeight: '700' }}>{p.name}</P>
              <Muted style={{ fontSize: 12 }}>{STATUS[p.status]}{p.status === 'partial' ? ` · ${p.settled}/${p.questions} perguntas` : ''}</Muted>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: colors.gold, fontWeight: '800' }}>+{p.points} pts</Text>
              <Row style={{ gap: 6 }}><Muted style={{ fontSize: 12 }}>{p.rank_before}º → {p.rank_after}º de {p.members}</Muted><Move p={p} /></Row>
            </View>
          </Row>
        </Pressable>
      )) : <Muted>Você não tinha palpites neste GP em nenhum bolão.</Muted>}
      {next ? <Button title={`Próxima: ${next.name} · ${fmtDate(next.date_utc)}`} variant="ghost" onPress={() => router.push(`/race/${next.id}`)} /> : null}
    </Card>
  );
}
