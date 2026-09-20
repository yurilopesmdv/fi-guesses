// F2/F3 (temporada atual): calendário + horários (JSON-LD do site oficial), pilotos/equipes (página de pilotos)
// e classificações (API pública da F1). Uso: node scripts/sync-f2f3.mjs f2|f3 [season]
import { readFileSync } from 'node:fs';

const CFG = {
  f2: { site: 'https://www.fiaformula2.com', key: 'MsEALPOPbzgjZIWE6GmU2O69VKY8zZpi' },
  f3: { site: 'https://www.fiaformula3.com', key: 'gGX8kMJ7NQmaRfrltWE0xrGgHaEfv1Cn' },
};
const series = process.argv[2];
const season = Number(process.argv[3] ?? new Date().getFullYear());
if (!CFG[series]) { console.error('uso: node scripts/sync-f2f3.mjs f2|f3 [season]'); process.exit(1); }
const { site, key } = CFG[series];

const env = Object.fromEntries(readFileSync('.env', 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => l.split(/=(.*)/s).slice(0, 2).map((x) => x.trim())));
const ref = new URL(env.EXPO_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const sql = async (query) => {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, { method: 'POST', headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};
const lit = (v) => (v == null ? 'null' : typeof v === 'number' || typeof v === 'boolean' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const upsert = (table, rows, conflict) => {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  const set = cols.filter((c) => !conflict.includes(c)).map((c) => `${c}=excluded.${c}`).join(',');
  return `insert into public.${table} (${cols.join(',')}) values\n${rows.map((r) => `(${cols.map((c) => lit(r[c])).join(',')})`).join(',\n')}\non conflict (${conflict.join(',')}) do update set ${set};\n`;
};
const html = async (url) => (await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })).text();
const api = async (path) => (await fetch(`https://api.formula1.com${path}`, { headers: { apikey: key, locale: 'en' } })).json();
const strip = (h) => h.replace(/<[^>]+>/g, '|').replace(/\|+/g, '|');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 1. classificações (também dá a lista de etapas)
const ds = await api(`/v2/core-fom-results/${series}/driver-standings-breakdown?season=${season}`);
const cs = await api(`/v2/core-fom-results/${series}/constructor-standings-breakdown?season=${season}`);
const meetings = ds.meetings ?? [];

// 2. pilotos + equipes (página de pilotos: "Nome|Sobrenome|Equipe|Flag of …")
const drText = strip(await html(`${site}/en/drivers`));
const teamColor = Object.fromEntries((cs.standings ?? []).map((t) => [t.teamName, t.teamColourCode ? `#${t.teamColourCode}` : null]));
const drivers = (ds.standings ?? []).map((d) => {
  const m = new RegExp(`\\|${d.driverFirstName.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\|${d.driverLastName.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\|([^|]+)\\|Flag of`).exec(drText);
  const team = m?.[1]?.trim() ?? null;
  return { series, season, code: d.driverTLA, name: `${d.driverFirstName} ${d.driverLastName}`, number: null, team, team_color: team ? teamColor[team] ?? '#888' : '#888' };
});
const driver_standings = (ds.standings ?? []).map((d, i) => ({
  series, season, position: Number(d.displayPosition) || i + 1, driver_code: d.driverTLA, team: drivers[i].team, points: d.championshipPoints,
  wins: d.points.filter((m) => m.some((p) => p === 25)).length, // aproximação: 25 = vitória na feature
}));
const constructor_standings = (cs.standings ?? []).map((t, i) => ({ series, season, position: Number(t.displayPosition) || i + 1, team: t.teamName, team_color: t.teamColourCode ? `#${t.teamColourCode}` : null, points: t.championshipPoints, wins: 0 }));

// 3. calendário com horários (JSON-LD de cada etapa) + top 5 da feature
const races = [], race_results = [];
for (const [i, m] of meetings.entries()) {
  const page = await html(`${site}${m.url}`);
  const ld = [...page.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map((x) => { try { return JSON.parse(x[1]); } catch { return null; } }).find((d) => d?.subEvent);
  const ev = (ld?.subEvent ?? []).map((e) => ({ kind: e.name.split(' - ')[0], start: e.startDate, end: e.endDate })).sort((a, b) => a.start.localeCompare(b.start));
  const dur = (e) => (new Date(e.end) - new Date(e.start)) / 60000;
  const racesEv = ev.filter((e) => e.kind === 'Race' && dur(e) <= 180);
  const quali = ev.filter((e) => e.kind === 'Qualifying').at(-1), practice = ev.find((e) => e.kind === 'Practice');
  const sprint = racesEv.length > 1 ? racesEv[0] : null, feature = racesEv.at(-1);
  const fallback = `${m.meetingEndDate}T12:00:00Z`;
  races.push({
    series, season, round: i + 1, name: `${m.meetingCountryName} · ${m.meetingLocation}`.replace(' · ' + m.meetingCountryName, ''), circuit: m.meetingLocation, country: m.meetingCountryName,
    date_utc: feature?.start ?? fallback, has_sprint: Boolean(sprint),
    fp1_utc: practice?.start ?? null, fp2_utc: null, fp3_utc: null, sprint_quali_utc: null, sprint_utc: sprint?.start ?? null, quali_utc: quali?.start ?? null,
  });
  // top 5 da feature race (única tabela na página)
  const t = strip(page); const at = t.indexOf('Pos.|Driver|Time|Points');
  if (at > 0) for (const r of t.slice(at, at + 1500).matchAll(/\|(\d{1,2})\|[^|]+\|[^|]*\|[^|]+\|([A-Z]{3})\|([^|]*)\|(\d+)\|/g)) {
    race_results.push({ series, session: 'feature', season, round: i + 1, position: Number(r[1]), driver_code: r[2], team: drivers.find((d) => d.code === r[2])?.team ?? null, grid: null, points: Number(r[4]), status: r[3].trim() || 'Finished', fastest_lap: false });
  }
  await sleep(400);
}
const last = meetings.filter((m) => new Date(m.meetingEndDate) < new Date()).length;
await sql([
  upsert('races', races, ['series', 'season', 'round']),
  upsert('drivers', drivers, ['series', 'season', 'code']),
  upsert('driver_standings', driver_standings, ['series', 'season', 'driver_code']),
  upsert('constructor_standings', constructor_standings, ['series', 'season', 'team']),
  upsert('race_results', race_results, ['series', 'season', 'round', 'session', 'position', 'driver_code']),
  upsert('f1_sync', [{ series, season, last_round_with_results: last, synced_at: new Date().toISOString() }], ['series', 'season']),
].join('\n'));
console.log(`✓ ${series.toUpperCase()} ${season}: ${races.length} etapas (${races.filter((r) => r.quali_utc).length} com horários), ${drivers.length} pilotos (${drivers.filter((d) => d.team).length} com equipe), ${constructor_standings.length} equipes, ${race_results.length} resultados top-5`);
