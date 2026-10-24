import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import React from 'react';
import { act, create } from 'react-test-renderer';

// Exercita o provider real sem rede ou módulos nativos.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const result = await build({
  entryPoints: ['src/lib/usePool.tsx'], bundle: true, platform: 'node', format: 'cjs',
  jsx: 'automatic', external: ['react', 'react/jsx-runtime'], write: false,
  plugins: [{ name: 'pool-test-dependencies', setup(b) {
    b.onResolve({ filter: /^(react-native|expo-router|\.\/repo)$/ }, args => ({ path: args.path, namespace: 'mock' }));
    b.onLoad({ filter: /.*/, namespace: 'mock' }, args => ({ contents:
      args.path === 'react-native' ? 'export const AppState = {};' :
      args.path === 'expo-router' ? 'export const useFocusEffect = () => {};' :
      'export const getPool=(...a)=>globalThis.poolTestRepo.getPool(...a); export const listRaces=(...a)=>globalThis.poolTestRepo.listRaces(...a); export const listDrivers=(...a)=>globalThis.poolTestRepo.listDrivers(...a); export const listPoolLifecycles=async()=>[];'
    }));
  } }],
});
await mkdir('.expo', { recursive: true });
await writeFile('.expo/pool-loading-test.cjs', result.outputFiles[0].text);
const { PoolProvider, usePool } = createRequire(import.meta.url)('../.expo/pool-loading-test.cjs');
const pool = { id: 'pool', season: 2025, race_id: 'race', lock_minutes_before: 0 };
const race = { id: 'race', date_utc: '2025-10-01T12:00:00Z' };
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
async function mount() {
  let state, root;
  function Probe() { state = usePool(); return null; }
  await act(async () => { root = create(React.createElement(PoolProvider, { id: 'pool' }, React.createElement(Probe))); });
  return { state: () => state, unmount: () => act(async () => root.unmount()) };
}

test('aguarda calendário lento e consulta F1 no ano do bolão, filtrando GP único', async () => {
  const calendar = deferred(); const calls = [];
  globalThis.poolTestRepo = {
    getPool: async () => pool,
    listRaces: (...args) => { calls.push(args); return calendar.promise; },
    listDrivers: async (...args) => { calls.push(args); return [{ code: 'VER' }]; },
  };
  const app = await mount();
  try {
    assert.equal(app.state().loading, true);
    assert.equal(app.state().pool, null);
    assert.deepEqual(calls, [[2025, 'f1'], [2025, 'f1']]);
    await act(async () => calendar.resolve([{ id: 'other' }, race]));
    assert.equal(app.state().loading, false);
    assert.equal(app.state().error, null);
    assert.deepEqual(app.state().races, [race]);
    assert.equal(app.state().nextRace.id, 'race');
  } finally { await app.unmount(); }
});

test('falha de rede apresenta erro e tentar novamente recarrega corridas e pilotos', async () => {
  let fail = true;
  globalThis.poolTestRepo = {
    getPool: async () => pool,
    listRaces: async () => { if (fail) throw new Error('offline'); return [race]; },
    listDrivers: async () => [{ code: 'VER' }],
  };
  const app = await mount();
  try {
    assert.equal(app.state().loading, false);
    assert.match(app.state().error, /carregar as corridas/);
    fail = false;
    await act(async () => app.state().reload());
    assert.equal(app.state().error, null);
    assert.equal(app.state().nextRace.id, 'race');
    assert.equal(app.state().drivers[0].code, 'VER');
  } finally { await app.unmount(); }
});
