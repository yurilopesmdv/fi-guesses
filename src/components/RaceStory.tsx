import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { fetchRacePitstops } from '@/lib/f1api';
import { getRaceLapData, getRaceStints, requestRaceDetail, type LapData, type Stint } from '@/lib/repo';
import type { Driver, Race, RaceResult } from '@/lib/types';
import { Card, H2, Loading, Muted, Row } from '@/ui/primitives';
import { colors } from '@/ui/theme';

const COMPOUND: Record<string, [string, string]> = { SOFT: ['#E10600', 'S'], MEDIUM: ['#FFD23F', 'M'], HARD: ['#F4F4F6', 'H'], INTERMEDIATE: ['#22C55E', 'I'], WET: ['#3B82F6', 'W'] };
const COMPOUND_PT: Record<string, string> = { SOFT: 'Macio', MEDIUM: 'Médio', HARD: 'Duro', INTERMEDIATE: 'Intermediário', WET: 'Chuva' };
const band = (p: number | null) => (p == null ? 'transparent' : p === 1 ? colors.gold : p <= 3 ? '#9aa3b5' : p <= 10 ? '#8f1d1d' : '#2f2f3d');
/** Agrupa valores iguais consecutivos para desenhar poucos segmentos. */
function runs<T>(values: T[]) { const out: { v: T; n: number }[] = []; for (const v of values) { const last = out[out.length - 1]; if (last && last.v === v) last.n++; else out.push({ v, n: 1 }); } return out; }
const surname = (n?: string) => n?.split(' ').pop() ?? '';

type Data = { laps: LapData | null; stints: Stint[]; pits: Awaited<ReturnType<typeof fetchRacePitstops>> | null };

