// Carga do tempo total de prova (H24) em race_results.time_ms, casando por temporada/rodada/posição.
// Uso: node scripts/sync-race-times.mjs 1971            → amostra de uma temporada, sem escrita
//      node scripts/sync-race-times.mjs 1950 2026 --apply → grava (requer migration 0048). ~300 consultas Jolpica (limite 500/h).
import { readFileSync } from 'node:fs';
const env = Object.fromEntries(readFileSync('.env', 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => l.split(/=(.*)/s).slice(0, 2).map((x) => x.trim())));
const args = process.argv.slice(2).filter((a) => !a.startsWith('--')).map(Number);
const from = args[0], to = args[1] ?? args[0], apply = process.argv.includes('--apply');
if (!from) { console.error('Informe a temporada inicial.'); process.exit(1); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ref = new URL(env.EXPO_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
async function get(path) {
  for (let t = 0; t < 8; t++) {
    const res = await fetch(`https://api.jolpi.ca/ergast/f1/${path}`);
    if (res.status === 429) { await sleep(Number(res.headers.get('retry-after') ?? 0) * 1000 || 5000 * (t + 1)); continue; }
    if (!res.ok) throw new Error(`Jolpica ${res.status} ${path}`);
    await sleep(350);
    return (await res.json()).MRData;
  }
  throw new Error(`Jolpica 429 persistente ${path}`);
}
let total = 0, timed = 0;
for (let season = from; season <= to; season++) {
  const rows = [];
  for (let offset = 0; ; offset += 100) {
    const data = await get(`${season}/results.json?limit=100&offset=${offset}`);
    for (const race of data.RaceTable.Races) for (const r of race.Results) {
      total++;
      const ms = Number(r.Time?.millis);
      if (ms) { timed++; rows.push({ season, round: Number(race.round), position: Number(r.position), ms }); }
    }
    if (offset + 100 >= Number(data.total)) break;
  }
  if (!apply) { console.log(`${season}: ${rows.length} tempos`, rows.slice(0, 3)); continue; }
  if (!rows.length) continue;
  const payload = JSON.stringify(rows).replace(/'/g, "''");
  const query = `update race_results r set time_ms = x.ms from jsonb_to_recordset('${payload}'::jsonb) as x(season int, round int, position int, ms bigint)
   where r.series = 'f1' and r.session = 'race' and r.season = x.season and r.round = x.round and r.position = x.position and r.time_ms is distinct from x.ms`;
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, { method: 'POST', headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
  if (!res.ok) { console.error(`ERRO ${season}: ${res.status} ${await res.text()}`); process.exit(1); }
  process.stdout.write(`${season} `);
}
console.log(`\n${total} resultados lidos · ${timed} com tempo${apply ? ' · gravado' : ' (sem escrita)'}`);
