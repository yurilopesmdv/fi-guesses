import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { fmtDay, fmtTime, raceSessions } from '@/lib/format';
import { SERIES_LABEL, type Race } from '@/lib/types';
import { Card, H2, Muted, P, Row } from '@/ui/primitives';
import { colors } from '@/ui/theme';

/** Programação do fim de semana em horário de Brasília, agrupada por dia. */
export function Schedule({ race, support = [] }: { race: Race; support?: Race[] }) {
  const [showSupport, setShowSupport] = useState(false);
  const own = raceSessions(race).map(([n, iso]) => [`${SERIES_LABEL[race.series]} · ${n}`, iso] as [string, string]);
  const usable = support.filter((r) => !r.times_tbc);
  const extra = showSupport ? usable.flatMap((r) => raceSessions(r).map(([n, iso]) => [`${SERIES_LABEL[r.series]} · ${n}`, iso] as [string, string])) : [];
  const sessions = [...own, ...extra].sort((a, b) => a[1].localeCompare(b[1]));
  if (race.times_tbc) {
    return (
      <Card>
        <H2>📺 Programação</H2>
        <Muted>Horários ainda não divulgados pela categoria. Fim de semana: {fmtDay(race.date_utc)}.</Muted>
      </Card>
    );
  }
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
            const main = /Corrida|Sprint|Classificação|Race$/.test(name);
            const isSupport = !name.startsWith(SERIES_LABEL[race.series]);
            return (
              <Row key={name} style={{ justifyContent: 'space-between', paddingVertical: 3 }}>
                <P style={{ fontWeight: main ? '800' : '400', color: past ? colors.muted : isSupport ? '#9AA5B1' : colors.text, fontSize: isSupport ? 14 : 16 }}>{name}</P>
                <Text style={{ color: past ? colors.muted : main ? colors.gold : colors.text, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{fmtTime(iso)}</Text>
              </Row>
            );
          })}
        </View>
      ))}
      {race.series === 'f1' && usable.length > 0 && (
        <Pressable onPress={() => setShowSupport(!showSupport)} style={{ marginTop: 6 }}>
          <Text style={{ color: colors.red, fontWeight: '700' }}>{showSupport ? '– Esconder F2/F3' : `+ Mostrar ${usable.map((r) => SERIES_LABEL[r.series]).join('/')} do fim de semana`}</Text>
        </Pressable>
      )}
      <Muted style={{ marginTop: 4 }}>Transmissão: F1 TV · SporTV / Band</Muted>
    </Card>
  );
}
