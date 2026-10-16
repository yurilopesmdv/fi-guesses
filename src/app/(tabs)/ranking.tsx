import { useCallback, useState } from 'react';
import { AppState, Text, View } from 'react-native';
import { Redirect, useFocusEffect } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { listGlobalStandings } from '@/lib/repo';
import type { GlobalStanding } from '@/lib/types';
import { Button, Card, H2, Loading, Muted, P, Row, Screen } from '@/ui/primitives';
import { colors, space } from '@/ui/theme';

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function GlobalRanking() {
  const { session, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<GlobalStanding[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useFocusEffect(useCallback(() => {
    if (!session) return;
    let active = true;
    let pending = false;
    const load = async () => {
      if (pending) return;
      pending = true;
      try {
        const data = await listGlobalStandings();
        if (active) { setRows(data); setError(null); setUpdatedAt(new Date()); }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Não foi possível carregar o ranking.');
      } finally { pending = false; }
    };
    void load();
    const timer = setInterval(() => { if (AppState.currentState === 'active') void load(); }, 30_000);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') void load(); });
    return () => { active = false; clearInterval(timer); subscription.remove(); };
  }, [session, refreshKey]));

  if (authLoading) return <Screen scroll={false}><Loading /></Screen>;
  if (!session) return <Redirect href="/login" />;

  return (
    <Screen>
      <Card>
        <H2>🏆 Ranking geral</H2>
        <P>Pontos somados em todos os bolões existentes, inclusive os encerrados.</P>
        <Muted style={{ marginTop: space(1) }}>Cada bolão conta separadamente. Bolões excluídos deixam de contar. Empates em pontos compartilham a posição.</Muted>
        <Muted style={{ marginTop: space(1) }}>Atualiza a cada 30 s nesta tela{updatedAt ? ` · ${updatedAt.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', second: '2-digit' })} (Brasília)` : ''}.</Muted>
        <Button title="Atualizar ranking" variant="ghost" onPress={() => setRefreshKey((k) => k + 1)} />
      </Card>
      {error && <Card><P style={{ color: colors.gold }}>Não foi possível atualizar o ranking.</P><Muted>{error}</Muted>{rows && <Muted>Exibindo a última atualização disponível.</Muted>}</Card>}
      {rows === null && !error && <Loading />}
      {rows?.length === 0 && <Card><H2>A disputa ainda vai começar</H2><Muted>Os participantes aparecem aqui ao entrar em um bolão, mesmo antes da primeira apuração.</Muted></Card>}
      {rows?.map((r) => (
        <Card key={r.user_id} style={r.user_id === session.user.id ? { borderColor: colors.red } : undefined}>
          <Row>
            <Text style={{ fontSize: 22, minWidth: 36 }}>{MEDALS[r.rank] ?? `${r.rank}º`}</Text>
            <Text style={{ fontSize: 22 }}>{r.avatar}</Text>
            <View style={{ flex: 1 }}>
              <P style={{ fontWeight: '800' }}>{r.name}{r.user_id === session.user.id ? ' · você' : ''}</P>
              <Muted>{r.pools_played} {r.pools_played === 1 ? 'bolão' : 'bolões'} · {r.races_scored} {r.races_scored === 1 ? 'apuração' : 'apurações'}</Muted>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: colors.gold, fontSize: 24, fontWeight: '900' }}>{r.total}</Text>
              <Muted>pontos</Muted>
            </View>
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
