import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { YearPicker } from '@/components/YearPicker';
import { getSyncInfo } from '@/lib/repo';
import { SEASON } from '@/lib/useSeason';
import { useYear } from '@/lib/useYear';
import { Button, Card, Loading, Muted, P, Row, Screen } from '@/ui/primitives';
import { colors, space } from '@/ui/theme';
import { useEffect } from 'react';

export default function F1() {
  const [year, setYear] = useState(SEASON);
  const [tab, setTab] = useState<'drivers' | 'teams'>('drivers');
  const { drivers, ds, cs, loading, importing, refresh } = useYear(year);
  const [sync, setSync] = useState<{ last_round_with_results: number | null; synced_at: string } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { getSyncInfo(year).then(setSync); }, [year, loading]);

  const update = async () => {
    setBusy(true);
    try { await refresh(); } catch (e: any) { Alert.alert('Erro ao atualizar', e.message); } finally { setBusy(false); }
  };
  const byCode = Object.fromEntries(drivers.map((d) => [d.code, d]));
  const teamColor = (team: string | null) => drivers.find((d) => d.team === team)?.team_color ?? colors.border;

  return (
    <Screen>
      <YearPicker value={year} onChange={setYear} />
      <Card style={{ padding: space(1.5) }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <P style={{ fontWeight: '800' }}>Campeonato {year}</P>
            <Muted>{sync ? `Até a rodada ${sync.last_round_with_results} · atualizado ${new Date(sync.synced_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : importing ? 'Importando da API…' : 'Sem dados ainda'}</Muted>
          </View>
          {year === SEASON && <Button title={busy ? '' : '↻ Atualizar'} variant="ghost" onPress={update} loading={busy} style={{ marginTop: 0, paddingVertical: 10 }} />}
        </Row>
      </Card>
      <Row style={{ marginBottom: space(1.5) }}>
        {(['drivers', 'teams'] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={{ flex: 1 }}>
            <View style={{ padding: 10, borderRadius: 12, alignItems: 'center', backgroundColor: tab === t ? colors.red : colors.card2 }}>
              <Text style={{ color: colors.text, fontWeight: '800' }}>{t === 'drivers' ? 'Pilotos' : 'Construtores'}</Text>
            </View>
          </Pressable>
        ))}
      </Row>

      {loading ? <Loading /> : tab === 'drivers' ? ds.map((s) => {
        const d = byCode[s.driver_code];
        return (
          <Card key={s.driver_code} style={{ padding: space(1.5) }}>
            <Row>
              <Text style={{ color: colors.muted, fontWeight: '800', width: 28 }}>{s.position}</Text>
              <View style={{ width: 5, alignSelf: 'stretch', borderRadius: 3, backgroundColor: d?.team_color ?? colors.border }} />
              <View style={{ flex: 1 }}>
                <P style={{ fontWeight: '700' }}>{d?.name ?? s.driver_code}</P>
                <Muted>{s.team}{s.wins ? ` · ${s.wins} vitória${s.wins > 1 ? 's' : ''}` : ''}</Muted>
              </View>
              <Text style={{ color: colors.text, fontWeight: '900', fontSize: 18 }}>{s.points}</Text>
            </Row>
          </Card>
        );
      }) : cs.map((s) => (
        <Card key={s.team} style={{ padding: space(1.5) }}>
          <Row>
            <Text style={{ color: colors.muted, fontWeight: '800', width: 28 }}>{s.position}</Text>
            <View style={{ width: 5, alignSelf: 'stretch', borderRadius: 3, backgroundColor: s.team_color ?? teamColor(s.team) }} />
            <View style={{ flex: 1 }}>
              <P style={{ fontWeight: '700' }}>{s.team}</P>
              <Muted>{s.wins ? `${s.wins} vitória${s.wins > 1 ? 's' : ''}` : '—'}</Muted>
            </View>
            <Text style={{ color: colors.text, fontWeight: '900', fontSize: 18 }}>{s.points}</Text>
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
