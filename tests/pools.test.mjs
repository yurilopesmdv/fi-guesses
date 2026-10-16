import assert from 'node:assert/strict';
import { after, afterEach, before, beforeEach, test } from 'node:test';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

// PostgreSQL em memória. Não lê .env nem acessa serviços externos.
const db = new PGlite();
const uid = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const poolA = uid(101), poolB = uid(102), poolC = uid(103);
const raceA = uid(201), raceB = uid(202), raceC = uid(203);
const podium = { p1: 'VER', p2: 'NOR', p3: 'LEC' };
const swapped = { p1: 'NOR', p2: 'LEC', p3: 'VER' };

async function asUser(n, role = 'authenticated') {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [n ? uid(n) : '']);
  await db.exec(`set role ${role}`);
}

async function answer(pool, user, value) {
  await db.query(`insert into predictions (question_id,user_id,answer)
    select id,$2,$3 from questions where pool_id=$1 and kind='podium'`, [pool, uid(user), value]);
}

before(async () => {
  await db.exec(`
    create role authenticated nologin;
    create role anon nologin;
    create schema auth;
    create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant usage on schema public, auth to authenticated, anon;
    grant execute on function auth.uid() to authenticated, anon;
  `);
  for (const name of (await readdir(new URL('../supabase/migrations/', import.meta.url))).sort()) {
    // Ajuste exclusivo de pg_cron/pg_net: validado também na instância real.
    if (name.startsWith('0018_')) continue;
    let sql = await readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8');
    // PGlite não inclui pg_cron/pg_net. A função de apuração dessa migration
    // é aplicada; apenas o agendamento externo fica fora deste teste.
    if (name.startsWith('0010_')) sql = sql.split('-- Agendamento:')[0];
    await db.exec(sql);
  }
  await db.exec('grant select, insert, update, delete on all tables in schema public to authenticated, anon');
  for (const [n, name] of [[1, 'Ana'], [2, 'Bruno'], [3, 'Carla'], [4, 'Davi'], [5, 'Observador']]) {
    await db.query('insert into auth.users values ($1,$2,$3)', [uid(n), `p${n}@example.test`, { name }]);
  }
  for (const [id, season, round, date] of [[raceA, 2026, 1, '2026-03-01'], [raceB, 2025, 1, '2025-03-01'], [raceC, 2026, 2, '2099-03-01']]) {
    await db.query('insert into races (id,season,round,name,date_utc) values ($1,$2,$3,$4,$5)', [id, season, round, `GP ${season}/${round}`, date]);
  }
  for (const [id, owner, season, race, code] of [[poolA, 1, 2026, raceA, 'AAAAAA'], [poolB, 2, 2025, raceB, 'BBBBBB'], [poolC, 4, 2026, raceC, 'CCCCCC']]) {
    await db.query('insert into pools (id,name,invite_code,owner_id,season,race_id) values ($1,$2,$3,$4,$5,$6)', [id, code, code, uid(owner), season, race]);
  }
  await db.query('insert into pool_members (pool_id,user_id) values ($1,$2),($3,$4),($3,$5)', [poolA, uid(2), poolB, uid(1), uid(3)]);
  await answer(poolA, 1, podium); await answer(poolA, 2, swapped);
  await answer(poolB, 1, swapped); await answer(poolB, 2, podium);
  await db.query("insert into results (question_id,answer) select id,$1 from questions where pool_id in ($2,$3)", [podium, poolA, poolB]);
});

beforeEach(async () => { await db.exec('begin'); });
afterEach(async () => { await db.exec('rollback'); });
after(async () => { await db.close(); });

test('ranking soma todos os bolões e anos, mesmo para quem não é membro', async () => {
  await asUser(5);
  const { rows } = await db.query('select * from global_standings()');
  assert.deepEqual(rows.map((r) => [r.name, Number(r.total), Number(r.pools_played), Number(r.races_scored), Number(r.rank)]), [
    ['Ana', 12, 2, 2, 1], ['Bruno', 12, 2, 2, 1], ['Carla', 0, 1, 0, 3], ['Davi', 0, 1, 0, 3],
  ]);
  assert.equal((await db.query('select * from predictions')).rows.length, 0, 'RPC não abre leitura dos palpites');
  assert.equal((await db.query('select * from pools')).rows.length, 0, 'catálogo detalhado mantém RLS');
});

