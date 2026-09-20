import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect, Stack, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { Image } from 'expo-image';
import { BarChart, HBars, ResultStrip } from '@/components/driver/charts';
import { DriverSearch } from '@/components/driver/DriverSearch';
import { flag } from '@/lib/format';
import { openTeam } from '@/lib/nav';
import { getDriverProfile, headToHead, listDriverSeasonRaces } from '@/lib/repo';
import type { DriverProfile, DriverRaceRow, DriverSearchRow, HeadToHead } from '@/lib/types';
import { Button, Card, H2, Loading, Muted, P, Pill, Row, Screen } from '@/ui/primitives';
import { colors, radius, space } from '@/ui/theme';

const n = (v: number | string | null | undefined, d = 0) => (v == null ? '—' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: d }));
const ord = (v: number | null | undefined) => (v == null ? '—' : `${v}º`);

export default function DriverScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const auth = useAuth();
  const [p, setP] = useState<DriverProfile | null>(null);
  const [season, setSeason] = useState<number | null>(null);
  const [races, setRaces] = useState<DriverRaceRow[]>([]);
  const [other, setOther] = useState<DriverProfile | null>(null);
  const [h2h, setH2h] = useState<HeadToHead[]>([]);
  const [search, setSearch] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.session) return;
    getDriverProfile(id).then((prof) => { if (!prof?.driver) throw new Error('Piloto não encontrado'); setP(prof); setSeason(prof.career.last_season); }).catch((e) => setError(e.message));
  }, [id, auth.session]);
  useEffect(() => { if (season) listDriverSeasonRaces(id, season).then(setRaces); }, [id, season]);

  const pick = async (d: DriverSearchRow) => {
    const [prof, hh] = await Promise.all([getDriverProfile(d.driver_id), headToHead(id, d.driver_id)]);
    setOther(prof); setH2h(hh);
  };

  if (!auth.loading && !auth.session) return <Redirect href="/login" />;
  if (error) return <Screen><Muted>{error}</Muted></Screen>;
  if (!p || !p.driver) return <Screen scroll={false}><Loading /></Screen>;
  const { driver, career, ranks, seasons } = p;
  const color = driver.team_color ?? colors.red;
  const cur = seasons.find((s) => s.season === season);
  const finished = races.filter((r) => r.classified);

  return (
    <Screen>
      <Stack.Screen options={{ title: driver.name }} />

      {/* Cabeçalho */}
      <Card style={{ borderLeftWidth: 6, borderLeftColor: color }}>
        <Row style={{ alignItems: 'center', gap: space(1.5) }}>
          {driver.headshot_url && (
            <Image source={{ uri: driver.headshot_url }} style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: colors.card2, borderWidth: 2, borderColor: color }} contentFit="cover" transition={200} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{driver.name}</Text>
            <Muted>{driver.team ?? '—'}{driver.number ? ` · #${driver.number}` : ''} · {driver.code}</Muted>
            <Muted>{career.first_season}–{career.last_season} · {career.seasons} temporada{career.seasons > 1 ? 's' : ''}</Muted>
          </View>
        </Row>
        <Row style={{ marginTop: space(1), flexWrap: 'wrap' }}>
          {career.titles > 0 && <Pill color="#3b2f00">🏆 {career.titles}× campeão mundial</Pill>}
          {p.teams && <Muted>{p.teams}</Muted>}
        </Row>
      </Card>

      {/* Carreira */}
      <H2>🏁 Carreira</H2>
      <View style={s.grid}>
        <Tile label="Títulos" value={n(career.titles)} rank={ranks.titles_rank} total={ranks.total_drivers} show={career.titles > 0} />
        <Tile label="Vitórias" value={n(career.wins)} rank={ranks.wins_rank} total={ranks.total_drivers} show={career.wins > 0} />
        <Tile label="Pódios" value={n(career.podiums)} rank={ranks.podiums_rank} total={ranks.total_drivers} show={career.podiums > 0} />
        <Tile label="Poles" value={n(career.poles)} rank={ranks.poles_rank} total={ranks.total_drivers} show={career.poles > 0} />
        <Tile label="Voltas + rápidas" value={n(career.fastest_laps)} />
        <Tile label="Corridas" value={n(career.races)} rank={ranks.races_rank} total={ranks.total_drivers} show />
        <Tile label="Pontos" value={n(career.points, 1)} rank={ranks.points_rank} total={ranks.total_drivers} show={career.points > 0} />
        <Tile label="Abandonos" value={`${n(career.dnfs)} (${Math.round((career.dnfs / Math.max(1, career.races)) * 100)}%)`} />
        <Tile label="Melhor resultado" value={ord(career.best_finish)} />
        <Tile label="Média de chegada" value={n(career.avg_finish, 1)} />
        <Tile label="Vitórias / corrida" value={`${Math.round((career.wins / Math.max(1, career.races)) * 100)}%`} />
        <Tile label="Pódios / corrida" value={`${Math.round((career.podiums / Math.max(1, career.races)) * 100)}%`} />
      </View>

      {/* Equipes */}
      {p.by_team.length > 0 && (
        <>
          <H2 style={{ marginTop: space(1) }}>🏎️ Equipes na carreira</H2>
          <Card>
            {p.by_team.map((t) => (
              <Pressable key={t.team} onPress={() => openTeam(t.team)} style={{ marginBottom: space(1.5) }}>
                <Row>
                  <View style={{ width: 5, alignSelf: 'stretch', borderRadius: 3, backgroundColor: t.team_color ?? colors.border }} />
                  <View style={{ flex: 1 }}>
                    <P style={{ fontWeight: '800' }}>{t.team}{t.titles > 0 ? `  🏆 ${t.titles > 1 ? `×${t.titles}` : ''}` : ''}</P>
                    <Muted>{t.first_season === t.last_season ? t.first_season : `${t.first_season}–${t.last_season}`} · {t.seasons} temporada{t.seasons > 1 ? 's' : ''} · {t.races} corridas</Muted>
                  </View>
                  <Text style={{ color: colors.muted }}>›</Text>
                </Row>
                <Row style={{ marginTop: 6, flexWrap: 'wrap' }}>
                  <Pill color={colors.card2}>Vitórias {t.wins}</Pill>
                  <Pill color={colors.card2}>Pódios {t.podiums} ({Math.round((t.podiums / Math.max(1, t.races)) * 100)}%)</Pill>
                  <Pill color={colors.card2}>Poles {t.poles}</Pill>
                  <Pill color={colors.card2}>Pontos {n(t.points, 1)}</Pill>
                  <Pill color={colors.card2}>Abandonos {t.dnfs}</Pill>
                </Row>
              </Pressable>
            ))}
          </Card>
        </>
      )}

      {/* Temporada */}
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
          <Row style={{ justifyContent: 'space-between', marginBottom: space(1) }}>
            <P style={{ fontWeight: '800' }}>{cur.season} · {cur.team ?? '—'}</P>
            <Pill color={cur.champion ? colors.gold : colors.card2}>{cur.champion ? 'CAMPEÃO' : cur.position ? `${cur.position}º no campeonato` : 'sem classificação'}</Pill>
          </Row>
          <View style={s.grid}>
            <Tile small label="Pontos" value={n(cur.champ_points, 1)} />
            <Tile small label="Vitórias" value={n(cur.wins)} />
            <Tile small label="Pódios" value={n(cur.podiums)} />
            <Tile small label="Poles" value={n(cur.poles)} />
            <Tile small label="Méd. chegada" value={n(cur.avg_finish, 1)} />
            <Tile small label="Méd. grid" value={n(cur.avg_grid, 1)} />
            <Tile small label="Terminou" value={`${Math.round(((cur.races - cur.dnfs) / Math.max(1, cur.races)) * 100)}%`} />
            <Tile small label="Ganhou/largada" value={finished.length ? n(finished.reduce((t, r) => t + ((r.grid ?? r.finish) - r.finish), 0) / finished.length, 1) : '—'} />
          </View>
          {races.length > 0 && (
            <>
              <Muted style={{ marginTop: space(1), marginBottom: 4 }}>Resultado por corrida</Muted>
              <ResultStrip results={races.map((r) => ({ finish: r.finish, classified: r.classified, points: r.points, label: r.country?.slice(0, 3).toUpperCase() ?? String(r.round) }))} />
              <View style={{ marginTop: space(1) }}>
                <Row style={s.tr}><Text style={[s.th, { flex: 1 }]}>GP</Text><Text style={[s.th, { width: 76 }]}>Grid → Cheg.</Text><Text style={[s.th, { width: 36, textAlign: 'right' }]}>Pts</Text></Row>
                {races.map((r) => (
                  <Row key={r.round} style={s.tr}>
                    <Text style={[s.td, { flex: 1 }]} numberOfLines={1}>{flag(r.country)} {r.race_name}{r.fastest_lap ? ' ⏱️' : ''}</Text>
                    <Text style={[s.td, { width: 76 }, r.finish === 1 && { color: colors.gold, fontWeight: '900' }, !r.classified && { color: colors.red }]}>{r.grid || '–'} → {r.classified ? r.finish : 'DNF'}</Text>
                    <Text style={[s.td, { width: 36, textAlign: 'right', fontWeight: '700' }]}>{n(r.points, 1)}</Text>
                  </Row>
                ))}
              </View>
            </>
          )}
        </Card>
      )}

      {/* Gráficos */}
      <H2 style={{ marginTop: space(1) }}>📊 Evolução</H2>
      <Card>
        <Muted style={{ marginBottom: 6 }}>Pontos por temporada</Muted>
        <BarChart data={seasons.map((sd) => ({ label: String(sd.season).slice(2), value: Number(sd.champ_points ?? 0), color: sd.champion ? colors.gold : color }))} format={(v) => n(v)} />
        <Muted style={{ marginTop: space(1.5), marginBottom: 6 }}>Posição no campeonato (barra maior = melhor)</Muted>
        <BarChart data={seasons.map((sd) => ({ label: String(sd.season).slice(2), value: sd.position ?? 25, color: sd.position === 1 ? colors.gold : sd.position && sd.position <= 3 ? colors.silver : sd.position && sd.position <= 10 ? '#4B5563' : '#2A2A36' }))} invert max={25} height={80} format={(v) => (v >= 25 ? '' : `${v}º`)} />
        <Muted style={{ marginTop: space(1.5), marginBottom: 6 }}>Distribuição dos resultados na carreira</Muted>
        <HBars data={[
          { label: 'Vitórias', value: career.wins, color: colors.gold },
          { label: '2º e 3º lugares', value: career.podiums - career.wins, color: colors.silver },
          { label: 'Terminou fora do pódio', value: Math.max(0, career.races - career.podiums - career.dnfs), color: '#166534' },
          { label: 'Abandonos', value: career.dnfs, color: '#7F1D1D' },
        ]} />
      </Card>

      {/* Comparativo */}
      <H2 style={{ marginTop: space(1) }}>⚔️ Comparar</H2>
      <Card>
        {!other ? (
          <>
            <Muted>Escolha outro piloto de qualquer época: carreira lado a lado, evolução por ano de carreira e confronto direto quando foram companheiros.</Muted>
            <Button title="Comparar com…" onPress={() => setSearch(true)} />
          </>
        ) : (
          <Compare a={p} b={other} h2h={h2h} onChange={() => setSearch(true)} />
        )}
      </Card>
      <DriverSearch visible={search} onClose={() => setSearch(false)} onSelect={pick} exclude={id} />
    </Screen>
  );
}

