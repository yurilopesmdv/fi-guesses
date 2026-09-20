// OpenF1 (openf1.org) — histórico grátis; ao vivo exige conta sponsor (token). ~3 s de atraso.
import { supabase } from './supabase';

const BASE = 'https://api.openf1.org/v1';
let token: string | null = null;
let tokenTriedAt = 0;

/** Token de tempo real, se houver credenciais em app_settings (openf1_user / openf1_pass). */
async function getToken() {
  if (token || Date.now() - tokenTriedAt < 10 * 60_000) return token;
  tokenTriedAt = Date.now();
  const { data } = await supabase.from('app_settings').select('key,value').in('key', ['openf1_user', 'openf1_pass']);
  const cfg = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
  if (!cfg.openf1_user) return null;
  const body = new URLSearchParams({ username: cfg.openf1_user, password: cfg.openf1_pass });
  const res = await fetch('https://api.openf1.org/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() });
  if (!res.ok) return null;
  token = (await res.json()).access_token ?? null;
  return token;
}

// Fila: OpenF1 grátis aceita 3 req/s — espaçamos as chamadas
let chain: Promise<unknown> = Promise.resolve();
const throttle = <T>(fn: () => Promise<T>) => {
  const p = chain.then(() => new Promise((r) => setTimeout(r, 400))).then(fn);
  chain = p.catch(() => {});
  return p;
};

const get = <T = any>(path: string, params: Record<string, string | number> = {}): Promise<T[]> => throttle(() => rawGet<T>(path, params));

async function rawGet<T = any>(path: string, params: Record<string, string | number> = {}): Promise<T[]> {
  const qs = Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  const t = await getToken();
  const res = await fetch(`${BASE}/${path}?${qs}`, { headers: t ? { Authorization: `Bearer ${t}` } : {} });
  if (res.status === 401) { token = null; }
  if (res.status === 404) return []; // sem resultados
  if (res.status === 429) throw new Error('Limite da OpenF1 atingido, aguardando…');
  if (!res.ok) throw new Error(`OpenF1 ${res.status} em ${path}?${qs}`);
  const json = await res.json();
  return Array.isArray(json) ? json : []; // vazio vem como {"detail":"No results found."}
}

export const hasLiveAccess = async () => Boolean(await getToken());

export type Session = { session_key: number; meeting_key: number; session_name: string; session_type: string; date_start: string; date_end: string; country_name: string; location: string; circuit_short_name: string; year: number };
export type OF1Driver = { driver_number: number; name_acronym: string; full_name: string; team_name: string; team_colour: string; headshot_url: string | null };
export type Lap = { driver_number: number; lap_number: number; lap_duration: number | null; duration_sector_1: number | null; duration_sector_2: number | null; duration_sector_3: number | null; i1_speed: number | null; i2_speed: number | null; st_speed: number | null; is_pit_out_lap: boolean; date_start: string | null };
export type Stint = { driver_number: number; stint_number: number; compound: string; lap_start: number; lap_end: number | null; tyre_age_at_start: number };
export type RaceControl = { date: string; category: string; flag: string | null; message: string; driver_number: number | null; lap_number: number | null; scope: string | null };
export type Weather = { date: string; air_temperature: number; track_temperature: number; humidity: number; wind_speed: number; rainfall: number };
export type CarData = { date: string; speed: number; throttle: number; brake: number; rpm: number; n_gear: number; drs: number };

export const latestSession = async () => (await get<Session>('sessions', { session_key: 'latest' }))[0] ?? null;
export const sessionDrivers = (sk: number) => get<OF1Driver>('drivers', { session_key: sk });
export const sessionLaps = (sk: number, fromLap = 1) => get<Lap>('laps', { session_key: sk, 'lap_number>': fromLap - 1 });
export const sessionStints = (sk: number) => get<Stint>('stints', { session_key: sk });
export const sessionPits = (sk: number) => get<{ driver_number: number; lap_number: number; stop_duration: number | null }>('pit', { session_key: sk });
export const sessionRaceControl = (sk: number) => get<RaceControl>('race_control', { session_key: sk });
export const sessionWeather = async (sk: number) => (await get<Weather>('weather', { session_key: sk })).at(-1) ?? null;
export const sessionPositions = (sk: number, since?: string) => get<{ driver_number: number; position: number; date: string }>('position', since ? { session_key: sk, 'date>': since } : { session_key: sk });
export const sessionIntervals = (sk: number, since?: string) => get<{ driver_number: number; gap_to_leader: number | string | null; interval: number | string | null; date: string }>('intervals', since ? { session_key: sk, 'date>': since } : { session_key: sk });
export const sessionResult = (sk: number) => get<{ position: number | null; driver_number: number; gap_to_leader: number | string | null; dnf: boolean; dns: boolean; dsq: boolean; number_of_laps: number }>('session_result', { session_key: sk });
export type ChampDriver = { driver_number: number; position_start: number; position_current: number; points_start: number; points_current: number };
export type ChampTeam = { team_name: string; position_start: number; position_current: number; points_start: number; points_current: number };
export const championshipDrivers = (sk: number) => get<ChampDriver>('championship_drivers', { session_key: sk });
export const championshipTeams = (sk: number) => get<ChampTeam>('championship_teams', { session_key: sk });

// Pontuação por posição (2026: sem ponto de volta mais rápida)
export const RACE_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
export const SPRINT_POINTS = [8, 7, 6, 5, 4, 3, 2, 1];

/** "Se a corrida acabasse agora": pontos de partida + pontos da posição atual. */
export function projectChampionship(standings: Standing[], champ: ChampDriver[], teams: ChampTeam[], isSprint: boolean) {
  const table = isSprint ? SPRINT_POINTS : RACE_POINTS;
  const startBy = new Map(champ.map((c) => [c.driver_number, c]));
  const drivers = standings.map((s) => {
    const c = startBy.get(s.driver.driver_number);
    const gain = s.position && s.position <= table.length ? table[s.position - 1] : 0;
    return { driver: s.driver, start: c?.points_start ?? 0, gain, total: (c?.points_start ?? 0) + gain, posStart: c?.position_start ?? null };
  }).sort((a, b) => b.total - a.total || (a.posStart ?? 99) - (b.posStart ?? 99));
  const teamStart = new Map(teams.map((t) => [t.team_name, t]));
  const teamGain = new Map<string, number>();
  for (const d of drivers) teamGain.set(d.driver.team_name, (teamGain.get(d.driver.team_name) ?? 0) + d.gain);
  const constructors = [...new Set([...teams.map((t) => t.team_name), ...teamGain.keys()])].map((name) => {
    const t = teamStart.get(name);
    return { team: name, start: t?.points_start ?? 0, gain: teamGain.get(name) ?? 0, total: (t?.points_start ?? 0) + (teamGain.get(name) ?? 0), posStart: t?.position_start ?? null };
  }).sort((a, b) => b.total - a.total);
  return { drivers, constructors };
}

export const latestCarData = async (sk: number, driver: number) => (await get<CarData>('car_data', { session_key: sk, driver_number: driver, 'date>': new Date(Date.now() - 60_000).toISOString() })).at(-1) ?? null;

/** Estado consolidado por piloto pra torre de tempos. */
export type Standing = {
  driver: OF1Driver; position: number | null; gap: string; interval: string;
  lastLap: number | null; bestLap: number | null; lapCount: number; compound: string | null; tyreAge: number; pits: number;
  sectors: [number | null, number | null, number | null]; speedTrap: number | null;
};

export const fmtLap = (s: number | null | undefined) => {
  if (s == null) return '—';
  const m = Math.floor(s / 60), r = s - m * 60;
  return m ? `${m}:${r.toFixed(3).padStart(6, '0')}` : r.toFixed(3);
};
export const fmtGap = (g: number | string | null | undefined) => (g == null ? '—' : typeof g === 'string' ? g : `+${g.toFixed(3)}`);

export const COMPOUND: Record<string, { label: string; color: string }> = {
  SOFT: { label: 'S', color: '#E10600' }, MEDIUM: { label: 'M', color: '#FFD23F' }, HARD: { label: 'H', color: '#F4F4F6' },
  INTERMEDIATE: { label: 'I', color: '#22C55E' }, WET: { label: 'W', color: '#3B82F6' },
};

export function buildStandings(
  drivers: OF1Driver[], positions: { driver_number: number; position: number; date: string }[],
  intervals: { driver_number: number; gap_to_leader: any; interval: any; date: string }[],
  laps: Lap[], stints: Stint[], pits: { driver_number: number }[],
): Standing[] {
  const lastBy = <T extends { driver_number: number; date?: string }>(rows: T[]) => {
    const m = new Map<number, T>();
    for (const r of rows) m.set(r.driver_number, r); // já vêm em ordem cronológica
    return m;
  };
  const pos = lastBy(positions), gap = lastBy(intervals);
  const rows = drivers.map((d) => {
    const mine = laps.filter((l) => l.driver_number === d.driver_number);
    const last = mine.at(-1);
    const timed = mine.filter((l) => l.lap_duration && !l.is_pit_out_lap).map((l) => l.lap_duration!);
    const stint = stints.filter((s) => s.driver_number === d.driver_number).at(-1);
    const lapCount = last?.lap_number ?? 0;
    return {
      driver: d, position: pos.get(d.driver_number)?.position ?? null,
      gap: fmtGap(gap.get(d.driver_number)?.gap_to_leader), interval: fmtGap(gap.get(d.driver_number)?.interval),
      lastLap: last?.lap_duration ?? null, bestLap: timed.length ? Math.min(...timed) : null, lapCount,
      compound: stint?.compound ?? null, tyreAge: stint ? stint.tyre_age_at_start + Math.max(0, lapCount - stint.lap_start + 1) : 0,
      pits: pits.filter((p) => p.driver_number === d.driver_number).length,
      sectors: [last?.duration_sector_1 ?? null, last?.duration_sector_2 ?? null, last?.duration_sector_3 ?? null] as [number | null, number | null, number | null],
      speedTrap: last?.st_speed ?? null,
    };
  });
  return rows.sort((a, b) => (a.position ?? 99) - (b.position ?? 99));
}
