import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSyncHandler } from '../supabase/functions/_shared/sync-handler.ts';

const request = (body) => new Request('https://example.test/sync', { method: 'POST', body: JSON.stringify(body) });
const success = async () => ({ races: 1 });

test('preflight responde sem sincronizar ou apurar e permite headers do cliente', async () => {
  const handler = createSyncHandler(() => { throw new Error('Não chamar'); }, () => { throw new Error('Não chamar'); });
  const response = await handler(new Request('https://example.test/sync', { method: 'OPTIONS' }));
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
  assert.match(response.headers.get('access-control-allow-headers'), /authorization/);
  assert.match(response.headers.get('access-control-allow-methods'), /POST/);
});

test('GET e corpos inválidos não iniciam importações', async () => {
  const handler = createSyncHandler(() => { throw new Error('Não chamar'); }, () => { throw new Error('Não chamar'); });
  assert.equal((await handler(new Request('https://example.test/sync'))).status, 405);
  for (const body of [null, [], 'texto', { series: 'invalid' }, { season: '2026' }, { season: 1949 }, { season: 2026.5 }]) {
    assert.equal((await handler(request(body))).status, 400);
  }
  assert.equal((await handler(new Request('https://example.test/sync', { method: 'POST', body: '{' }))).status, 400);
});

test('all sincroniza as três categorias e só depois apura F1', async () => {
  const calls = [];
  const handler = createSyncHandler(async (s, y) => { calls.push([s, y]); return { races: 1 }; }, async (y) => { calls.push(['settle', y]); return 2; });
  const response = await handler(request({ series: 'all', season: 2026 }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).settled, 2);
  assert.deepEqual(calls, [['f1', 2026], ['f2', 2026], ['f3', 2026], ['settle', 2026]]);
});

test('falha parcial não anuncia sucesso e não impede outras categorias', async () => {
  const calls = [];
  const handler = createSyncHandler(async (s) => { calls.push(s); if (s === 'f2') throw new Error('Fonte indisponível'); return {}; }, async () => 1);
  const response = await handler(request({ series: 'all' }));
  const body = await response.json();
  assert.equal(response.status, 502); assert.equal(body.ok, false);
  assert.match(body.error, /f2: Fonte indisponível/); assert.equal(body.settled, 1);
  assert.deepEqual(calls, ['f1', 'f2', 'f3']);
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
});

test('falha de F1 não apura sobre importação incompleta', async () => {
  const handler = createSyncHandler(async () => { throw new Error('Falha F1'); }, () => { throw new Error('Não apurar'); });
  const body = await (await handler(request({ series: 'f1' }))).json();
  assert.equal(body.ok, false); assert.equal(body.settled, undefined); assert.equal(body.error, 'f1: Falha F1');
});

test('falha de apuração é informada e F2 isolada não apura', async () => {
  const handler = createSyncHandler(success, async () => { throw new Error('RPC falhou'); });
  const response = await handler(request({ series: 'f1' }));
  assert.equal(response.status, 502); assert.match((await response.json()).error, /apuração: RPC falhou/);
  assert.equal((await handler(request({ series: 'f2' }))).status, 200);
});