function Tile({ label, value, rank, total, show, small }: { label: string; value: string; rank?: number; total?: number; show?: boolean; small?: boolean }) {
  return (
    <View style={[s.tile, small && { width: '23%', padding: 8 }]}>
      <Text style={[s.tileVal, small && { fontSize: 16 }]}>{value}</Text>
      <Text style={s.tileLbl} numberOfLines={1}>{label}</Text>
      {show && rank != null && rank <= 50 && <Text style={s.rank}>#{rank} histórico</Text>}
    </View>
  );
}

function Compare({ a, b, h2h, onChange }: { a: DriverProfile; b: DriverProfile; h2h: HeadToHead[]; onChange: () => void }) {
  const ca = a.career, cb = b.career;
  const rows: [string, number, number, boolean][] = [
    ['Títulos', ca.titles, cb.titles, true], ['Vitórias', ca.wins, cb.wins, true], ['Pódios', ca.podiums, cb.podiums, true], ['Poles', ca.poles, cb.poles, true],
    ['Voltas + rápidas', ca.fastest_laps, cb.fastest_laps, true], ['Corridas', ca.races, cb.races, true], ['Pontos', Number(ca.points), Number(cb.points), true],
    ['% vitórias', Math.round((ca.wins / Math.max(1, ca.races)) * 100), Math.round((cb.wins / Math.max(1, cb.races)) * 100), true],
    ['% pódios', Math.round((ca.podiums / Math.max(1, ca.races)) * 100), Math.round((cb.podiums / Math.max(1, cb.races)) * 100), true],
    ['% abandonos', Math.round((ca.dnfs / Math.max(1, ca.races)) * 100), Math.round((cb.dnfs / Math.max(1, cb.races)) * 100), false],
    ['Média de chegada', Number(ca.avg_finish ?? 99), Number(cb.avg_finish ?? 99), false],
  ];
  const colorA = a.driver.team_color ?? colors.red, colorB = b.driver.team_color ?? '#3B82F6';
  const years = Math.max(a.seasons.length, b.seasons.length);
  const cum = (p: DriverProfile) => { let t = 0; return p.seasons.map((sd) => (t += sd.wins)); };
  const cumA = cum(a), cumB = cum(b);
  return (
    <>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={[s.cmpName, { color: colorA }]}>{a.driver.name}</Text>
        <Pressable onPress={onChange}><Muted>trocar ↻</Muted></Pressable>
        <Text style={[s.cmpName, { color: colorB, textAlign: 'right' }]}>{b.driver.name}</Text>
      </Row>
      <Muted style={{ textAlign: 'center', marginBottom: 6 }}>{ca.first_season}–{ca.last_season} vs {cb.first_season}–{cb.last_season}</Muted>
      {rows.map(([label, va, vb, higher]) => {
        const aWins = higher ? va > vb : va < vb, bWins = higher ? vb > va : vb < va;
        return (
          <Row key={label} style={s.tr}>
            <Text style={[s.td, { width: 70, textAlign: 'left', fontWeight: aWins ? '900' : '400', color: aWins ? colorA : colors.text }]}>{n(va, 1)}</Text>
            <Text style={[s.th, { flex: 1, textAlign: 'center' }]}>{label}</Text>
            <Text style={[s.td, { width: 70, textAlign: 'right', fontWeight: bWins ? '900' : '400', color: bWins ? colorB : colors.text }]}>{n(vb, 1)}</Text>
          </Row>
        );
      })}
      <Muted style={{ marginTop: space(1.5), marginBottom: 6 }}>Vitórias acumuladas por ano de carreira (1º ano, 2º ano…)</Muted>
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
          <Muted style={{ marginTop: space(1.5), marginBottom: 6 }}>🤝 Companheiros de equipe — quem chegou na frente</Muted>
          {h2h.map((h) => (
            <Row key={h.season} style={s.tr}>
              <Text style={[s.td, { width: 70, color: h.a_ahead > h.b_ahead ? colorA : colors.text, fontWeight: h.a_ahead > h.b_ahead ? '900' : '400' }]}>{h.a_ahead} · {n(h.a_points)}pts</Text>
              <Text style={[s.th, { flex: 1, textAlign: 'center' }]}>{h.season} · {h.team}</Text>
              <Text style={[s.td, { width: 70, textAlign: 'right', color: h.b_ahead > h.a_ahead ? colorB : colors.text, fontWeight: h.b_ahead > h.a_ahead ? '900' : '400' }]}>{h.b_ahead} · {n(h.b_points)}pts</Text>
            </Row>
          ))}
          <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={{ color: colorA, fontWeight: '900' }}>{h2h.reduce((t, h) => t + Number(h.a_ahead), 0)}</Text>
            <Muted>total de corridas à frente</Muted>
            <Text style={{ color: colorB, fontWeight: '900' }}>{h2h.reduce((t, h) => t + Number(h.b_ahead), 0)}</Text>
          </Row>
        </>
      )}
    </>
  );
}

const s = StyleSheet.create({
  name: { color: colors.text, fontSize: 21, fontWeight: '900' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tile: { width: '31.5%', backgroundColor: colors.card, borderRadius: radius, padding: 10, borderWidth: 1, borderColor: colors.border },
  tileVal: { color: colors.text, fontSize: 20, fontWeight: '900', fontVariant: ['tabular-nums'] },
  tileLbl: { color: colors.muted, fontSize: 10 },
  rank: { color: colors.gold, fontSize: 10, fontWeight: '700', marginTop: 2 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.card2 },
  tr: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 6, gap: 6, alignItems: 'center' },
  th: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  td: { color: colors.text, fontSize: 13, fontVariant: ['tabular-nums'] },
  cmpName: { fontWeight: '900', fontSize: 15, flex: 1 },
});