/** Corrida volta a volta (H25) e estratégia de pneus/paradas (H26). Carrega sob demanda; o servidor guarda após a 1ª consulta. */
export function RaceStory({ race, drivers, results }: { race: Race; drivers: Driver[]; results: RaceResult[] | null }) {
  const [data, setData] = useState<Data | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'fetching' | 'error'>('idle');
  const [all, setAll] = useState(false);
  const rows = (results ?? []).filter((r) => r.session === 'race').sort((a, b) => a.position - b.position);
  if (race.series !== 'f1' || race.season < 1996 || !rows.length) return null;
  const byCode = Object.fromEntries(drivers.map((d) => [d.code, d]));
  const open = async () => {
    setState('loading');
    try {
      let laps = await getRaceLapData(race.season, race.round);
      let stints = race.season >= 2023 ? await getRaceStints(race.season, race.round) : [];
      if (!laps || (race.season >= 2023 && !stints.length)) {
        setState('fetching');
        await requestRaceDetail(race.season, race.round).catch(() => null);
        laps = await getRaceLapData(race.season, race.round);
        stints = race.season >= 2023 ? await getRaceStints(race.season, race.round) : [];
      }
      const pits = !stints.length && race.season >= 2011 ? await fetchRacePitstops(race.season, race.round).catch(() => null) : null;
      setData({ laps, stints, pits }); setState('idle');
    } catch { setState('error'); }
  };
  if (!data) {
    return (
      <Card>
        <H2>📈 Corrida volta a volta</H2>
        <Muted>Líderes, posições a cada volta{race.season >= 2011 ? ' e estratégia de pneus' : ''}.</Muted>
        {state === 'idle' || state === 'error' ? (
          <Pressable accessibilityRole="button" onPress={() => void open()} style={{ minHeight: 44, marginTop: 10, borderRadius: 12, backgroundColor: colors.card2, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: colors.text, fontWeight: '800' }}>{state === 'error' ? 'Tentar novamente' : 'Ver a corrida'}</Text>
          </Pressable>
        ) : <><Loading />{state === 'fetching' && <Muted style={{ textAlign: 'center' }}>Buscando na fonte oficial. Só demora na primeira vez.</Muted>}</>}
      </Card>
    );
  }
  const L = data.laps;
  const idOf = (code: string) => byCode[code]?.driver_id ?? null;
  const shown = all ? rows : rows.slice(0, 10);
  const leaders = L ? Array.from({ length: L.laps }, (_, i) => Object.entries(L.positions).find(([, p]) => p[i + 1] === 1)?.[0] ?? '') : [];
  const color = (driverId: string) => drivers.find((d) => d.driver_id === driverId)?.team_color ?? colors.border;
  const nameOf = (driverId: string) => surname(drivers.find((d) => d.driver_id === driverId)?.name) || driverId;
  const led = runs([...leaders].sort()).filter((r) => r.v).sort((a, b) => b.n - a.n);
  return (
    <Card>
      <H2>📈 Corrida volta a volta</H2>
      {L ? <>
        <Muted style={{ fontSize: 12, marginBottom: 6 }}>LÍDER A CADA VOLTA · {L.laps} voltas</Muted>
        <View style={{ flexDirection: 'row', height: 16, borderRadius: 8, overflow: 'hidden', backgroundColor: colors.card2 }}>
          {runs(leaders).map((r, i) => <View key={i} style={{ flex: r.n, backgroundColor: r.v ? color(r.v) : colors.card2, borderRightWidth: 1, borderRightColor: colors.card }} />)}
        </View>
        <Row style={{ flexWrap: 'wrap', gap: 10, marginTop: 6 }}>
          {led.map((r) => <Row key={r.v} style={{ gap: 4 }}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color(r.v) }} /><Text style={{ color: colors.muted, fontSize: 12 }}>{nameOf(r.v)} {r.n}</Text></Row>)}
        </Row>
        <Muted style={{ fontSize: 12, marginTop: 14, marginBottom: 6 }}>POSIÇÃO A CADA VOLTA</Muted>
        {shown.map((r) => {
          const id = idOf(r.driver_code); const pos = id ? L.positions[id] : null;
          const start = r.grid && r.grid > 0 ? r.grid : null;
          return (
            <Row key={r.driver_code} style={{ gap: 8, minHeight: 22 }}>
              <Text style={{ width: 74, color: colors.text, fontSize: 12, fontWeight: '700' }} numberOfLines={1}>{surname(byCode[r.driver_code]?.name) || r.driver_code}</Text>
              <View style={{ flex: 1, flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: colors.card2 }}>
                {pos ? runs(pos.slice(1, L.laps + 1).map((p) => p ?? null)).map((s, i) => <View key={i} style={{ flex: s.n, backgroundColor: band(s.v) }} />) : null}
              </View>
              <Text style={{ width: 62, color: colors.muted, fontSize: 11, textAlign: 'right', fontVariant: ['tabular-nums'] }}>{start ? `P${start}` : 'box'} → P{r.position}</Text>
            </Row>
          );
        })}
        <Row style={{ gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
          {([['P1', colors.gold], ['P2–3', '#9aa3b5'], ['P4–10', '#8f1d1d'], ['P11+', '#2f2f3d']] as const).map(([l, c]) => <Row key={l} style={{ gap: 4 }}><View style={{ width: 10, height: 6, borderRadius: 3, backgroundColor: c }} /><Text style={{ color: colors.muted, fontSize: 11 }}>{l}</Text></Row>)}
        </Row>
      </> : <Muted>Voltas indisponíveis para este GP na fonte.</Muted>}
      {(data.stints.length > 0 || data.pits) && <>
        <Muted style={{ fontSize: 12, marginTop: 14, marginBottom: 6 }}>{data.stints.length ? 'ESTRATÉGIA DE PNEUS' : 'PARADAS NOS BOXES'}</Muted>
        {shown.map((r) => {
          const total = L?.laps ?? 0;
          let segs: { n: number; c: string; t: string }[] = [];
          if (data.stints.length) {
            segs = data.stints.filter((s) => s.driver_code === r.driver_code).map((s) => { const [c, t] = COMPOUND[s.compound ?? ''] ?? ['#555', '?']; return { n: (s.lap_end ?? s.lap_start) - s.lap_start + 1, c, t }; });
          } else if (data.pits) {
            const id = idOf(r.driver_code); const laps = (id && data.pits.laps[id]) || 0; const stops = (id && data.pits.pits[id]) || [];
            let prev = 0; segs = [...stops, laps].filter((l) => l > prev).map((l, i) => { const seg = { n: l - prev, c: i % 2 ? '#6b7280' : '#9ca3af', t: '' }; prev = l; return seg; });
          }
          if (!segs.length) return null;
          const used = segs.reduce((n, s) => n + s.n, 0);
          return (
            <Row key={r.driver_code} style={{ gap: 8, minHeight: 22 }}>
              <Text style={{ width: 74, color: colors.text, fontSize: 12, fontWeight: '700' }} numberOfLines={1}>{surname(byCode[r.driver_code]?.name) || r.driver_code}</Text>
              <View style={{ flex: 1, flexDirection: 'row', height: 12, gap: 2 }}>
                {segs.map((s, i) => <View key={i} style={{ flex: s.n, backgroundColor: s.c, borderRadius: 3, alignItems: 'center', justifyContent: 'center' }}>{s.t && s.n >= 6 ? <Text style={{ fontSize: 8, fontWeight: '800', color: '#111' }}>{s.t}</Text> : null}</View>)}
                {total > used ? <View style={{ flex: total - used }} /> : null}
              </View>
              <Text style={{ width: 62, color: colors.muted, fontSize: 11, textAlign: 'right' }}>{segs.length - 1} parada{segs.length - 1 === 1 ? '' : 's'}</Text>
            </Row>
          );
        })}
        {data.stints.length > 0 && <Row style={{ gap: 10, marginTop: 6, flexWrap: 'wrap' }}>{Object.entries(COMPOUND).map(([k, [c]]) => <Row key={k} style={{ gap: 4 }}><View style={{ width: 10, height: 6, borderRadius: 3, backgroundColor: c }} /><Text style={{ color: colors.muted, fontSize: 11 }}>{COMPOUND_PT[k]}</Text></Row>)}</Row>}
      </>}
      {rows.length > 10 && <Pressable accessibilityRole="button" onPress={() => setAll(!all)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: colors.red, fontWeight: '700' }}>{all ? 'Mostrar top 10' : `Ver os ${rows.length} pilotos`}</Text></Pressable>}
      <Muted style={{ fontSize: 11, marginTop: 6 }}>Fontes: voltas e paradas Jolpica; pneus OpenF1 (2023+). Paradas sem composto antes de 2023.</Muted>
    </Card>
  );
}
