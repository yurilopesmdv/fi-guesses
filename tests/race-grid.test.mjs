import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gridFromResults, resolveGridDrivers } from '../src/lib/raceGrid.ts';
import { fetchPublishedGrid, fetchRaceQualifying } from '../src/lib/f1api.ts';

const drivers = [{ code: 'HIL', driver_id: 'damon_hill', name: 'Damon Hill', team_color: '#fff' }, { code: 'PHI', driver_id: 'phil_hill', name: 'Phil Hill' }];
test('histórico usa grid real em vez da chegada, conserva todos os pilotos e isola a corrida principal', () => {
  const results = [
    { series: 'f1', session: 'race', position: 1, grid: 4, driver_code: 'HIL', team: 'Williams' },
    { series: 'f1', session: 'race', position: 2, grid: 1, driver_code: 'PHI' },
    { series: 'f1', session: 'race', position: 3, grid: null, driver_code: 'OUT' },
    { series: 'f1', session: 'sprint', position: 1, grid: 1, driver_code: 'SPR' },
  ];
  const grid = gridFromResults(results, drivers);
  assert.equal(grid.source, 'results');
  assert.deepEqual(grid.rows.map((r) => r.driver_code), ['PHI', 'HIL', 'OUT']);
  assert.equal(grid.rows[1].position, 4);
  assert.equal(grid.rows[1].driver_id, 'damon_hill');
  assert.equal(results[0].position, 1);
});
test('sem grid histórico permite buscar classificação; zero não vira pole', () => {
  assert.equal(gridFromResults([], drivers), null);
  assert.equal(gridFromResults([{ series: 'f1', session: 'race', grid: null }], drivers), null);
  const grid = gridFromResults([{ series: 'f1', session: 'race', grid: 0, driver_code: 'BOX' }, { series: 'f1', session: 'race', grid: 1, driver_code: 'HIL' }], drivers);
  assert.deepEqual(grid.rows.map((r) => r.position), [1, 0]);
});
test('identidade histórica usa driver_id mesmo com sigla diferente', () => {
  const grid = resolveGridDrivers({ source: 'qualifying', rows: [{ driver_id: 'phil_hill', driver_code: 'HIL', position: 1, name: 'Phil Hill' }] }, drivers);
  assert.equal(grid.rows[0].driver_code, 'PHI');
});
test('grid publicado seleciona Race e mapeia número para piloto sem autenticação', async () => {
  const original = globalThis.fetch;
  const paths = [];
  globalThis.fetch = async (url, options) => {
    paths.push(String(url));
    assert.equal(options.headers, undefined);
    const rows = paths.length === 1 ? [
      { session_name: 'Sprint', session_key: 10, date_start: '2024-06-09T14:00:00Z' },
      { session_name: 'Race', session_key: 20, date_start: '2024-06-09T18:00:00Z' },
    ] : paths.length === 2 ? [{ position: 2, driver_number: 44 }] : [{ driver_number: 44, name_acronym: 'HAM', full_name: 'Lewis Hamilton', team_colour: '27F4D2' }];
    return Response.json(rows);
  };
  try {
    const rows = await fetchPublishedGrid('2024-06-09T18:00:00Z', 2024);
    assert.match(paths[1], /starting_grid\?session_key=20/);
    assert.equal(rows[0].name, 'Lewis Hamilton');
    assert.equal(rows[0].team_color, '#27F4D2');
    assert.equal(rows[0].position, 2);
  } finally { globalThis.fetch = original; }
});
test('classificação vazia é normal e identidade da qualy independe do importador', async () => {
  const original = globalThis.fetch;
  let count = 0;
  globalThis.fetch = async (url) => {
    assert.match(String(url), /1996\/1\/qualifying.json/);
    return Response.json({ MRData: { RaceTable: { Races: count++ === 0 ? [] : [{ QualifyingResults: [{ position: '1', Driver: { driverId: 'damon_hill', givenName: 'Damon', familyName: 'Hill' }, Constructor: { constructorId: 'williams' } }] }] } } });
  };
  try {
    assert.deepEqual(await fetchRaceQualifying(1996, 1), []);
    const rows = await fetchRaceQualifying(1996, 1);
    assert.equal(rows[0].driver_id, 'damon_hill');
    assert.equal(rows[0].position, 1);
    assert.equal(rows[0].name, 'Damon Hill');
  } finally { globalThis.fetch = original; }
});

test('repositório prioriza histórico, bloqueia corrida futura e faz fallback/cache/atualização após qualy', async () => {
  const { build } = await import('esbuild');
  const { mkdir, writeFile } = await import('node:fs/promises');
  const { createRequire } = await import('node:module');
  const built = await build({
    entryPoints: ['src/lib/repo.ts'], bundle: true, platform: 'node', format: 'cjs', write: false,
    plugins: [{ name: 'grid-repo-dependencies', setup(b) {
      b.onResolve({ filter: /^\.\/(supabase|f1api)$/ }, (args) => ({ path: args.path, namespace: 'mock' }));
      b.onLoad({ filter: /.*/, namespace: 'mock' }, (args) => ({ contents: args.path === './supabase'
        ? 'export const supabase = {};'
        : 'export const fetchPublishedGrid=(...a)=>globalThis.gridRepoTest.published(...a); export const fetchRaceQualifying=(...a)=>globalThis.gridRepoTest.qualifying(...a); export const fetchRaceResult=()=>{}; export const fetchSeasonBundle=()=>{};' }));
    } }],
  });
  await mkdir('.expo', { recursive: true });
  await writeFile('.expo/race-grid-repo-test.cjs', built.outputFiles[0].text);
  const { getStartingGrid } = createRequire(import.meta.url)('../.expo/race-grid-repo-test.cjs');
  let published = 0, qualifying = 0;
  globalThis.gridRepoTest = {
    published: async () => { published++; throw new Error('401'); },
    qualifying: async () => { qualifying++; return [{ position: 1, driver_id: 'phil_hill', driver_code: 'HIL', name: 'Phil Hill' }]; },
  };
  try {
    const race = { series: 'f1', season: 2024, round: 1, date_utc: '2024-03-02T15:00:00Z', quali_utc: '2024-03-01T15:00:00Z' };
    assert.equal(await getStartingGrid({ ...race, series: 'f2' }, drivers, []), null);
    assert.equal(await getStartingGrid({ ...race, quali_utc: '2100-01-01T15:00:00Z' }, drivers, []), null);
    const stored = await getStartingGrid(race, drivers, [{ series: 'f1', session: 'race', grid: 1, driver_code: 'HIL' }]);
    assert.equal(stored.source, 'results');
    assert.equal(published, 0);
    const fallback = await getStartingGrid(race, drivers, []);
    assert.equal(fallback.source, 'qualifying');
    assert.equal(fallback.rows[0].driver_code, 'PHI');
    assert.equal(published, 1); assert.equal(qualifying, 1);
    await getStartingGrid(race, drivers, []);
    assert.equal(published, 1); assert.equal(qualifying, 1);
    globalThis.gridRepoTest.published = async () => { published++; return [{ position: 2, driver_code: 'PHI', name: 'Phil Hill' }]; };
    assert.equal((await getStartingGrid(race, drivers, [], true)).source, 'openf1');
    assert.equal(published, 2);
    globalThis.gridRepoTest.published = async () => { throw new Error('offline'); };
    globalThis.gridRepoTest.qualifying = async () => { throw new Error('offline'); };
    await assert.rejects(getStartingGrid({ ...race, round: 2 }, drivers, []), /Não foi possível consultar/);
  } finally { delete globalThis.gridRepoTest; }
});
