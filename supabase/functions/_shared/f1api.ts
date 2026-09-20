// Jolpica — API compatível com a Ergast (calendário, pilotos, resultados, classificações)
const BASE = 'https://api.jolpi.ca/ergast/f1';

const TEAM_COLORS: Record<string, string> = {
  mercedes: '#27F4D2', red_bull: '#3671C6', ferrari: '#E80020', mclaren: '#FF8000',
  aston_martin: '#229971', alpine: '#0093CC', williams: '#64C4FF', rb: '#6692FF',
  audi: '#F50537', haas: '#B6BABD', cadillac: '#C8A96B',
  // temporadas anteriores
  sauber: '#52E252', alphatauri: '#5E8FAA', alfa: '#C92D4B', toro_rosso: '#469BFF', racing_point: '#F596C8',
  renault: '#FFF500', force_india: '#F596C8', lotus_f1: '#FFB800', manor: '#F40000', caterham: '#0B361F',
  marussia: '#6E0000', brawn: '#B8FD6E', toyota: '#CC0000', bmw_sauber: '#0066B3', honda: '#F0F0F0',
};
const TEAM_NAMES: Record<string, string> = {
  mercedes: 'Mercedes', red_bull: 'Red Bull', ferrari: 'Ferrari', mclaren: 'McLaren',
  aston_martin: 'Aston Martin', alpine: 'Alpine', williams: 'Williams', rb: 'Racing Bulls',
  audi: 'Audi', haas: 'Haas', cadillac: 'Cadillac',
  sauber: 'Sauber', alphatauri: 'AlphaTauri', alfa: 'Alfa Romeo', toro_rosso: 'Toro Rosso', racing_point: 'Racing Point',
  renault: 'Renault', force_india: 'Force India', lotus_f1: 'Lotus', manor: 'Manor', caterham: 'Caterham',
  marussia: 'Marussia', brawn: 'Brawn', toyota: 'Toyota', bmw_sauber: 'BMW Sauber', honda: 'Honda',
};
// Pilotos antigos não têm "code" na API: gera sigla única por temporada (dois "Hill" → HIL / PHI)
const clean = (t: string) => String(t).normalize('NFD').replace(/[^A-Za-z]/g, '').toUpperCase();
function makeCodeBook(drivers: any[]) {
  const book = new Map<string, string>(); const used = new Set<string>();
  for (const d of drivers) {
    if (book.has(d.driverId)) continue;
    const fam = clean(d.familyName), giv = clean(d.givenName);
    const cands = [d.code, fam.slice(0, 3), giv[0] + fam.slice(0, 2), giv.slice(0, 2) + fam[0], clean(d.driverId).slice(0, 3)];
    let code = cands.find((c) => c && c.length === 3 && !used.has(c)) ?? (fam.slice(0, 2) + String(book.size % 10));
    while (used.has(code)) code = code.slice(0, 2) + String.fromCharCode(65 + Math.floor(Math.random() * 26));
    used.add(code); book.set(d.driverId, code);
  }
  return book;
}
let codeBook = new Map<string, string>();
const driverCode = (d: any): string => codeBook.get(d.driverId) ?? d.code ?? clean(d.familyName).slice(0, 3);
const teamName = (id?: string) => (id ? TEAM_NAMES[id] ?? id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : null);
const teamColor = (id?: string) => (id ? TEAM_COLORS[id] ?? '#888' : '#888');

const at = (s?: { date: string; time?: string }) => (s ? `${s.date}T${s.time ?? '12:00:00Z'}` : null);

// Jolpica: ~4 req/s e 500 req/h — espaça as chamadas e refaz em 429
let chain: Promise<unknown> = Promise.resolve();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
function get(path: string, offset = 0): Promise<any> {
  const run = async () => {
    for (let tent = 0; ; tent++) {
      const res = await fetch(`${BASE}/${path}?limit=100&offset=${offset}`);
      if (res.status === 429 && tent < 6) { await sleep(Number(res.headers.get('retry-after') ?? 0) * 1000 || 3000 * (tent + 1)); continue; }
      if (!res.ok) throw new Error(`F1 API ${res.status} em ${path}`);
      return (await res.json()).MRData;
    }
  };
  const p = chain.then(() => sleep(350)).then(run);
  chain = p.catch(() => {});
  return p;
}

