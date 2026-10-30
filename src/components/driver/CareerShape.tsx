import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { InsightMetric } from '@/components/insights/InsightUI';
import { openTeam } from '@/lib/nav';
import { getDriverCareerShape, type CareerStreak, type DriverCareerShape } from '@/lib/repo';
import { Card, H2, Muted, Row } from '@/ui/primitives';
import { colors, space } from '@/ui/theme';

const years = (a: number, b: number) => (a === b ? String(a) : `${a}–${String(b).slice(2)}`);
const streakLabel = (s: CareerStreak | undefined, what: string) => (s ? `${what} · ${years(s.from, s.to)}` : what);

/** Trajetória por passagem em equipe e melhores sequências entre largadas consecutivas. */
export function CareerShape({ driverId }: { driverId: string }) {
  const [data, setData] = useState<DriverCareerShape | null>(null);
  useEffect(() => {
    let active = true;
    setData(null);
    getDriverCareerShape(driverId).then((v) => { if (active) setData(v); }).catch(() => {});
    return () => { active = false; };
  }, [driverId]);
  if (!data?.stints.length) return null;
  const total = data.stints.reduce((n, s) => n + s.races, 0);
  const { wins, podiums, points } = data.streaks;
  return (
    <>
      <H2 style={{ marginTop: space(1) }}>🧭 Trajetória</H2>
      <Card>
        <View style={{ flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', gap: 2, marginBottom: 12 }}>
          {data.stints.map((s, i) => <View key={i} style={{ flex: s.races / total, minWidth: 4, backgroundColor: s.color ?? colors.border }} />)}
        </View>
        {data.stints.map((s, i) => (
          <Pressable key={i} accessibilityRole="button" accessibilityLabel={`Abrir ${s.team}`} onPress={() => openTeam(s.team)}
            style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: s.color ?? colors.border }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{s.team}</Text>
              <Muted style={{ fontSize: 12 }}>{years(s.from, s.to)} · {s.races} GPs</Muted>
            </View>
            <Text style={{ color: s.wins ? colors.gold : colors.muted, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{s.wins}V · {s.podiums}P</Text>
          </Pressable>
        ))}
        {(wins || podiums || points) && (
          <>
            <Muted style={{ fontSize: 12, marginTop: 12, marginBottom: 6 }}>MELHORES SEQUÊNCIAS</Muted>
            <Row style={{ alignItems: 'stretch' }}>
              <InsightMetric value={wins?.best ?? 0} label={streakLabel(wins, 'vitórias seguidas')} accent />
              <InsightMetric value={podiums?.best ?? 0} label={streakLabel(podiums, 'pódios seguidos')} />
              <InsightMetric value={points?.best ?? 0} label={streakLabel(points, 'GPs seguidos pontuando')} />
            </Row>
            <Muted style={{ fontSize: 11, marginTop: 6 }}>Largadas consecutivas do piloto; equipe conforme o resultado de cada GP.</Muted>
          </>
        )}
      </Card>
    </>
  );
}
