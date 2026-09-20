import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COMPOUND, fmtLap, projectChampionship, type Standing } from '@/lib/openf1';
import { useLive } from '@/lib/useLive';
import { openDriver } from '@/lib/nav';
import { useSeason } from '@/lib/useSeason';
import { Card, H2, Loading, Muted, P, Pill, Row } from '@/ui/primitives';
import { colors, radius, space } from '@/ui/theme';

const FLAG_COLOR: Record<string, string> = { GREEN: colors.green, YELLOW: colors.gold, 'DOUBLE YELLOW': colors.gold, RED: colors.red, CHEQUERED: colors.text, CLEAR: colors.green, BLUE: '#3B82F6' };

export default function Live() {
  const insets = useSafeAreaInsets();
  const [sel, setSel] = useState<number | null>(null);
  const [proj, setProj] = useState<'off' | 'drivers' | 'teams'>('off');
  const live = useLive(sel);
  const { drivers: seasonDrivers } = useSeason();
  const { session, isLive, hasAccess, standings, raceControl, weather, loading, error, car } = live;

  if (loading) return <Loading />;

  const sessionLabel = session ? `${session.session_name === 'Race' ? 'Corrida' : session.session_name === 'Qualifying' ? 'Classificação' : session.session_name} · ${session.location}` : '';
  const isSprint = session?.session_name === 'Sprint';
  const isPointsSession = session?.session_name === 'Race' || isSprint;
  const projection = projectChampionship(standings, live.champ, live.champTeams, isSprint);
  const best = standings.reduce<number | null>((m, s) => (s.bestLap != null && (m == null || s.bestLap < m) ? s.bestLap : m), null);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: space(2), paddingBottom: insets.bottom + space(3) }}
      refreshControl={<RefreshControl refreshing={false} tintColor={colors.red} onRefresh={live.refresh} />}>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>{session?.country_name ?? 'OpenF1'} {session?.year ?? ''}</Text>
            <Muted>{sessionLabel}</Muted>
          </View>
          {isLive ? <Pill color={colors.red}>● AO VIVO</Pill> : <Pill>encerrada</Pill>}
        </Row>
        {weather && (
          <Row style={{ marginTop: space(1), flexWrap: 'wrap' }}>
            <Pill>🌡️ ar {weather.air_temperature.toFixed(0)}°</Pill>
            <Pill>🛣️ pista {weather.track_temperature.toFixed(0)}°</Pill>
            <Pill>💧 {weather.humidity}%</Pill>
            <Pill>💨 {weather.wind_speed.toFixed(1)} m/s</Pill>
            {weather.rainfall > 0 && <Pill color="#1e3a8a">🌧️ chuva</Pill>}
          </Row>
        )}
        {isLive && live.leaderLap > 0 && <Muted style={{ marginTop: 6 }}>Volta {live.leaderLap}{best ? ` · melhor volta ${fmtLap(best)}` : ''} · atualiza a cada {hasAccess ? 8 : 15} s</Muted>}
        {!isLive && <Muted style={{ marginTop: 6 }}>Fora de sessão: mostrando a última sessão completa.{hasAccess ? '' : ' Sem assinatura OpenF1, o ao vivo não está habilitado.'}</Muted>}
        {error && <Muted style={{ color: colors.gold, marginTop: 6 }}>{error}</Muted>}
      </Card>

      {raceControl.length > 0 && (
        <Card>
          <H2>🚩 Direção de prova</H2>
          {raceControl.slice(0, 5).map((rc, i) => (
            <Row key={i} style={{ alignItems: 'flex-start', marginBottom: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, marginTop: 6, backgroundColor: FLAG_COLOR[rc.flag ?? ''] ?? colors.muted }} />
              <View style={{ flex: 1 }}>
                <P style={{ fontSize: 14 }}>{rc.message}</P>
                <Muted style={{ fontSize: 12 }}>{rc.lap_number ? `volta ${rc.lap_number} · ` : ''}{new Date(rc.date).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}</Muted>
              </View>
            </Row>
          ))}
        </Card>
      )}

      <Card style={{ padding: space(1) }}>
        <Row style={[s.row, { paddingVertical: 4 }]}>
          <Text style={[s.th, { width: 26 }]}>P</Text>
          <Text style={[s.th, { width: 58 }]}>Piloto</Text>
          <Text style={[s.th, { width: 44 }]}>Pneu</Text>
          <Text style={[s.th, { flex: 1 }]}>Gap</Text>
          <Text style={[s.th, { flex: 1 }]}>Interv.</Text>
          <Text style={[s.th, { width: 66, textAlign: 'right' }]}>Última</Text>
        </Row>
        {standings.map((st) => (
          <DriverRow key={st.driver.driver_number} st={st} best={best} selected={sel === st.driver.driver_number} onPress={() => setSel(sel === st.driver.driver_number ? null : st.driver.driver_number)} car={sel === st.driver.driver_number ? car : null} isLive={isLive} onProfile={() => openDriver(seasonDrivers.find((d) => d.code === st.driver.name_acronym))} />
        ))}
      </Card>
      {isPointsSession && live.champ.length > 0 && (
        <Card style={{ borderColor: '#A855F7' }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <H2>🔮 Se a {isSprint ? 'sprint' : 'corrida'} acabasse agora</H2>
              <Muted style={{ marginTop: -6 }}>Simulação com as posições atuais — não é o resultado oficial.</Muted>
            </View>
          </Row>
          <Row style={{ marginTop: space(1), marginBottom: space(1) }}>
            {(['drivers', 'teams'] as const).map((t) => (
              <Pressable key={t} onPress={() => setProj(proj === t ? 'off' : t)} style={{ flex: 1 }}>
                <View style={{ padding: 8, borderRadius: 10, alignItems: 'center', backgroundColor: proj === t ? '#A855F7' : colors.card2 }}>
                  <Text style={{ color: colors.text, fontWeight: '800' }}>{t === 'drivers' ? 'Pilotos' : 'Construtores'}</Text>
                </View>
              </Pressable>
            ))}
          </Row>
          {proj === 'drivers' && projection.drivers.slice(0, 10).map((d, i) => (
            <Row key={d.driver.driver_number} style={{ justifyContent: 'space-between', paddingVertical: 4 }}>
              <Row style={{ flex: 1 }}>
                <Text style={{ color: colors.muted, fontWeight: '800', width: 24 }}>{i + 1}</Text>
                <View style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: `#${d.driver.team_colour}` }} />
                <P style={{ fontWeight: '700' }}>{d.driver.name_acronym}</P>
                {d.posStart != null && d.posStart !== i + 1 && <Muted style={{ color: d.posStart > i + 1 ? colors.green : colors.red }}>{d.posStart > i + 1 ? `▲${d.posStart - i - 1}` : `▼${i + 1 - d.posStart}`}</Muted>}
              </Row>
              <Muted>{d.start}{d.gain ? ` +${d.gain}` : ''}</Muted>
              <Text style={{ color: colors.text, fontWeight: '900', width: 48, textAlign: 'right' }}>{d.total}</Text>
            </Row>
          ))}
          {proj === 'teams' && projection.constructors.map((t, i) => (
            <Row key={t.team} style={{ justifyContent: 'space-between', paddingVertical: 4 }}>
              <Row style={{ flex: 1 }}>
                <Text style={{ color: colors.muted, fontWeight: '800', width: 24 }}>{i + 1}</Text>
                <P style={{ fontWeight: '700' }}>{t.team}</P>
                {t.posStart != null && t.posStart !== i + 1 && <Muted style={{ color: t.posStart > i + 1 ? colors.green : colors.red }}>{t.posStart > i + 1 ? `▲${t.posStart - i - 1}` : `▼${i + 1 - t.posStart}`}</Muted>}
              </Row>
              <Muted>{t.start}{t.gain ? ` +${t.gain}` : ''}</Muted>
              <Text style={{ color: colors.text, fontWeight: '900', width: 48, textAlign: 'right' }}>{t.total}</Text>
            </Row>
          ))}
          {proj === 'off' && <Muted>Toque em Pilotos ou Construtores pra ver.</Muted>}
        </Card>
      )}
      <Muted style={{ textAlign: 'center' }}>Dados: OpenF1 · atraso ~3 s ao vivo</Muted>
    </ScrollView>
  );
}

