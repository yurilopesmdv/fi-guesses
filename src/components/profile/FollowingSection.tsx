import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { flag, fmtDate } from '@/lib/format';
import { openTeam } from '@/lib/nav';
import { getMyFollowsOverview } from '@/lib/repo';
import type { FollowedCircuit, FollowedDriver, FollowedTeam, MyFollowsOverview } from '@/lib/types';
import { Button, Card, H2, Loading, Muted, P, Row } from '@/ui/primitives';
import { colors } from '@/ui/theme';

const classified = (status: string | null) => status === 'Finished' || !!status?.startsWith('+');
const finish = (position: number, status: string | null) => (classified(status) ? `P${position}` : status === 'Disqualified' ? 'Desclassificado' : status === 'Did not start' ? 'Não largou' : 'Abandono');
const gain = (grid: number | null, position: number, status: string | null) => {
  if (!grid || !classified(status)) return null;
  const d = grid - position;
  return d > 0 ? `▲ ${d}` : d < 0 ? `▼ ${-d}` : '=';
};

function Chip({ children, tone }: { children: React.ReactNode; tone?: string }) {
  return <View style={{ backgroundColor: colors.card2, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}><Text style={{ color: tone ?? colors.text, fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{children}</Text></View>;
}
function ResultChips({ grid, position, status }: { grid: number | null; position: number; status: string | null }) {
  const g = gain(grid, position, status);
  return (
    <Row style={{ gap: 6, flexWrap: 'wrap' }}>
      <Chip tone={classified(status) ? (position <= 3 ? colors.gold : colors.text) : colors.red}>{finish(position, status)}</Chip>
      {grid ? <Chip tone={colors.muted}>largou P{grid}</Chip> : null}
      {g ? <Chip tone={g.startsWith('▲') ? colors.green : g.startsWith('▼') ? colors.red : colors.muted}>{g}</Chip> : null}
    </Row>
  );
}
const gpLabel = (r: { season: number; round: number; name: string }) => `${r.name} ${r.season}`;

/** Seção privada do perfil: o que a pessoa segue, atualizado ao abrir/voltar à tela. */
export function FollowingSection({ refreshKey }: { refreshKey: number }) {
  const [data, setData] = useState<MyFollowsOverview | null>(null);
  const [error, setError] = useState('');
  useFocusEffect(useCallback(() => {
    let active = true;
    getMyFollowsOverview().then((v) => { if (active) { setData(v); setError(''); } })
      .catch(() => { if (active) setError('Não foi possível atualizar seus acompanhamentos.'); });
    return () => { active = false; };
  }, [refreshKey]));

  const empty = data && !data.drivers.length && !data.teams.length && !data.circuits.length;
  return (
    <View>
      <H2>Acompanhando</H2>
      {error ? <Muted style={{ color: colors.gold, marginBottom: 8 }}>{error}{data ? ' Exibindo a última atualização.' : ''}</Muted> : null}
      {!data ? (error ? null : <Loading />) : empty ? (
        <Card>
          <P style={{ fontWeight: '800' }}>Siga pilotos, equipes e pistas</P>
          <Muted>Toque em “Seguir” na página de um piloto, equipe ou pista. O resumo do último GP aparece aqui. Seguir é privado e não muda seus palpites.</Muted>
          <Button title="Pilotos e equipes" onPress={() => router.push('/(tabs)/f1')} />
          <Button title="Pistas" variant="ghost" onPress={() => router.push('/(tabs)/circuits')} />
        </Card>
      ) : (
        <>
          {data.drivers.map((d) => <DriverCard key={d.driver_id} d={d} next={data.next_race} />)}
          {data.teams.map((t) => <TeamCard key={t.constructor_id} t={t} />)}
          {data.circuits.map((c) => <CircuitCard key={c.circuit_id} c={c} />)}
          <Muted style={{ fontSize: 12, marginBottom: 16 }}>
            {data.synced_at ? `Resultados F1 sincronizados em ${fmtDate(data.synced_at)} (Brasília). ` : ''}Resultados entram após a sincronização oficial, não na bandeirada.
          </Muted>
        </>
      )}
    </View>
  );
}

function Tile({ color, label, onPress, children }: { color: string; label: string; onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}>
      <Card style={{ borderLeftWidth: 5, borderLeftColor: color, gap: 4 }}>{children}</Card>
    </Pressable>
  );
}

function DriverCard({ d, next }: { d: FollowedDriver; next: MyFollowsOverview['next_race'] }) {
  const r = d.last_race;
  return (
    <Tile color={d.team_color ?? colors.red} label={`Abrir ${d.name}`} onPress={() => router.push(`/driver/${d.driver_id}`)}>
      <Row style={{ gap: 10 }}>
        {d.headshot_url ? <Image source={{ uri: d.headshot_url }} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card2 }} contentFit="cover" /> : null}
        <View style={{ flex: 1 }}>
          <P style={{ fontWeight: '800' }}>{d.name}</P>
          <Muted style={{ fontSize: 12 }}>Piloto · {d.team ?? '—'}{d.active ? '' : ' · fora do grid atual'}</Muted>
        </View>
        {d.standing ? <Text style={{ color: colors.gold, fontWeight: '800' }}>{d.standing.position}º · {Number(d.standing.points)} pts</Text> : null}
      </Row>
      {r ? <><Muted style={{ fontSize: 12 }}>{flag(r.country ?? null)} {gpLabel(r)}</Muted><ResultChips grid={r.grid} position={r.position} status={r.status} /></> : <Muted>Sem corrida registrada.</Muted>}
      {d.standing ? <Muted style={{ fontSize: 12 }}>Campeonato {d.standing.season}: {d.standing.position}º, {d.standing.wins} vitória{d.standing.wins === 1 ? '' : 's'}</Muted> : null}
      {d.active && next ? <Muted style={{ fontSize: 12 }}>Próxima etapa: {next.name} · {fmtDate(next.date_utc)}</Muted> : null}
      {!d.active ? <Muted style={{ fontSize: 12 }}>Histórico preservado; sem próxima corrida prevista.</Muted> : null}
    </Tile>
  );
}

