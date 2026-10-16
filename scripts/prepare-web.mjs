// Mesmo artefato de convite para publicação local e CI.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';

const envFile = new URL('../.env', import.meta.url);
const env = { ...(existsSync(envFile) ? parseEnv(readFileSync(envFile, 'utf8')) : {}), ...process.env };
const apk = env.APK_URL || (env.EXPO_PUBLIC_SUPABASE_URL && `${env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/site/bolao-f1.apk`);
if (!apk || new URL(apk).protocol !== 'https:') throw new Error('Configure APK_URL ou EXPO_PUBLIC_SUPABASE_URL com uma URL HTTPS válida.');
const target = resolve(process.argv[2] ?? 'dist', 'entrar.html');
const template = readFileSync(new URL('../site/entrar.html', import.meta.url), 'utf8');
const html = template.replace("'__APK_URL__'", JSON.stringify(apk));
if (html.includes('__APK_URL__')) throw new Error('Não foi possível substituir o link de APK no convite.');
writeFileSync(target, html);
console.log('Página de convite preparada:', target);