function DriverRow({ st, best, selected, onPress, car, isLive, onProfile }: { st: Standing; best: number | null; selected: boolean; onPress: () => void; car: any; isLive: boolean; onProfile: () => void }) {
  const c = st.compound ? COMPOUND[st.compound] : null;
  const isBest = st.bestLap != null && st.bestLap === best;
  return (
    <Pressable onPress={onPress}>
      <Row style={[s.row, selected && { backgroundColor: colors.card2 }]}>
        <Text style={[s.pos, { width: 26 }]}>{st.position ?? '–'}</Text>
        <Row style={{ width: 58, gap: 6 }}>
          <View style={{ width: 4, height: 20, borderRadius: 2, backgroundColor: `#${st.driver.team_colour}` }} />
          <Text style={s.acr}>{st.driver.name_acronym}</Text>
        </Row>
        <Row style={{ width: 44, gap: 4 }}>
          {c && <View style={[s.tyre, { borderColor: c.color }]}><Text style={{ color: c.color, fontWeight: '900', fontSize: 11 }}>{c.label}</Text></View>}
          <Muted style={{ fontSize: 11 }}>{st.tyreAge}</Muted>
        </Row>
        <Text style={[s.td, { flex: 1 }]}>{st.position === 1 ? 'líder' : st.gap}</Text>
        <Text style={[s.td, { flex: 1 }]}>{st.position === 1 ? '' : st.interval}</Text>
        <Text style={[s.td, { width: 66, textAlign: 'right', color: isBest ? '#A855F7' : colors.text }]}>{fmtLap(st.lastLap)}</Text>
      </Row>
      {selected && (
        <View style={s.detail}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Pressable onPress={onProfile}><Text style={{ color: colors.red, fontWeight: '700' }}>{st.driver.full_name} · perfil ›</Text></Pressable>
            <Muted>{st.pits} pit{st.pits === 1 ? '' : 's'} · {st.lapCount} voltas</Muted>
          </Row>
          <Row style={{ marginTop: 6, justifyContent: 'space-between' }}>
            <Stat label="S1" value={fmtLap(st.sectors[0])} />
            <Stat label="S2" value={fmtLap(st.sectors[1])} />
            <Stat label="S3" value={fmtLap(st.sectors[2])} />
            <Stat label="Melhor" value={fmtLap(st.bestLap)} color="#A855F7" />
            <Stat label="Speed trap" value={st.speedTrap ? `${st.speedTrap} km/h` : '—'} />
          </Row>
          {isLive && car && (
            <Row style={{ marginTop: 8, justifyContent: 'space-between' }}>
              <Stat label="Velocidade" value={`${car.speed} km/h`} color={colors.gold} />
              <Stat label="Marcha" value={String(car.n_gear)} />
              <Stat label="RPM" value={String(car.rpm)} />
              <Stat label="Acel." value={`${car.throttle}%`} color={colors.green} />
              <Stat label="Freio" value={car.brake ? 'ON' : 'off'} color={car.brake ? colors.red : colors.muted} />
              <Stat label="DRS" value={car.drs >= 10 ? 'ABERTO' : 'fechado'} color={car.drs >= 10 ? colors.green : colors.muted} />
            </Row>
          )}
          {isLive && !car && <Muted style={{ marginTop: 6 }}>Telemetria: carregando…</Muted>}
        </View>
      )}
    </Pressable>
  );
}

const Stat = ({ label, value, color = colors.text }: { label: string; value: string; color?: string }) => (
  <View style={{ alignItems: 'center' }}>
    <Muted style={{ fontSize: 10 }}>{label}</Muted>
    <Text style={{ color, fontWeight: '800', fontVariant: ['tabular-nums'], fontSize: 13 }}>{value}</Text>
  </View>
);

const s = StyleSheet.create({
  title: { color: colors.text, fontSize: 20, fontWeight: '800' },
  row: { paddingVertical: 8, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 4, borderRadius: 8 },
  th: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  pos: { color: colors.text, fontWeight: '900', fontSize: 15 },
  acr: { color: colors.text, fontWeight: '800', fontSize: 14 },
  td: { color: colors.text, fontSize: 13, fontVariant: ['tabular-nums'] },
  tyre: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  detail: { backgroundColor: colors.card2, borderRadius: radius, padding: space(1.5), marginBottom: 6 },
});
