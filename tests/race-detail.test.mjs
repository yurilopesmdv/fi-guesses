import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRaceDetailHandler, ensureStints } from '../supabase/functions/_shared/race-detail.ts';

// Banco falso: tabelas em memória com select/eq/maybeSingle e upsert por chave.
function fakeDb(seed = {}) {
  const t = { races: [], ...seed };
  return {
    t,
    from(name) {
      t[name] ??= [];
      const q = { filters: [] };
      const api = {
        select() { return api; },
        eq(k, v) { q.filters.push([k, v]); return api; },
        async maybeSingle() { return { data: t[name].find((r) => q.filters.every(([k, v]) => r[k] === v)) ?? null, error: null }; },
        async upsert(rows, { onConflict }) {
          const keys = onConflict.split(',');
          for (const row of [].concat(rows)) {
            const i = t[name].findIndex((r) => keys.every((k) => r[k] === row[k]));
            if (i >= 0) t[name][i] = { ...t[name][i], ...row }; else t[name].push(row);
          }
          return { error: null };
        },
      };
      return api;
    },
  };
}
const post = (body) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) });

test('race-detail valida GP e só busca voltas uma vez', async () => {
  const db = fakeDb({ races: [{ series: 'f1', season: 2024, round: 21, date_utc: '2024-11-03T15:30:00Z' }, { series: 'f1', season: 2099, round: 1, date_utc: '2099-01-01T00:00:00Z' }] });
  let calls = 0;
  const h = createRaceDetailHandler(db, { laps: async () => { calls++; return { laps: 2, positions: { ver: [, 3, 1] } }; }, stints: async () => [] });
  assert.equal((await h(post({ season: 1990, round: 1 }))).status, 400);
  assert.equal((await h(new Request('http://x'))).status, 405);
  const ok = await (await h(post({ season: 2024, round: 21 }))).json();
  assert.equal(ok.laps, 'stored');
  assert.deepEqual(db.t.race_lap_positions[0].positions, [null, 3, 1]);
  assert.equal((await (await h(post({ season: 2024, round: 21 }))).json()).laps, 'cached');
  assert.equal(calls, 1);
});

test('stints bloqueados contam tentativa sem derrubar a resposta', async () => {
  const db = fakeDb();
  assert.equal(await ensureStints(db, async () => { throw new Error('OpenF1 indisponível (401)'); }, 2025, 5, '2025-05-04T20:00:00Z'), 'blocked');
  assert.equal(db.t.race_stints_meta[0].attempts, 1);
  assert.equal(await ensureStints(db, async () => [{ driver_code: 'VER', stint: 1, compound: 'MEDIUM', lap_start: 1, lap_end: 30 }], 2025, 5, ''), 'stored');
  assert.equal(await ensureStints(db, async () => { throw new Error('x'); }, 2025, 5, ''), 'cached');
  assert.equal(await ensureStints(db, async () => [], 2019, 5, ''), 'unsupported');
});
