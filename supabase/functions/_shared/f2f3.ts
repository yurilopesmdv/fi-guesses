// F2/F3 (temporada atual): calendário + horários (JSON-LD do site oficial), pilotos/equipes (página de pilotos)
// e classificações (API pública da F1 usada pelos próprios sites).
const CFG: Record<string, { site: string; key: string }> = {
  f2: { site: 'https://www.fiaformula2.com', key: 'MsEALPOPbzgjZIWE6GmU2O69VKY8zZpi' },
  f3: { site: 'https://www.fiaformula3.com', key: 'gGX8kMJ7NQmaRfrltWE0xrGgHaEfv1Cn' },
};
const html = async (url: string) => (await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })).text();
const strip = (h: string) => h.replace(/<[^>]+>/g, '|').replace(/\|+/g, '|');
const esc = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchF2F3Bundle(series: 'f2' | 'f3', season: number) {
  const { site, key } = CFG[series];
  const api = async (path: string) => (await fetch(`https://api.formula1.com${path}`, { headers: { apikey: key, locale: 'en' } })).json();
  const ds = await api(`/v2/core-fom-results/${series}/driver-standings-breakdown?season=${season}`);
  const cs = await api(`/v2/core-fom-results/${series}/constructor-standings-breakdown?season=${season}`);
  const meetings: any[] = ds.meetings ?? [];

  const drText = strip(await html(`${site}/en/drivers`));
  const teamColor = Object.fromEntries((cs.standings ?? []).map((t: any) => [t.teamName, t.teamColourCode ? `#${t.teamColourCode}` : null]));
  const drivers = (ds.standings ?? []).map((d: any) => {
    const m = new RegExp(`\\|${esc(d.driverFirstName)}\\|${esc(d.driverLastName)}\\|([^|]+)\\|Flag of`).exec(drText);
    const team = m?.[1]?.trim() ?? null;
    return { series, season, code: d.driverTLA as string, name: `${d.driverFirstName} ${d.driverLastName}`, number: null, team, team_color: team ? teamColor[team] ?? '#888' : '#888' };
  });
  const driver_standings = (ds.standings ?? []).map((d: any, i: number) => ({
    series, season, position: Number(d.displayPosition) || i + 1, driver_code: d.driverTLA as string, team: drivers[i].team, points: d.championshipPoints,
    wins: (d.points as any[]).filter((m) => m.some((p: any) => p === 25)).length,
  }));
  const constructor_standings = (cs.standings ?? []).map((t: any, i: number) => ({ series, season, position: Number(t.displayPosition) || i + 1, team: t.teamName as string, team_color: t.teamColourCode ? `#${t.teamColourCode}` : null, points: t.championshipPoints, wins: 0 }));

  const races: any[] = [], race_results: any[] = [];
  for (const [i, m] of meetings.entries()) {
    const page = await html(`${site}${m.url}`);
    const ld = [...page.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map((x) => { try { return JSON.parse(x[1]); } catch { return null; } }).find((d) => d?.subEvent);
    const ev = ((ld?.subEvent ?? []) as any[]).map((e) => ({ kind: String(e.name).split(' - ')[0], start: e.startDate as string, end: e.endDate as string })).sort((a, b) => a.start.localeCompare(b.start));
    const dur = (e: { start: string; end: string }) => (new Date(e.end).getTime() - new Date(e.start).getTime()) / 60000;
    const racesEv = ev.filter((e) => e.kind === 'Race' && dur(e) <= 180);
    const quali = ev.filter((e) => e.kind === 'Qualifying').at(-1), practice = ev.find((e) => e.kind === 'Practice');
    const sprint = racesEv.length > 1 ? racesEv[0] : null, feature = racesEv.at(-1);
    races.push({
      series, season, round: i + 1, name: `${m.meetingCountryName} · ${m.meetingLocation}`, circuit: m.meetingLocation, country: m.meetingCountryName,
      date_utc: feature?.start ?? `${m.meetingEndDate}T12:00:00Z`, has_sprint: Boolean(sprint),
      fp1_utc: practice?.start ?? null, fp2_utc: null, fp3_utc: null, sprint_quali_utc: null, sprint_utc: sprint?.start ?? null, quali_utc: quali?.start ?? null,
    });
    const t = strip(page); const at = t.indexOf('Pos.|Driver|Time|Points');
    if (at > 0) for (const r of t.slice(at, at + 1500).matchAll(/\|(\d{1,2})\|[^|]+\|[^|]*\|[^|]+\|([A-Z]{3})\|([^|]*)\|(\d+)\|/g)) {
      race_results.push({ series, session: 'feature', season, round: i + 1, position: Number(r[1]), driver_code: r[2], team: drivers.find((d: any) => d.code === r[2])?.team ?? null, grid: null, points: Number(r[4]), status: r[3].trim() || 'Finished', fastest_lap: false });
    }
    await sleep(300);
  }
  const last_round_with_results = meetings.filter((m) => new Date(m.meetingEndDate) < new Date()).length;
  return { races, drivers, driver_standings, constructor_standings, race_results, last_round_with_results };
}