test('correção de apuração é refletida na próxima consulta, sem cache de ranking', async () => {
  await db.query('update results set answer=$1 where question_id in (select id from questions where pool_id=$2)', [swapped, poolA]);
  await asUser(5);
  const { rows } = await db.query('select name,total,rank from global_standings()');
  assert.deepEqual(rows.slice(0, 2).map((r) => [r.name, Number(r.total), Number(r.rank)]), [['Bruno', 18, 1], ['Ana', 6, 2]]);
});

test('a mesma corrida em outro bolão conta separadamente', async () => {
  const extra = uid(104);
  await db.query('insert into pools (id,name,invite_code,owner_id,season,race_id) values ($1,$2,$3,$4,2026,$5)', [extra, 'Outro bolão', 'DDDDDD', uid(1), raceA]);
  await answer(extra, 1, podium);
  await db.query('insert into results (question_id,answer) select id,$1 from questions where pool_id=$2', [podium, extra]);
  await asUser(5);
  const row = (await db.query('select * from global_standings() where user_id=$1', [uid(1)])).rows[0];
  assert.equal(Number(row.total), 21); assert.equal(Number(row.pools_played), 3);
});

test('membro não proprietário não consegue excluir o bolão', async () => {
  await asUser(2);
  const result = await db.query('delete from pools where id=$1 returning id', [poolA]);
  assert.equal(result.rows.length, 0);
  assert.equal((await db.query('select id from pools where id=$1', [poolA])).rows.length, 1);
});

test('não membro não consegue excluir o bolão', async () => {
  await asUser(5);
  assert.equal((await db.query('delete from pools where id=$1 returning id', [poolA])).rows.length, 0);
});

test('proprietário exclui em cascata e pontos somem do ranking', async () => {
  const ids = (await db.query('select id from questions where pool_id=$1', [poolA])).rows.map((r) => r.id);
  await asUser(1);
  assert.equal((await db.query('delete from pools where id=$1 returning id', [poolA])).rows.length, 1);
  await asUser(5);
  const { rows } = await db.query('select name,total from global_standings()');
  assert.deepEqual(rows.slice(0, 2).map((r) => [r.name, Number(r.total)]), [['Bruno', 9], ['Ana', 3]]);
  await db.exec('reset role');
  for (const table of ['pool_members', 'questions']) {
    assert.equal((await db.query(`select count(*) as n from ${table} where pool_id=$1`, [poolA])).rows[0].n, 0);
  }
  for (const table of ['predictions', 'results']) {
    assert.equal((await db.query(`select count(*) as n from ${table} where question_id=any($1::uuid[])`, [ids])).rows[0].n, 0);
  }
  assert.equal((await db.query('select count(*) as n from profiles')).rows[0].n, 5, 'perfis são preservados');
  assert.equal((await db.query('select count(*) as n from races')).rows[0].n, 3, 'corridas oficiais são preservadas');
});

test('usuário sem sessão não acessa RPC nem exclui bolões', async () => {
  await asUser(null, 'anon');
  assert.equal((await db.query('delete from pools where id=$1 returning id', [poolA])).rows.length, 0);
  await assert.rejects(db.query('select * from global_standings()'), /permission denied/);
});

test('sessão ausente mesmo com role authenticated retorna ranking vazio', async () => {
  await asUser(null);
  assert.deepEqual((await db.query('select * from global_standings()')).rows, []);
});

test('sem bolões existentes, ranking fica vazio sem apagar perfis', async () => {
  await db.exec('delete from pools');
  await asUser(1);
  assert.deepEqual((await db.query('select * from global_standings()')).rows, []);
});

test('status separa apurados de corridas futuras e prioriza andamento com criação recente', async () => {
  await db.query("update pools set created_at=case id when $1 then '2026-01-01'::timestamptz when $2 then '2026-10-01'::timestamptz else '2026-09-01'::timestamptz end", [poolA, poolB]);
  await asUser(5);
  const { rows } = await db.query('select * from pool_lifecycles()');
  assert.deepEqual(rows.map((r) => [r.pool_id, r.status]), [[poolC, 'ongoing'], [poolB, 'finished'], [poolA, 'finished']]);
  assert.equal(Number(rows[0].pending_results), 0, 'corrida futura não é apuração atrasada');
});

