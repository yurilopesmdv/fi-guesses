// Publicação pela Management API, com bundle único e sem dependência de Docker.
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const args = process.argv.slice(2);
const [slug = 'sync-series', explicitRef] = args.filter((arg) => arg !== '--dry-run');
if (!/^[a-z][a-z0-9-]*$/.test(slug)) throw new Error('Nome de função inválido.');
const root = fileURLToPath(new URL('../', import.meta.url));
const envFile = new URL('../.env', import.meta.url);
const env = { ...(existsSync(envFile) ? parseEnv(readFileSync(envFile, 'utf8')) : {}), ...process.env };
const result = await build({
  absWorkingDir: root, entryPoints: [`supabase/functions/${slug}/index.ts`],
  bundle: true, format: 'esm', platform: 'neutral', target: 'es2022',
  external: ['npm:*'], write: false, logLevel: 'silent',
});
const source = result.outputFiles[0].contents;
if (args.includes('--dry-run')) {
  console.log(`Bundle validado: ${slug}, ${source.byteLength} bytes; nenhuma publicação realizada.`);
  process.exit(0);
}
const ref = explicitRef || env.SUPABASE_PROJECT_REF || (env.EXPO_PUBLIC_SUPABASE_URL && new URL(env.EXPO_PUBLIC_SUPABASE_URL).hostname.split('.')[0]);
if (!ref || !/^[a-z0-9]{20}$/.test(ref)) throw new Error('Informe o project ref ou configure a URL do Supabase.');
if (!env.SUPABASE_ACCESS_TOKEN) throw new Error('SUPABASE_ACCESS_TOKEN ausente.');
const form = new FormData();
form.append('metadata', JSON.stringify({ name: slug, entrypoint_path: 'index.ts', verify_jwt: true }));
form.append('file', new Blob([source], { type: 'application/typescript' }), 'index.ts');
const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/functions/deploy?slug=${slug}`, {
  method: 'POST', headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}` },
  body: form, signal: AbortSignal.timeout(120_000),
});
const data = await response.json();
if (!response.ok) throw new Error(`Publicação ${slug}: HTTP ${response.status}. Confira credencial, permissões e bundle.`);
console.log(JSON.stringify({ slug: data.slug, status: data.status, version: data.version, verify_jwt: data.verify_jwt }));
