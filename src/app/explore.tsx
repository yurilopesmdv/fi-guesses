import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import type { Ionicons } from '@expo/vector-icons';
import { InsightAction } from '@/components/insights/InsightUI';
import { RecordsUntil } from '@/components/RecordsUntil';
import { useAuth } from '@/lib/auth';
import { getHistoryFeats, type FeatKind, type FeatRow } from '@/lib/repo';
import { ageFromDays } from '@/lib/nationality';
import { Button, Card, H1, Loading, Muted, Row, Screen } from '@/ui/primitives';
import { colors } from '@/ui/theme';

const FEATS: { kind: FeatKind; title: string; icon: React.ComponentProps<typeof Ionicons>['name']; hint: string }[] = [
  { kind: 'win_from_back', title: 'Vitórias de P10 ou pior', icon: 'rocket-outline', hint: 'Quem venceu largando do meio do grid para trás.' },
  { kind: 'pole_no_points', title: 'Largou em P1 e não pontuou', icon: 'trending-down-outline', hint: 'Primeira posição no grid sem pontos no fim.' },
  { kind: 'first_win', title: 'Primeiras vitórias', icon: 'star-outline', hint: 'A primeira vitória de cada piloto e em qual largada veio.' },
  { kind: 'longest_wait', title: 'Maior espera pela 1ª vitória', icon: 'hourglass-outline', hint: 'Pilotos que mais largaram antes de vencer.' },
  { kind: 'win_on_debut', title: 'Venceu na estreia', icon: 'flash-outline', hint: 'Vitória na primeira largada da carreira.' },
  { kind: 'one_two', title: 'Dobradinhas', icon: 'people-outline', hint: '1º e 2º da mesma equipe.' },
  { kind: 'youngest_winner', title: 'Vencedores mais jovens', icon: 'happy-outline', hint: 'Idade no dia da vitória.' },
  { kind: 'oldest_winner', title: 'Vencedores mais velhos', icon: 'time-outline', hint: 'Idade no dia da vitória.' },
];
const ERAS = [{ label: 'Todas', from: 1950, to: 2100 }, { label: '2014+', from: 2014, to: 2100 }, { label: '2000–13', from: 2000, to: 2013 }, { label: '1980–99', from: 1980, to: 1999 }, { label: '1950–79', from: 1950, to: 1979 }];

/** Descoberta guiada do acervo (H10): perguntas fixas, resultado agregado no servidor (até 100 linhas). */
export default function Explore() {
  const auth = useAuth();
  const [kind, setKind] = useState<FeatKind>('win_from_back');
  const [era, setEra] = useState(0);
  const [data, setData] = useState<{ total: number; rows: FeatRow[] } | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setData(null); setError('');
    if (auth.session) getHistoryFeats(kind, ERAS[era].from, ERAS[era].to).then((v) => { if (active) setData(v ?? { total: 0, rows: [] }); }).catch(() => { if (active) setError('Não foi possível carregar agora.'); });
    return () => { active = false; };
  }, [kind, era, auth.session, retry]);
  if (!auth.loading && !auth.session) return <Redirect href="/login" />;
  const feat = FEATS.find((f) => f.kind === kind)!;
  return (
    <Screen>
      <Muted style={{ color: colors.red, fontWeight: '800', letterSpacing: 2 }}>F1 DESDE 1950</Muted>
      <H1>Explorar a história</H1>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 12 }}>
        {FEATS.map((f) => <InsightAction key={f.kind} title={f.title} label={f.title} icon={f.icon} active={f.kind === kind} onPress={() => setKind(f.kind)} />)}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
        {ERAS.map((e, i) => (
          <Pressable key={e.label} accessibilityRole="button" accessibilityState={{ selected: i === era }} onPress={() => setEra(i)}
            style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: 20, justifyContent: 'center', backgroundColor: i === era ? colors.red : colors.card2 }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>{e.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Muted>{feat.hint}{data ? ` · ${data.total} resultado${data.total === 1 ? '' : 's'}${data.total > 100 ? ' (mostrando 100)' : ''}` : ''}</Muted>
      {error ? <Card><Muted>{error}</Muted><Button title="Tentar novamente" onPress={() => setRetry((v) => v + 1)} /></Card> : !data ? <Loading /> : !data.rows.length ? <Card><Muted>Nenhum caso nesta época.</Muted></Card> :
        <View style={{ marginTop: 10 }}>
          {data.rows.map((r) => (
            <Pressable key={`${r.season}-${r.round}-${r.driver_id}`} accessibilityRole="button" accessibilityLabel={`${r.name ?? r.driver_id}, ${r.race_name} ${r.season}`} onPress={() => router.push(`/driver/${r.driver_id}`)}>
              <Card style={{ paddingVertical: 12 }}>
                <Row style={{ gap: 12 }}>
                  <View style={{ width: 52, alignItems: 'center' }}>
                    <Text style={{ color: colors.gold, fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{kind === 'youngest_winner' || kind === 'oldest_winner' ? `${ageFromDays(r.extra ?? 0).y}a` : kind === 'longest_wait' || kind === 'first_win' ? `${r.extra}ª` : kind === 'win_from_back' ? `P${r.grid}` : r.season}</Text>
                    <Text style={{ color: colors.muted, fontSize: 10 }}>{kind === 'youngest_winner' || kind === 'oldest_winner' ? `${ageFromDays(r.extra ?? 0).d} dias` : kind === 'longest_wait' || kind === 'first_win' ? 'largada' : kind === 'win_from_back' ? 'largada' : `R${r.round}`}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: '800' }}>{r.name ?? r.driver_id}</Text>
                    <Muted style={{ fontSize: 12 }}>{r.race_name} {r.season}{r.team ? ` · ${r.team}` : ''}</Muted>
                  </View>
                  <Text style={{ color: colors.muted }}>›</Text>
                </Row>
              </Card>
            </Pressable>
          ))}
        </View>}
      <RecordsUntil />
    </Screen>
  );
}
