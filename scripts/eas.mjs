// Usa tokens do .env local ou do ambiente do CI sem passá-los na linha de comando.
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const envFile = new URL('../.env', import.meta.url);
const env = { ...(existsSync(envFile) ? parseEnv(readFileSync(envFile, 'utf8')) : {}), ...process.env };
const result = spawnSync(process.execPath, [fileURLToPath(new URL('../node_modules/eas-cli/bin/run', import.meta.url)), ...process.argv.slice(2)], {
  cwd: projectRoot, env, stdio: 'inherit',
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
