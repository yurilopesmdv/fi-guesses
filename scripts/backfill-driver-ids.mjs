// Preenche drivers.driver_id (F1) a partir de /{season}/drivers.json, reproduzindo as siglas geradas na importação.
import { readFileSync } from 'node:fs';
import { fetchSeasonDriverList, makeCodeBook } from '../src/lib/f1api.ts';
const env = Object.fromEntries(readFileSync('.env', 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => l.split(/=(.*)/s).slice(0, 2).map((x) => x.trim())));
const ref = new URL(env.EXPO_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const sql = async (query) => { const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, { method: 'POST', headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) }); if (!r.ok) throw new Error(await r.text()); return r.json(); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const seasons = (await sql("select distinct season from drivers where series='f1' and driver_id is null order by season")).map((r) => r.season);
console.log(`${seasons.length} temporadas`);
for (const season of seasons) {
  const book = makeCodeBook(await fetchSeasonDriverList(season));
  const values = [...book.entries()].map(([id, code]) => `('${code}','${id.replace(/'/g, "''")}')`).join(',');
  const n = await sql(`update drivers d set driver_id = v.id from (values ${values}) as v(code, id) where d.series='f1' and d.season=${season} and d.code=v.code returning 1`);
  process.stdout.write(`${season}:${n.length} `);
  await sleep(400);
}
console.log('\n' + JSON.stringify(await sql("select count(*) total, count(driver_id) com_id, count(distinct driver_id) pilotos from drivers where series='f1'")));
