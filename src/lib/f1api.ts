// Jolpica — API compatível com a Ergast (calendário, pilotos, resultados, classificações)
const BASE = 'https://api.jolpi.ca/ergast/f1';

const TEAM_COLORS: Record<string, string> = {
  mercedes: '#27F4D2', red_bull: '#3671C6', ferrari: '#E80020', mclaren: '#FF8000',
  aston_martin: '#229971', alpine: '#0093CC', williams: '#64C4FF', rb: '#6692FF',
  audi: '#F50537', haas: '#B6BABD', cadillac: '#C8A96B',
};
const TEAM_NAMES: Record<string, string> = {
  mercedes: 'Mercedes', red_bull: 'Red Bull', ferrari: 'Ferrari', mclaren: 'McLaren',
  aston_martin: 'Aston Martin', alpine: 'Alpine', williams: 'Williams', rb: 'Racing Bulls',
  audi: 'Audi', haas: 'Haas', cadillac: 'Cadillac',
};
const teamName = (id?: string) => (id ? TEAM_NAMES[id] ?? id : null);
const teamColor = (id?: string) => (id ? TEAM_COLORS[id] ?? '#888' : '#888');

const at = (s?: { date: string; time?: string }) => (s ? `${s.date}T${s.time ?? '12:00:00Z'}` : null);

async function get(path: string, offset = 0) {
  const res = await fetch(`${BASE}/${path}?limit=100&offset=${offset}`);
  if (!res.ok) throw new Error(`F1 API ${res.status}`);
  return (await res.json()).MRData;
}

export async function fetchSeasonRaces(season: number) {
  const data = await get(`${season}.json`);
  return (data.RaceTable.Races as any[]).map((r) => ({
    season,
    round: Number(r.round),
    name: r.raceName.replace(' Grand Prix', ' GP'),
    circuit: r.Circuit.circuitName,
    country: r.Circuit.Location.country,
    date_utc: `${r.date}T${r.time ?? '12:00:00Z'}`,
    has_sprint: Boolean(r.Sprint),
    fp1_utc: at(r.FirstPractice), fp2_utc: at(r.SecondPractice), fp3_utc: at(r.ThirdPractice),
    sprint_quali_utc: at(r.SprintQualifying), sprint_utc: at(r.Sprint), quali_utc: at(r.Qualifying),
  }));
}

export async function fetchDriverStandings(season: number) {
  const data = await get(`${season}/driverStandings.json`);
  const list = (data.StandingsTable.StandingsLists[0]?.DriverStandings ?? []) as any[];
  return list.map((s) => {
    const team = s.Constructors[s.Constructors.length - 1]?.constructorId as string | undefined;
    return {
      driver: {
        season, code: s.Driver.code as string,
        name: `${s.Driver.givenName} ${s.Driver.familyName}`,
        number: s.Driver.permanentNumber ? Number(s.Driver.permanentNumber) : null,
        team: teamName(team), team_color: teamColor(team),
      },
      standing: { season, position: Number(s.position), driver_code: s.Driver.code as string, team: teamName(team), points: Number(s.points), wins: Number(s.wins) },
    };
  });
}

export async function fetchConstructorStandings(season: number) {
  const data = await get(`${season}/constructorStandings.json`);
  const list = (data.StandingsTable.StandingsLists[0]?.ConstructorStandings ?? []) as any[];
  return list.map((s) => ({
    season, position: Number(s.position),
    team: teamName(s.Constructor.constructorId)!, team_color: teamColor(s.Constructor.constructorId),
    points: Number(s.points), wins: Number(s.wins),
  }));
}

/** Todos os resultados da temporada (paginado). */
export async function fetchSeasonResults(season: number) {
  const rows: { season: number; round: number; position: number; driver_code: string; team: string | null; grid: number | null; points: number; status: string; fastest_lap: boolean }[] = [];
  for (let offset = 0; ; offset += 100) {
    const data = await get(`${season}/results.json`, offset);
    for (const race of data.RaceTable.Races as any[]) {
      for (const r of race.Results as any[]) {
        rows.push({
          season, round: Number(race.round), position: Number(r.position), driver_code: r.Driver.code,
          team: teamName(r.Constructor.constructorId), grid: r.grid ? Number(r.grid) : null,
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
  for (const r of race.Results as any[]) positions[Number(r.position)] = r.Driver.code;
  return positions;
}

/** Baixa tudo da temporada de uma vez, no formato das tabelas do banco. */
export async function fetchSeasonBundle(season: number) {
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
