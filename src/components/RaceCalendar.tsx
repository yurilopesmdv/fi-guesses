import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { flag, raceSessions } from '@/lib/format';
import type { Race } from '@/lib/types';
import { Card, H2, Muted } from '@/ui/primitives';
import { colors } from '@/ui/theme';

const TZ = 'America/Sao_Paulo';
const WEEK = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
/** Data civil em Brasília (yyyy-mm-dd), independente do fuso do aparelho. */
const ymd = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ });

type Mark = { race: Race; main: boolean };

/** Visão Mês: dia da corrida com bandeira, demais sessões do fim de semana marcadas. */
export function RaceCalendar({ races }: { races: Race[] }) {
  const marks = new Map<string, Mark>();
  for (const r of races) {
    const days = r.times_tbc ? [] : raceSessions(r).map(([, iso]) => ymd(iso));
    for (const d of days) if (!marks.has(d)) marks.set(d, { race: r, main: false });
    marks.set(ymd(r.date_utc), { race: r, main: true });
  }
  const months = [...new Set([...marks.keys()].map((d) => d.slice(0, 7)))].sort();
  const today = ymd(new Date().toISOString());
  if (!months.length) return <Muted>Sem etapas nesta temporada.</Muted>;
  return (
    <>
      {months.map((m) => {
        const [y, mo] = m.split('-').map(Number);
        const first = new Date(Date.UTC(y, mo - 1, 1)).getUTCDay();
        const total = new Date(Date.UTC(y, mo, 0)).getUTCDate();
        const cells = [...Array(first).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
        const title = new Date(Date.UTC(y, mo - 1, 15)).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
        return (
          <Card key={m}>
            <H2 style={{ textTransform: 'capitalize' }}>{title}</H2>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {WEEK.map((w, i) => <Text key={`w${i}`} style={{ width: '14.28%', textAlign: 'center', color: colors.muted, fontSize: 12, marginBottom: 4 }}>{w}</Text>)}
              {cells.map((d, i) => {
                if (!d) return <View key={`e${i}`} style={{ width: '14.28%', height: 48 }} />;
                const key = `${m}-${String(d).padStart(2, '0')}`;
                const mark = marks.get(key);
                const content = (
                  <View style={{ height: 44, margin: 2, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: mark?.main ? colors.red : mark ? colors.card2 : 'transparent', borderWidth: key === today ? 1 : 0, borderColor: colors.gold }}>
                    <Text style={{ color: mark ? colors.text : colors.muted, fontWeight: mark ? '800' : '400', fontSize: 13 }}>{d}</Text>
                    {mark?.main ? <Text style={{ fontSize: 12 }}>{flag(mark.race.country)}</Text> : null}
                  </View>
                );
                return mark ? (
                  <Pressable key={key} style={{ width: '14.28%' }} accessibilityRole="button" accessibilityLabel={`${d}: ${mark.race.name}${mark.main ? ', corrida' : ', sessões'}`}
                    onPress={() => router.push(`/race/${mark.race.id}`)}>{content}</Pressable>
                ) : <View key={key} style={{ width: '14.28%' }}>{content}</View>;
              })}
            </View>
            {races.filter((r) => ymd(r.date_utc).startsWith(m)).map((r) => (
              <Muted key={r.id} style={{ fontSize: 12, marginTop: 4 }}>{flag(r.country)} R{r.round} · {r.name}{r.times_tbc ? ' · horários a confirmar' : ''}</Muted>
            ))}
          </Card>
        );
      })}
      <Muted style={{ fontSize: 12 }}>Vermelho: dia da corrida · cinza: treinos/classificação · horário de Brasília</Muted>
    </>
  );
}
