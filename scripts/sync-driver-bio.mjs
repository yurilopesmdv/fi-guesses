// Carga de nascimento/nacionalidade (H23) de todos os pilotos F1 da Jolpica em driver_bio.
// Uso: node scripts/sync-driver-bio.mjs            → só conta (sem escrita)
//      node scripts/sync-driver-bio.mjs --apply    → grava via Management API (requer migration 0047)
import { readFileSync } from 'node:fs';
const env = Object.fromEntries(readFileSync('.env', 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => l.split(/=(.*)/s).slice(0, 2).map((x) => x.trim())));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rows = [];
for (let offset = 0; ; offset += 100) {
  let res;
  for (let t = 0; t < 6; t++) { res = await fetch(`https://api.jolpi.ca/ergast/f1/drivers.json?limit=100&offset=${offset}`); if (res.status !== 429) break; await sleep(3000 * (t + 1)); }
  if (!res.ok) throw new Error(`Jolpica ${res.status}`);
  const data = (await res.json()).MRData;
  for (const d of data.DriverTable.Drivers) rows.push({ driver_id: d.driverId, date_of_birth: d.dateOfBirth ?? null, nationality: d.nationality ?? null });
  if (offset + 100 >= Number(data.total)) break;
  await sleep(400);
}
console.log(`${rows.length} pilotos · ${rows.filter((r) => r.date_of_birth).length} com nascimento · ${rows.filter((r) => r.nationality).length} com nacionalidade`);
if (!process.argv.includes('--apply')) process.exit(0);
const ref = new URL(env.EXPO_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const payload = JSON.stringify(rows).replace(/'/g, "''");
const query = `insert into driver_bio(driver_id,date_of_birth,nationality,updated_at)
 select driver_id, date_of_birth, nationality, now() from jsonb_to_recordset('${payload}'::jsonb) as x(driver_id text, date_of_birth date, nationality text)
 on conflict (driver_id) do update set date_of_birth = excluded.date_of_birth, nationality = excluded.nationality, updated_at = now()`;
const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, { method: 'POST', headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
console.log(res.ok ? '✓ driver_bio atualizado' : `ERRO ${res.status}: ${await res.text()}`);
if (!res.ok) process.exit(1);