function TeamCard({ t }: { t: FollowedTeam }) {
  const r = t.last_race;
  return (
    <Tile color={t.team_color} label={`Abrir ${t.team}`} onPress={() => openTeam(t.team)}>
      <Row>
        <View style={{ flex: 1 }}>
          <P style={{ fontWeight: '800' }}>{t.team}</P>
          <Muted style={{ fontSize: 12 }}>Equipe{t.active ? '' : ' · fora do grid atual'}</Muted>
        </View>
        {t.standing ? <Text style={{ color: colors.gold, fontWeight: '800' }}>{t.standing.position}º · {Number(t.standing.points)} pts</Text> : null}
      </Row>
      {r ? (
        <>
          <Muted style={{ fontSize: 12 }}>{flag(r.country ?? null)} {gpLabel(r)}</Muted>
          {(r.drivers ?? []).map((d) => (
            <Row key={d.code} style={{ gap: 8 }}><Text style={{ color: colors.text, fontSize: 13, width: 110 }} numberOfLines={1}>{d.name ?? d.code}</Text><ResultChips grid={d.grid} position={d.position} status={d.status} /></Row>
          ))}
        </>
      ) : <Muted>Sem corrida registrada.</Muted>}
    </Tile>
  );
}

function CircuitCard({ c }: { c: FollowedCircuit }) {
  return (
    <Tile color={colors.border} label={`Abrir ${c.name}`} onPress={() => router.push(`/circuit/${c.circuit_id}`)}>
      <P style={{ fontWeight: '800' }}>{flag(c.country)} {c.name}</P>
      <Muted style={{ fontSize: 12 }}>Pista · {c.locality}</Muted>
      {c.next_race ? <Muted style={{ fontSize: 13, color: colors.text }}>Próxima: {c.next_race.name} · {fmtDate(c.next_race.date_utc)}</Muted> : <Muted style={{ fontSize: 13 }}>Fora do calendário atual.</Muted>}
      {c.last_winner ? <Muted style={{ fontSize: 13 }}>Último vencedor: {c.last_winner.driver_name} ({c.last_winner.season})</Muted> : null}
    </Tile>
  );
}
