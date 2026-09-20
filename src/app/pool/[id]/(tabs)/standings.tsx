import { useCallback, useState } from 'react';
import { Share, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useUserId } from '@/lib/auth';
import { listRaceScores, listStandings } from '@/lib/repo';
import type { Standing } from '@/lib/types';
import { usePool } from '@/lib/usePool';
import { Button, Card, Loading, Muted, P, Row, Screen } from '@/ui/primitives';
import { colors, space } from '@/ui/theme';

const MEDAL = ['🥇', '🥈', '🥉'];

export default function Standings() {
  const { pool, races } = usePool();
  const uid = useUserId();
  const [rows, setRows] = useState<Standing[] | null>(null);
  const [lastRace, setLastRace] = useState<Record<string, number>>({});

  useFocusEffect(useCallback(() => {
    if (!pool) return;
    Promise.all([listStandings(pool.id), listRaceScores(pool.id)]).then(([st, sc]) => {
      setRows(st);
      // pontos da corrida mais recente apurada
      const scored = new Set(sc.map((x) => x.race_id));
      const last = [...races].reverse().find((r) => scored.has(r.id));
      setLastRace(last ? Object.fromEntries(sc.filter((x) => x.race_id === last.id).map((x) => [x.user_id, x.points])) : {});
    });
  }, [pool, races]));

  if (!pool || rows === null) return <Screen scroll={false}><Loading /></Screen>;

  const share = () => Share.share({
    message: `🏁 ${pool.name} — ranking\n` + rows.map((r, i) => `${MEDAL[i] ?? `${i + 1}.`} ${r.name} — ${r.total} pts`).join('\n'),
  });

  return (
    <Screen>
      {pool.stake_label && rows.length > 1 && (
        <Muted style={{ marginBottom: space(1) }}>💰 {pool.stake_label} · {rows.length} participantes</Muted>
      )}
      {rows.map((r, i) => (
        <Card key={r.user_id} style={r.user_id === uid ? { borderColor: colors.red } : undefined}>
          <Row>
            <Text style={{ fontSize: 22, width: 36 }}>{MEDAL[i] ?? `${i + 1}º`}</Text>
            <Text style={{ fontSize: 22 }}>{r.avatar}</Text>
            <View style={{ flex: 1 }}>
              <P style={{ fontWeight: '800', fontSize: 17 }}>{r.name}</P>
              <Muted>{r.races_scored} corrida{r.races_scored === 1 ? '' : 's'} apurada{r.races_scored === 1 ? '' : 's'}{lastRace[r.user_id] != null ? ` · última: +${lastRace[r.user_id]}` : ''}</Muted>
            </View>
            <Text style={{ color: colors.gold, fontSize: 24, fontWeight: '900' }}>{r.total}</Text>
          </Row>
        </Card>
      ))}
      <Button title="Compartilhar ranking" variant="ghost" onPress={share} />
    </Screen>
  );
}
