// Seed/atualização dos dados da F1 direto no banco (via Management API). Uso: node scripts/sync-f1.mjs [season]
import { readFileSync } from 'node:fs';
import { fetchSeasonBundle } from '../src/lib/f1api.ts';

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
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  const vals = rows.map((r) => `(${cols.map((c) => lit(r[c])).join(',')})`).join(',\n');
  const set = cols.filter((c) => !conflict.includes(c)).map((c) => `${c}=excluded.${c}`).join(',');
  return `insert into public.${table} (${cols.join(',')}) values\n${vals}\non conflict (${conflict.join(',')}) do update set ${set};\n`;
};

const b = await fetchSeasonBundle(season);
await sql([
  upsert('races', b.races, ['season', 'round']),
  upsert('drivers', b.drivers, ['season', 'code']),
  upsert('driver_standings', b.driver_standings, ['season', 'driver_code']),
  upsert('constructor_standings', b.constructor_standings, ['season', 'team']),
  upsert('race_results', b.race_results, ['season', 'round', 'position', 'driver_code']),
  upsert('f1_sync', [{ season, last_round_with_results: b.last_round_with_results, synced_at: new Date().toISOString() }], ['season']),
].join('\n'));
console.log(`✓ ${season}: ${b.races.length} corridas, ${b.drivers.length} pilotos, ${b.race_results.length} resultados (até a rodada ${b.last_round_with_results}), ${b.constructor_standings.length} equipes`);
