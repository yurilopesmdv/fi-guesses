import { Text, View } from 'react-native';
import { fmtDay, fmtTime, raceSessions } from '@/lib/format';
import { SERIES_LABEL, type Race } from '@/lib/types';
import { Card, H2, Muted, P, Row } from '@/ui/primitives';
import { colors } from '@/ui/theme';

/** Programação do fim de semana em horário de Brasília, agrupada por dia. */
export function Schedule({ race, support = [] }: { race: Race; support?: Race[] }) {
  const own = raceSessions(race).map(([n, iso]) => [race.series === 'f1' ? n : `${SERIES_LABEL[race.series]} · ${n}`, iso] as [string, string]);
  const extra = support.flatMap((r) => raceSessions(r).map(([n, iso]) => [`${SERIES_LABEL[r.series]} · ${n}`, iso] as [string, string]));
  const sessions = [...own, ...extra].sort((a, b) => a[1].localeCompare(b[1]));
  const now = Date.now();
  const days = [...new Set(sessions.map(([, iso]) => fmtDay(iso)))];
  return (
    <Card>
      <H2>📺 Programação <Muted>horário de Brasília</Muted></H2>
      {days.map((day) => (
        <View key={day} style={{ marginBottom: 8 }}>
          <Muted style={{ textTransform: 'capitalize', marginBottom: 4 }}>{day}</Muted>
          {sessions.filter(([, iso]) => fmtDay(iso) === day).map(([name, iso]) => {
            const past = new Date(iso).getTime() < now;
            const main = ['Corrida', 'Sprint', 'Classificação', 'F2 · Feature Race', 'F3 · Feature Race'].includes(name) || (race.series !== 'f1' && name.endsWith('Race'));
            const isSupport = race.series === 'f1' && name.startsWith('F');
            return (
              <Row key={name} style={{ justifyContent: 'space-between', paddingVertical: 3 }}>
                <P style={{ fontWeight: main ? '800' : '400', color: past ? colors.muted : isSupport ? '#9AA5B1' : colors.text, fontSize: isSupport ? 14 : 16 }}>{name}</P>
                <Text style={{ color: past ? colors.muted : main ? colors.gold : colors.text, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{fmtTime(iso)}</Text>
              </Row>
            );
          })}
        </View>
      ))}
      <Muted style={{ marginTop: 4 }}>Transmissão: F1 TV · SporTV / Band</Muted>
    </Card>
  );
}
