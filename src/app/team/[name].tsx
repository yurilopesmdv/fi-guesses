import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect, Stack, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { BarChart, HBars } from '@/components/driver/charts';
import { TeamSearch } from '@/components/driver/TeamSearch';
import { useAuth } from '@/lib/auth';
import { openDriver } from '@/lib/nav';
import { getTeamProfile, teamHeadToHead } from '@/lib/repo';
import type { TeamHeadToHead, TeamProfile, TeamSearchRow } from '@/lib/types';
import { Button, Card, H2, Loading, Muted, P, Pill, Row, Screen } from '@/ui/primitives';
import { colors, radius, space } from '@/ui/theme';

const n = (v: number | string | null | undefined, d = 0) => (v == null ? '—' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: d }));

export default function TeamScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const team = decodeURIComponent(name);
  const auth = useAuth();
  const [p, setP] = useState<TeamProfile | null>(null);
  const [other, setOther] = useState<TeamProfile | null>(null);
  const [h2h, setH2h] = useState<TeamHeadToHead[]>([]);
  const [search, setSearch] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [season, setSeason] = useState<number | null>(null);

  useEffect(() => {
    if (!auth.session) return;
    getTeamProfile(team).then((prof) => { if (!prof?.career) throw new Error('Equipe não encontrada'); setP(prof); setSeason(prof.career.last_season); }).catch((e) => setError(e.message));
  }, [team, auth.session]);

  const pick = async (t: TeamSearchRow) => {
    const [prof, hh] = await Promise.all([getTeamProfile(t.team), teamHeadToHead(team, t.team)]);
    setOther(prof); setH2h(hh);
  };

  if (!auth.loading && !auth.session) return <Redirect href="/login" />;
  if (error) return <Screen><Muted>{error}</Muted></Screen>;
  if (!p) return <Screen scroll={false}><Loading /></Screen>;
  const { career, ranks, seasons } = p;
  const color = p.team.color ?? colors.red;
  const cur = seasons.find((sd) => sd.season === season);
  const active = career.last_season >= new Date().getFullYear();

  return (
    <Screen>
      <Stack.Screen options={{ title: team }} />

      <Card style={{ borderLeftWidth: 6, borderLeftColor: color }}>
        <Text style={s.name}>{team}</Text>
        <Muted>{career.first_season}–{active ? 'hoje' : career.last_season} · {career.seasons} temporada{career.seasons > 1 ? 's' : ''} · {n(career.races)} corridas</Muted>
        <Row style={{ marginTop: space(1), flexWrap: 'wrap' }}>
          {career.titles > 0 && <Pill color="#3b2f00">🏆 {career.titles}× construtores</Pill>}
          {career.driver_titles > 0 && <Pill color="#3b2f00">🏆 {career.driver_titles}× pilotos</Pill>}
          {!active && <Pill>encerrada</Pill>}
        </Row>
        {p.team.drivers && p.team.drivers.length > 0 && (
          <Row style={{ marginTop: space(1.5), flexWrap: 'wrap' }}>
            {p.team.drivers.map((d) => (
              <Pressable key={d.driver_id} onPress={() => openDriver({ driver_id: d.driver_id, series: 'f1' })} style={s.driverChip}>
                {d.headshot_url ? <Image source={{ uri: d.headshot_url }} style={s.avatar} contentFit="cover" /> : <View style={[s.avatar, { backgroundColor: colors.card2 }]} />}
                <View><P style={{ fontWeight: '700', fontSize: 14 }}>{d.name}</P><Muted style={{ fontSize: 11 }}>{active ? `${career.last_season} · ` : ''}#{d.number ?? '—'} · {d.code}</Muted></View>
              </Pressable>
            ))}
          </Row>
        )}
      </Card>

      <H2>🏁 História</H2>
      <View style={s.grid}>
        <Tile label="Títulos construtores" value={n(career.titles)} rank={ranks.titles_rank} show={career.titles > 0} />
        <Tile label="Títulos de pilotos" value={n(career.driver_titles)} />
        <Tile label="Vitórias" value={n(career.wins)} rank={ranks.wins_rank} show={career.wins > 0} />
        <Tile label="Pódios" value={n(career.podiums)} rank={ranks.podiums_rank} show={career.podiums > 0} />
        <Tile label="Poles" value={n(career.poles)} rank={ranks.poles_rank} show={career.poles > 0} />
        <Tile label="Dobradinhas (1º-2º)" value={n(career.one_twos)} />
        <Tile label="Pontos" value={n(career.points, 1)} rank={ranks.points_rank} show={career.points > 0} />
        <Tile label="Corridas" value={n(career.races)} rank={ranks.races_rank} show />
        <Tile label="Voltas + rápidas" value={n(career.fastest_laps)} />
        <Tile label="Abandonos (carros)" value={n(career.dnfs)} />
        <Tile label="Vitórias / corrida" value={`${Math.round((career.wins / Math.max(1, career.races)) * 100)}%`} />
        <Tile label="Pódios / corrida" value={`${Math.round((career.podiums / Math.max(1, career.races)) * 100)}%`} />
      </View>

      <H2 style={{ marginTop: space(1) }}>⭐ Maiores pilotos da equipe</H2>
      <Card>
        {p.best_drivers.map((d, i) => (
          <Pressable key={d.driver_id} onPress={() => openDriver({ driver_id: d.driver_id, series: 'f1' })}>
            <Row style={[s.tr, { paddingVertical: 8 }]}>
              <Text style={{ color: colors.muted, fontWeight: '800', width: 22 }}>{i + 1}</Text>
              {d.headshot_url ? <Image source={{ uri: d.headshot_url }} style={s.avatarSm} contentFit="cover" /> : <View style={[s.avatarSm, { backgroundColor: colors.card2 }]} />}
              <View style={{ flex: 1 }}>
                <P style={{ fontWeight: '700' }}>{d.name}{d.titles > 0 ? ` 🏆${d.titles > 1 ? `×${d.titles}` : ''}` : ''}</P>
                <Muted style={{ fontSize: 12 }}>{d.first_season === d.last_season ? d.first_season : `${d.first_season}–${d.last_season}`} · {d.races} corridas · {d.podiums} pódios · {n(d.points, 1)} pts</Muted>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: colors.gold, fontWeight: '900', fontSize: 18 }}>{d.wins}</Text>
                <Muted style={{ fontSize: 10 }}>vitórias</Muted>
              </View>
            </Row>
          </Pressable>
        ))}
        <Muted style={{ marginTop: 6, fontSize: 11 }}>Ordenado por vitórias com a equipe. Toque pra abrir o piloto.</Muted>
      </Card>

      <H2 style={{ marginTop: space(1) }}>📅 Temporada</H2>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: space(1.5) }}>
        {[...seasons].reverse().map((sd) => (
          <Pressable key={sd.season} onPress={() => setSeason(sd.season)} style={[s.chip, sd.season === season && { backgroundColor: color }]}>
            <Text style={{ color: colors.text, fontWeight: '800' }}>{sd.season}{sd.champion ? ' 🏆' : ''}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {cur && (
        <Card>
          <Row style={{ justifyContent: 'space-between', marginBottom: 4 }}>
            <P style={{ fontWeight: '800' }}>{cur.season}</P>
            <Pill color={cur.champion ? colors.gold : colors.card2}>{cur.champion ? 'CAMPEÃ' : cur.position ? `${cur.position}º entre construtores` : 'sem classificação'}</Pill>
          </Row>
          <Muted style={{ marginBottom: space(1) }}>Pilotos: {cur.drivers ?? '—'}</Muted>
          <View style={s.grid}>
            <Tile small label="Pontos" value={n(cur.champ_points, 1)} />
            <Tile small label="Vitórias" value={n(cur.wins)} />
            <Tile small label="Pódios" value={n(cur.podiums)} />
            <Tile small label="Poles" value={n(cur.poles)} />
            <Tile small label="Corridas" value={n(cur.races)} />
            <Tile small label="Abandonos" value={n(cur.dnfs)} />
            <Tile small label="Vit./corrida" value={`${Math.round((cur.wins / Math.max(1, cur.races)) * 100)}%`} />
            <Tile small label="Pódio/corrida" value={`${Math.round((cur.podiums / Math.max(1, cur.races * 2)) * 100)}%`} />
          </View>
        </Card>
      )}

      <H2 style={{ marginTop: space(1) }}>📊 Evolução</H2>
      <Card>
        <Muted style={{ marginBottom: 6 }}>Pontos por temporada</Muted>
        <BarChart data={seasons.map((sd) => ({ label: String(sd.season).slice(2), value: Number(sd.champ_points ?? 0), color: sd.champion ? colors.gold : color }))} format={(v) => n(v)} />
        <Muted style={{ marginTop: space(1.5), marginBottom: 6 }}>Posição entre construtores (barra maior = melhor)</Muted>
        <BarChart data={seasons.map((sd) => ({ label: String(sd.season).slice(2), value: sd.position ?? 15, color: sd.position === 1 ? colors.gold : sd.position && sd.position <= 3 ? colors.silver : sd.position && sd.position <= 6 ? '#4B5563' : '#2A2A36' }))} invert max={15} height={80} format={(v) => (v >= 15 ? '' : `${v}º`)} />
        <Muted style={{ marginTop: space(1.5), marginBottom: 6 }}>Vitórias por temporada</Muted>
        <BarChart data={seasons.map((sd) => ({ label: String(sd.season).slice(2), value: sd.wins, color }))} height={70} format={(v) => (v ? String(v) : '')} />
        <Muted style={{ marginTop: space(1.5), marginBottom: 6 }}>Resultados dos carros na história ({n(career.entries)} largadas)</Muted>
        <HBars data={[
          { label: 'Vitórias', value: career.wins, color: colors.gold },
          { label: '2º e 3º lugares', value: career.podiums - career.wins, color: colors.silver },
          { label: 'Terminou fora do pódio', value: Math.max(0, career.entries - career.podiums - career.dnfs), color: '#166534' },
          { label: 'Abandonos', value: career.dnfs, color: '#7F1D1D' },
        ]} />
      </Card>

      <H2 style={{ marginTop: space(1) }}>⚔️ Comparar</H2>
      <Card>
        {!other ? (
          <>
            <Muted>Escolha outra equipe de qualquer época: história lado a lado e, ano a ano, quem ficou na frente no mundial de construtores.</Muted>
            <Button title="Comparar com…" onPress={() => setSearch(true)} />
          </>
        ) : <Compare a={p} b={other} h2h={h2h} onChange={() => setSearch(true)} />}
      </Card>
      <TeamSearch visible={search} onClose={() => setSearch(false)} onSelect={pick} exclude={team} />
    </Screen>
  );
}

function Tile({ label, value, rank, show, small }: { label: string; value: string; rank?: number; show?: boolean; small?: boolean }) {
  return (
    <View style={[s.tile, small && { width: '23%', padding: 8 }]}>
      <Text style={[s.tileVal, small && { fontSize: 16 }]}>{value}</Text>
      <Text style={s.tileLbl} numberOfLines={1}>{label}</Text>
      {show && rank != null && rank <= 30 && <Text style={s.rank}>#{rank} histórico</Text>}
    </View>
  );
}

function Compare({ a, b, h2h, onChange }: { a: TeamProfile; b: TeamProfile; h2h: TeamHeadToHead[]; onChange: () => void }) {
  const ca = a.career, cb = b.career;
  const rows: [string, number, number, boolean][] = [
    ['Títulos construtores', ca.titles, cb.titles, true], ['Títulos de pilotos', ca.driver_titles, cb.driver_titles, true],
    ['Vitórias', ca.wins, cb.wins, true], ['Pódios', ca.podiums, cb.podiums, true], ['Poles', ca.poles, cb.poles, true],
    ['Dobradinhas', ca.one_twos, cb.one_twos, true], ['Corridas', ca.races, cb.races, true], ['Pontos', Number(ca.points), Number(cb.points), true],
    ['% vitórias', Math.round((ca.wins / Math.max(1, ca.races)) * 100), Math.round((cb.wins / Math.max(1, cb.races)) * 100), true],
    ['% pódios', Math.round((ca.podiums / Math.max(1, ca.races)) * 100), Math.round((cb.podiums / Math.max(1, cb.races)) * 100), true],
  ];
  const colorA = a.team.color ?? colors.red, colorB = b.team.color ?? '#3B82F6';
  const years = Math.max(a.seasons.length, b.seasons.length);
  const cum = (p: TeamProfile) => { let t = 0; return p.seasons.map((sd) => (t += sd.wins)); };
  const cumA = cum(a), cumB = cum(b);
  const aAhead = h2h.filter((h) => h.a_position && h.b_position && h.a_position < h.b_position).length;
  const bAhead = h2h.filter((h) => h.a_position && h.b_position && h.b_position < h.a_position).length;
  return (
    <>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={[s.cmpName, { color: colorA }]}>{a.team.name}</Text>
        <Pressable onPress={onChange}><Muted>trocar ↻</Muted></Pressable>
        <Text style={[s.cmpName, { color: colorB, textAlign: 'right' }]}>{b.team.name}</Text>
      </Row>
      <Muted style={{ textAlign: 'center', marginBottom: 6 }}>{ca.first_season}–{ca.last_season} vs {cb.first_season}–{cb.last_season}</Muted>
      {rows.map(([label, va, vb, higher]) => {
        const aW = higher ? va > vb : va < vb, bW = higher ? vb > va : vb < va;
        return (
          <Row key={label} style={s.tr}>
            <Text style={[s.td, { width: 70, fontWeight: aW ? '900' : '400', color: aW ? colorA : colors.text }]}>{n(va, 1)}</Text>
            <Text style={[s.th, { flex: 1, textAlign: 'center' }]}>{label}</Text>
            <Text style={[s.td, { width: 70, textAlign: 'right', fontWeight: bW ? '900' : '400', color: bW ? colorB : colors.text }]}>{n(vb, 1)}</Text>
          </Row>
        );
      })}
      <Muted style={{ marginTop: space(1.5), marginBottom: 6 }}>Vitórias acumuladas por ano de existência</Muted>
      <View style={{ flexDirection: 'row', gap: 2, height: 90, alignItems: 'flex-end' }}>
        {Array.from({ length: years }, (_, i) => {
          const m = Math.max(1, cumA.at(-1) ?? 0, cumB.at(-1) ?? 0);
          return (
            <View key={i} style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 1 }}>
              <View style={{ flex: 1, height: Math.max(2, ((cumA[i] ?? cumA.at(-1) ?? 0) / m) * 80), backgroundColor: i < cumA.length ? colorA : 'transparent', borderRadius: 2 }} />
              <View style={{ flex: 1, height: Math.max(2, ((cumB[i] ?? cumB.at(-1) ?? 0) / m) * 80), backgroundColor: i < cumB.length ? colorB : 'transparent', borderRadius: 2 }} />
            </View>
          );
        })}
      </View>
      <Row style={{ justifyContent: 'space-between' }}><Muted>ano 1</Muted><Muted>ano {years}</Muted></Row>
      {h2h.length > 0 && (
        <>
          <Muted style={{ marginTop: space(1.5), marginBottom: 6 }}>🤝 Temporadas juntas — posição no mundial de construtores ({h2h.length})</Muted>
          {h2h.slice(-12).map((h) => (
            <Row key={h.season} style={s.tr}>
              <Text style={[s.td, { width: 96, color: h.a_position && h.b_position && h.a_position < h.b_position ? colorA : colors.text, fontWeight: h.a_position && h.b_position && h.a_position < h.b_position ? '900' : '400' }]}>{h.a_position ? `${h.a_position}º` : '—'} · {n(h.a_points)}pts · {h.a_wins}v</Text>
              <Text style={[s.th, { flex: 1, textAlign: 'center' }]}>{h.season}</Text>
              <Text style={[s.td, { width: 96, textAlign: 'right', color: h.a_position && h.b_position && h.b_position < h.a_position ? colorB : colors.text, fontWeight: h.a_position && h.b_position && h.b_position < h.a_position ? '900' : '400' }]}>{h.b_position ? `${h.b_position}º` : '—'} · {n(h.b_points)}pts · {h.b_wins}v</Text>
            </Row>
          ))}
          <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={{ color: colorA, fontWeight: '900' }}>{aAhead}</Text>
            <Muted>temporadas à frente</Muted>
            <Text style={{ color: colorB, fontWeight: '900' }}>{bAhead}</Text>
          </Row>
        </>
      )}
    </>
  );
}

const s = StyleSheet.create({
  name: { color: colors.text, fontSize: 24, fontWeight: '900' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tile: { width: '31.5%', backgroundColor: colors.card, borderRadius: radius, padding: 10, borderWidth: 1, borderColor: colors.border },
  tileVal: { color: colors.text, fontSize: 20, fontWeight: '900', fontVariant: ['tabular-nums'] },
  tileLbl: { color: colors.muted, fontSize: 10 },
  rank: { color: colors.gold, fontSize: 10, fontWeight: '700', marginTop: 2 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.card2 },
  driverChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card2, borderRadius: 999, paddingRight: 12, padding: 4 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarSm: { width: 32, height: 32, borderRadius: 16 },
  tr: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 6, gap: 6, alignItems: 'center' },
  th: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  td: { color: colors.text, fontSize: 13, fontVariant: ['tabular-nums'] },
  cmpName: { fontWeight: '900', fontSize: 15, flex: 1 },
});
