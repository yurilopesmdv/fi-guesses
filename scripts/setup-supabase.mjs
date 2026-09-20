// Configura o projeto Supabase via Management API: roda migrations, desliga confirmação de e-mail
// e grava URL + anon key no .env. Precisa de SUPABASE_ACCESS_TOKEN no .env.
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';

const env = Object.fromEntries(
  (existsSync('.env') ? readFileSync('.env', 'utf8') : '').split('\n').filter((l) => l.includes('=')).map((l) => l.split(/=(.*)/s).slice(0, 2).map((x) => x.trim())),
);
const token = process.env.SUPABASE_ACCESS_TOKEN ?? env.SUPABASE_ACCESS_TOKEN;
if (!token) { console.error('SUPABASE_ACCESS_TOKEN ausente no .env'); process.exit(1); }

const api = async (path, init = {}) => {
  const res = await fetch(`https://api.supabase.com/v1${path}`, {
    ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path} → ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
};

const projects = await api('/projects');
const wanted = process.argv[2];
const project = wanted ? projects.find((p) => p.ref === wanted || p.name === wanted) : projects.length === 1 ? projects[0] : null;
if (!project) {
  console.log('Projetos:', projects.map((p) => `${p.name} (${p.ref}, ${p.region}, ${p.status})`).join('\n'));
  console.error('Passe o nome ou ref: node scripts/setup-supabase.mjs <ref>'); process.exit(1);
}
console.log(`Projeto: ${project.name} (${project.ref}) — ${project.status}`);

// 1. migrations (idempotência: tabela de controle)
await api(`/projects/${project.ref}/database/query`, { method: 'POST', body: JSON.stringify({ query: 'create table if not exists public._migrations (name text primary key, applied_at timestamptz default now())' }) });
const applied = new Set((await api(`/projects/${project.ref}/database/query`, { method: 'POST', body: JSON.stringify({ query: 'select name from public._migrations' }) })).map((r) => r.name));
for (const f of readdirSync('supabase/migrations').sort()) {
  if (applied.has(f)) { console.log(`- ${f} já aplicada`); continue; }
  const sql = readFileSync(`supabase/migrations/${f}`, 'utf8');
  await api(`/projects/${project.ref}/database/query`, { method: 'POST', body: JSON.stringify({ query: `begin; ${sql}; insert into public._migrations(name) values ('${f}'); commit;` }) });
  console.log(`✓ ${f} aplicada`);
}

// 2. auth: e-mail+senha sem confirmação
await api(`/projects/${project.ref}/config/auth`, { method: 'PATCH', body: JSON.stringify({ mailer_autoconfirm: true, external_email_enabled: true }) });
console.log('✓ auth: confirmação de e-mail desligada');

// 3. .env do app
const keys = await api(`/projects/${project.ref}/api-keys?reveal=true`);
const anon = keys.find((k) => k.name === 'anon')?.api_key ?? keys.find((k) => k.type === 'publishable')?.api_key;
if (!anon) throw new Error('anon key não encontrada: ' + JSON.stringify(keys.map((k) => k.name)));
if (process.env.CI) { console.log('✓ CI: .env não é gravado'); } else {
  const lines = (existsSync('.env') ? readFileSync('.env', 'utf8') : '').split('\n').filter((l) => !l.startsWith('EXPO_PUBLIC_SUPABASE_'));
  lines.push(`EXPO_PUBLIC_SUPABASE_URL=https://${project.ref}.supabase.co`, `EXPO_PUBLIC_SUPABASE_ANON_KEY=${anon}`);
  writeFileSync('.env', lines.filter(Boolean).join('\n') + '\n');
  console.log('✓ .env atualizado com URL e anon key');
}