test('palpites fechados antes da largada não significam bolão finalizado', async () => {
  await db.query("update races set date_utc=now()+interval '10 minutes' where id=$1", [raceA]);
  await db.query('update pools set lock_minutes_before=20 where id=$1', [poolA]);
  await asUser(1);
  const summary = (await db.query('select * from my_pools_summary() where pool_id=$1', [poolA])).rows[0];
  assert.equal(summary.next_race_date, null);
  const state = (await db.query('select * from pool_lifecycles($1::uuid[])', [[poolA]])).rows[0];
  assert.equal(state.status, 'ongoing'); assert.equal(state.has_future_races, true);
});

test('corrida passada sem apuração ou com pódio incompleto permanece em andamento', async () => {
  await db.query('delete from results where question_id in (select id from questions where pool_id=$1)', [poolA]);
  await asUser(1);
  let state = (await db.query('select * from pool_lifecycles($1::uuid[])', [[poolA]])).rows[0];
  assert.equal(state.status, 'ongoing'); assert.equal(Number(state.pending_results), 1);
  await db.query("insert into results (question_id,answer) select id,'{\"p1\":\"VER\"}'::jsonb from questions where pool_id=$1", [poolA]);
  state = (await db.query('select * from pool_lifecycles($1::uuid[])', [[poolA]])).rows[0];
  assert.equal(state.status, 'ongoing'); assert.equal(Number(state.pending_results), 1);
});

test('pergunta extra pendente impede finalização e apuração libera status finalizado', async () => {
  const q = uid(301);
  await db.query("insert into questions(id,pool_id,race_id,kind,prompt) values($1,$2,$3,'yesno','Safety car?')", [q,poolA,raceA]);
  await asUser(1);
  assert.equal((await db.query('select status from pool_lifecycles($1::uuid[])', [[poolA]])).rows[0].status, 'ongoing');
  await db.query("insert into results(question_id,answer,set_by) values($1,'{\"v\":false}'::jsonb,$2)", [q,uid(1)]);
  assert.equal((await db.query('select status from pool_lifecycles($1::uuid[])', [[poolA]])).rows[0].status, 'finished');
});

test('temporada com corridas futuras não finaliza só por apurar as anteriores', async () => {
  const p = uid(104);
  await db.query("insert into pools(id,name,invite_code,owner_id,season) values($1,'Temporada','SEASON',$2,2026)", [p,uid(1)]);
  await db.query('insert into results(question_id,answer) select id,$1 from questions where pool_id=$2 and race_id=$3', [podium,p,raceA]);
  await asUser(1);
  const state = (await db.query('select * from pool_lifecycles($1::uuid[])', [[p]])).rows[0];
  assert.equal(state.status, 'ongoing'); assert.equal(state.has_future_races, true); assert.equal(Number(state.pending_results), 0);
});

test('ausência de calendário e categoria F2 não finalizam nem prolongam bolão F1', async () => {
  const p = uid(104);
  await db.query("insert into pools(id,name,invite_code,owner_id,season) values($1,'Sem calendário','NODATA',$2,2098)", [p,uid(1)]);
  await db.query("insert into races(series,season,round,name,date_utc) values('f2',2026,99,'F2 futura','2099-12-01')");
  await asUser(1);
  const states = (await db.query('select * from pool_lifecycles($1::uuid[])', [[p,poolA]])).rows;
  assert.equal(states.find((s) => s.pool_id === p).has_races, false);
  assert.equal(states.find((s) => s.pool_id === p).status, 'ongoing');
  assert.equal(states.find((s) => s.pool_id === poolA).status, 'finished');
});

test('metadados de status só são acessíveis com sessão e respeitam filtro de IDs', async () => {
  await asUser(5);
  assert.deepEqual((await db.query('select pool_id from pool_lifecycles($1::uuid[])', [[poolA]])).rows, [{pool_id:poolA}]);
  assert.deepEqual((await db.query('select * from pool_lifecycles($1::uuid[])', [[]])).rows, []);
  await asUser(null);
  assert.deepEqual((await db.query('select * from pool_lifecycles()')).rows, []);
  await asUser(null,'anon');
  await assert.rejects(db.query('select * from pool_lifecycles()'), /permission denied/);
});