export async function fetchSeasonRaces(season: number) {
  const data = await get(`${season}.json`);
  return (data.RaceTable.Races as any[]).map((r) => ({
    series: 'f1' as const,
    season,
    round: Number(r.round),
    name: r.raceName.replace(' Grand Prix', ' GP'),
    circuit: r.Circuit.circuitName,
    country: r.Circuit.Location.country,
    date_utc: `${r.date}T${r.time ?? '12:00:00Z'}`,
    has_sprint: Boolean(r.Sprint),
    times_tbc: false,
    fp1_utc: at(r.FirstPractice), fp2_utc: at(r.SecondPractice), fp3_utc: at(r.ThirdPractice),
    sprint_quali_utc: at(r.SprintQualifying), sprint_utc: at(r.Sprint), quali_utc: at(r.Qualifying),
  }));
}

export async function fetchDriverStandings(season: number) {
  const data = await get(`${season}/driverStandings.json`);
  const list = (data.StandingsTable.StandingsLists[0]?.DriverStandings ?? []) as any[];
  return list.map((s, i) => {
    const team = s.Constructors[s.Constructors.length - 1]?.constructorId as string | undefined;
    return {
      driver: {
        series: 'f1' as const, season, code: driverCode(s.Driver),
        name: `${s.Driver.givenName} ${s.Driver.familyName}`,
        number: s.Driver.permanentNumber ? Number(s.Driver.permanentNumber) : null,
        team: teamName(team), team_color: teamColor(team),
      },
      // sem posição ('-') → ordem da lista
      standing: { series: 'f1' as const, season, position: Number(s.position) || i + 1, driver_code: driverCode(s.Driver), team: teamName(team), points: Number(s.points), wins: Number(s.wins) },
    };
  });
}

export async function fetchConstructorStandings(season: number) {
  const data = await get(`${season}/constructorStandings.json`);
  const list = (data.StandingsTable.StandingsLists[0]?.ConstructorStandings ?? []) as any[];
  return list.map((s, i) => ({
    series: 'f1' as const, season, position: Number(s.position) || i + 1,
    team: teamName(s.Constructor.constructorId)!, team_color: teamColor(s.Constructor.constructorId),
    points: Number(s.points), wins: Number(s.wins),
  }));
}

/** Todos os resultados da temporada (paginado). */
export async function fetchSeasonResults(season: number) {
  const rows: { series: 'f1'; session: 'race'; season: number; round: number; position: number; driver_code: string; team: string | null; grid: number | null; points: number; status: string; fastest_lap: boolean }[] = [];
  for (let offset = 0; ; offset += 100) {
    const data = await get(`${season}/results.json`, offset);
    for (const race of data.RaceTable.Races as any[]) {
      for (const r of race.Results as any[]) {
        rows.push({
          series: 'f1', session: 'race', season, round: Number(race.round), position: Number(r.position), driver_code: driverCode(r.Driver),
          team: teamName(r.Constructor.constructorId), grid: Number(r.grid) || null,
          points: Number(r.points), status: r.status, fastest_lap: r.FastestLap?.rank === '1',
        });
      }
    }
    if (offset + 100 >= Number(data.total)) break;
  }
  return rows;
}

/** Resultado de uma corrida: código do piloto por posição. null se ainda não publicado. */
export async function fetchRaceResult(season: number, round: number) {
  const data = await get(`${season}/${round}/results.json`);
  const race = data.RaceTable.Races[0];
  if (!race) return null;
  const positions: Record<number, string> = {};
  for (const r of race.Results as any[]) positions[Number(r.position)] = driverCode(r.Driver);
  return positions;
}

/** Baixa tudo da temporada de uma vez, no formato das tabelas do banco. */
export async function fetchSeasonBundle(season: number) {
  const all = await get(`${season}/drivers.json`);
  codeBook = makeCodeBook(all.DriverTable?.Drivers ?? []);
  const [races, drivers, constructors, results] = await Promise.all([
    fetchSeasonRaces(season), fetchDriverStandings(season), fetchConstructorStandings(season), fetchSeasonResults(season),
  ]);
  return {
    races,
    drivers: drivers.map((d) => d.driver),
    driver_standings: drivers.map((d) => d.standing),
    constructor_standings: constructors,
    race_results: results,
    last_round_with_results: results.reduce((m, r) => Math.max(m, r.round), 0),
  };
}
