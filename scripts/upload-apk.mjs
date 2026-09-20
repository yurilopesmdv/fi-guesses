// Sobe o APK pro bucket público "site" do Supabase (link fixo). Uso: node scripts/upload-apk.mjs <caminho.apk>
import { readFileSync } from 'node:fs';
const env = Object.fromEntries(readFileSync('.env', 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => l.split(/=(.*)/s).slice(0, 2).map((x) => x.trim())));
const ref = new URL(env.EXPO_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const keys = await (await fetch(`https://api.supabase.com/v1/projects/${ref}/api-keys?reveal=true`, { headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}` } })).json();
const service = keys.find((k) => k.name === 'service_role').api_key; // só em memória
const h = { Authorization: `Bearer ${service}`, apikey: service };
const b = await fetch(`${env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/bucket`, { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 'site', name: 'site', public: true }) });
if (!b.ok && !(await b.text()).includes('already exists')) throw new Error('bucket');
const r = await fetch(`${env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/site/bolao-f1.apk`, {
  method: 'POST', headers: { ...h, 'Content-Type': 'application/vnd.android.package-archive', 'x-upsert': 'true' }, body: readFileSync(process.argv[2]),
});
if (!r.ok) throw new Error(await r.text());
console.log(`✓ ${env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/site/bolao-f1.apk`);
