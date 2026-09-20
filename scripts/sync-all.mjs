// Importa todas as temporadas (1950 → atual) que ainda não estão no banco, com pausa entre elas.
// Uso: nohup node scripts/sync-all.mjs > /tmp/sync-all.log 2>&1 &
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const env = Object.fromEntries(readFileSync('.env', 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => l.split(/=(.*)/s).slice(0, 2).map((x) => x.trim())));
const ref = new URL(env.EXPO_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, { method: 'POST', headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: 'select season from f1_sync where series = 'f1' and last_round_with_results > 0' }) });
const done = new Set((await res.json()).map((r) => r.season));
const years = Array.from({ length: new Date().getFullYear() - 1949 }, (_, i) => new Date().getFullYear() - i).filter((y) => !done.has(y));
console.log(`${years.length} temporadas pendentes: ${years.join(' ')}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const y of years) {
  for (let tent = 0; tent < 4; tent++) {
    try { console.log(execFileSync('npx', ['tsx', 'scripts/sync-f1.mjs', String(y)], { encoding: 'utf8' }).trim()); break; }
    catch (e) { console.log(`${y}: falhou (${tent + 1}) — ${String(e.stderr ?? e.message).match(/F1 API [^\n]*/)?.[0] ?? 'erro'}; esperando 90 s`); await sleep(90_000); }
  }
  await sleep(8_000); // ~10 req por temporada → fica abaixo de 500 req/h
}
console.log('FIM');
