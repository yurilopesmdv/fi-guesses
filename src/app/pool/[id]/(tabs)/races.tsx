import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useUserId } from '@/lib/auth';
import { flag, fmtDate } from '@/lib/format';
import { listRaceScores } from '@/lib/repo';
import { usePool } from '@/lib/usePool';
import { Card, Loading, Muted, P, Pill, Row, Screen } from '@/ui/primitives';
import { colors } from '@/ui/theme';

export default function Races() {
  const { pool, races, isOpen } = usePool();
  const uid = useUserId();
  const [scores, setScores] = useState<{ race_id: string; user_id: string; points: number }[]>([]);
  useFocusEffect(useCallback(() => { if (pool) listRaceScores(pool.id).then(setScores); }, [pool]));

  if (!pool) return <Screen scroll={false}><Loading /></Screen>;
  const scored = new Set(scores.map((s) => s.race_id));
  const myPts = (rid: string) => scores.find((s) => s.race_id === rid && s.user_id === uid)?.points;

  return (
    <Screen>
      {races.map((r) => {
        const open = isOpen(r); const done = scored.has(r.id);
        return (
          <Pressable key={r.id} onPress={() => router.push(`/pool/${pool.id}/race/${r.id}`)}>
            <Card style={open ? { borderColor: colors.green } : undefined}>
              <Row>
                <Text style={{ fontSize: 24 }}>{flag(r.country)}</Text>
                <View style={{ flex: 1 }}>
                  <P style={{ fontWeight: '700' }}>R{r.round} · {r.name}{r.has_sprint ? ' ⚡' : ''}</P>
                  <Muted>{fmtDate(r.date_utc)}</Muted>
                </View>
                {done ? <Text style={{ color: colors.gold, fontWeight: '900', fontSize: 18 }}>{myPts(r.id) ?? 0} pts</Text>
                  : open ? <Pill color={colors.green}>aberta</Pill> : <Pill>fechada</Pill>}
              </Row>
            </Card>
          </Pressable>
        );
      })}
    </Screen>
  );
}
