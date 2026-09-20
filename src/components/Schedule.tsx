import { Text, View } from 'react-native';
import { fmtDay, fmtTime, raceSessions } from '@/lib/format';
import type { Race } from '@/lib/types';
import { Card, H2, Muted, P, Row } from '@/ui/primitives';
import { colors } from '@/ui/theme';

/** Programação do fim de semana em horário de Brasília, agrupada por dia. */
export function Schedule({ race }: { race: Race }) {
  const sessions = raceSessions(race);
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
            const main = name === 'Corrida' || name === 'Sprint' || name === 'Classificação';
            return (
              <Row key={name} style={{ justifyContent: 'space-between', paddingVertical: 3 }}>
                <P style={{ fontWeight: main ? '800' : '400', color: past ? colors.muted : colors.text }}>{name}</P>
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
