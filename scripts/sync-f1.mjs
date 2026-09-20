// Seed/atualização dos dados da F1 direto no banco (via Management API). Uso: node scripts/sync-f1.mjs [season]
import { readFileSync } from 'node:fs';
import { fetchHeadshots, fetchSeasonBundle } from '../src/lib/f1api.ts';

const env = Object.fromEntries(readFileSync('.env', 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => l.split(/=(.*)/s).slice(0, 2).map((x) => x.trim())));
const ref = new URL(env.EXPO_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const season = Number(process.argv[2] ?? new Date().getFullYear());

const sql = async (query) => {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};
const lit = (v) => (v == null ? 'null' : typeof v === 'number' ? String(v) : typeof v === 'boolean' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const upsert = (table, rows, conflict) => {
  rows = [...new Map(rows.map((r) => [conflict.map((c) => r[c]).join('|'), r])).values()]; // dedupe pela chave
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  const vals = rows.map((r) => `(${cols.map((c) => lit(r[c])).join(',')})`).join(',\n');
  const set = cols.filter((c) => !conflict.includes(c)).map((c) => `${c}=excluded.${c}`).join(',');
  return `insert into public.${table} (${cols.join(',')}) values\n${vals}\non conflict (${conflict.join(',')}) do update set ${set};\n`;
};

const b = await fetchSeasonBundle(season);
const withSeries = (rows) => rows.map((r) => ({ series: 'f1', ...r }));
// drivers já vêm com driver_id do bundle
await sql([
  upsert('races', withSeries(b.races), ['series', 'season', 'round']),
  upsert('drivers', withSeries(b.drivers), ['series', 'season', 'code']),
  upsert('driver_standings', withSeries(b.driver_standings), ['series', 'season', 'driver_code']),
  upsert('constructor_standings', withSeries(b.constructor_standings), ['series', 'season', 'team']),
  upsert('race_results', withSeries(b.race_results.map((r) => ({ session: 'race', ...r }))), ['series', 'season', 'round', 'session', 'position', 'driver_code']),
  upsert('f1_sync', [{ series: 'f1', season, last_round_with_results: b.last_round_with_results, synced_at: new Date().toISOString() }], ['series', 'season']),
].join('\n'));
if (season === new Date().getFullYear()) {
  const photos = await fetchHeadshots().catch(() => ({}));
  const vals = Object.entries(photos).map(([c, u]) => `('${c}','${u}')`).join(',');
  if (vals) await sql(`update drivers d set headshot_url = v.url from (values ${vals}) as v(code, url) where d.series='f1' and d.season=${season} and d.code=v.code`);
  console.log(`✓ fotos: ${Object.keys(photos).length}`);
}
console.log(`✓ ${season}: ${b.races.length} corridas, ${b.drivers.length} pilotos, ${b.race_results.length} resultados (até a rodada ${b.last_round_with_results}), ${b.constructor_standings.length} equipes`);
