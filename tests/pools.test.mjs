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
    create role service_role nologin bypassrls;
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
    if (name.startsWith('0018_') || name.startsWith('0026_') || name.startsWith('0027_')) continue;
    let sql = await readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8');
    // PGlite não inclui pg_cron/pg_net. A função de apuração dessa migration
    // é aplicada; apenas o agendamento externo fica fora deste teste.
    if (name.startsWith('0010_')) sql = sql.split('-- Agendamento:')[0];
    // Reproduz os defaults do Supabase para os RPCs novos, além dos grants de tabela.
    if (name.startsWith('0020_')) await db.exec('alter default privileges in schema public grant execute on functions to anon');
    await db.exec(sql);
    if (name.startsWith('0020_')) await db.exec('alter default privileges in schema public revoke execute on functions from anon');
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

async function seedCircuit() {
  await db.exec('reset role');
  await db.exec(`insert into circuits(id,name,locality,country,official_url,published) values
    ('test-circuit','Pista de teste','Cidade','Brazil','https://example.test',true),
    ('draft-circuit','Rascunho','Cidade','Brazil','https://example.test',false);
    insert into circuit_seasons values ('test-circuit',2026,1,'GP Teste','2026-03-01');
    insert into circuit_layouts(circuit_id,season,length_m,turns,direction,source_url) values('test-circuit',2026,4309,15,'anticlockwise','https://example.test');
    insert into circuit_imports(circuit_id,results_complete,source_url) values('test-circuit',true,'https://example.test');
    insert into circuit_race_winners values
      ('test-circuit',1973,1,'GP Antigo','1973-01-01','alpha','Alfa','Equipe A'),
      ('test-circuit',1990,1,'GP Retorno','1990-01-01','alpha','Alfa','Equipe A'),
      ('test-circuit',1990,2,'Outro GP na pista','1990-02-01','beta','Beta','Equipe B'),
      ('test-circuit',2026,1,'GP Teste','2026-03-01','beta','Beta','Equipe B');
    insert into circuit_media(id,circuit_id,kind,storage_path,thumbnail_path,width,height,caption,author,license,license_url,source_url,published) values
      ('photo','test-circuit','photo','photo.webp','thumb.webp',1920,1080,'Pista','Autor','CC BY 4.0','https://example.test','https://example.test',true),
      ('draft','test-circuit','photo','draft.webp','draft.webp',1920,1080,'Rascunho','Autor','CC BY 4.0','https://example.test','https://example.test',false);`);
}

test('pistas contam temporadas distintas, duas edições no ano e mantêm empate de vencedores por identidade', async () => {
  await seedCircuit(); await asUser(1);
  const {rows:[{profile}]}=await db.query("select circuit_profile('test-circuit') as profile");
  assert.equal(profile.stats.first_season,1973);
  assert.equal(profile.stats.seasons,3);
  assert.equal(profile.stats.races,4);
  assert.equal(profile.stats.complete,true);
  assert.equal(profile.stats.different_winners,2);
  assert.equal(profile.stats.record_wins,2);
  assert.deepEqual(profile.winners.map(w=>[w.driver_id,w.wins,w.rank]),[['alpha',2,1],['beta',2,1]]);
  assert.equal(profile.last_race.season,2026);
  assert.deepEqual(profile.media.map(m=>m.id),['photo']);
  assert.equal((await db.query('select count(*) from circuit_catalog(2026)')).rows[0].count,1);
  assert.equal((await db.query('select count(*) from circuit_catalog(2025)')).rows[0].count,0);
});

test('pistas não confundem vitória compartilhada com duas corridas', async()=>{
  await seedCircuit();
  await db.exec("insert into circuit_race_winners values('test-circuit',1973,1,'GP Antigo','1973-01-01','gamma','Gama','Equipe C')");
  await asUser(1);
  const {rows:[{profile}]}=await db.query("select circuit_profile('test-circuit') as profile");
  assert.equal(profile.stats.races,4);
  assert.equal(profile.stats.seasons,3);
  assert.equal(profile.winners.find(w=>w.driver_id==='gamma').wins,1);
});

test('rascunhos e usuários sem sessão não acessam catálogo nem mídias, mesmo com grants amplos legados',async()=>{
  await seedCircuit(); await asUser(1);
  assert.equal((await db.query("select circuit_profile('draft-circuit') as profile")).rows[0].profile,null);
  assert.equal((await db.query('select count(*) from circuits')).rows[0].count,1);
  await asUser(null);
  assert.equal((await db.query('select count(*) from circuit_catalog(2026)')).rows[0].count,0);
  assert.equal((await db.query('select count(*) from circuit_media')).rows[0].count,0);
  await asUser(null,'anon');
  await assert.rejects(db.query('select * from circuit_catalog(2026)'),/permission denied/);
});

test('membros não alteram pistas nem executam a atualização administrativa',async()=>{
  await seedCircuit(); await asUser(1);
  assert.equal((await db.query("update circuits set name='Alterada' where id='test-circuit' returning id")).rows.length,0);
  assert.equal((await db.query("delete from circuit_media returning id")).rows.length,0);
  await assert.rejects(db.query('select refresh_circuit_winners(2026)'),/permission denied/);
});

test('atualização do servidor corrige vencedor atual, ignora sprint e preserva acervo antigo',async()=>{
  await seedCircuit();
  await db.query("update races set circuit_id='test-circuit' where id=$1",[raceA]);
  await db.exec("insert into drivers(series,season,code,name,driver_id) values('f1',2026,'ALF','Alfa','alpha'),('f1',2026,'BET','Beta','beta'); insert into race_results(series,season,round,session,position,driver_code) values('f1',2026,1,'race',1,'ALF'),('f1',2026,1,'sprint',1,'BET'); select refresh_circuit_winners(2026);");
  let rows=(await db.query("select driver_id from circuit_race_winners where circuit_id='test-circuit' and season=2026")).rows;
  assert.deepEqual(rows.map(r=>r.driver_id),['alpha']);
  await db.exec("update race_results set driver_code='BET' where series='f1' and season=2026 and round=1 and session='race'; select refresh_circuit_winners(2026)");
  rows=(await db.query("select driver_id from circuit_race_winners where circuit_id='test-circuit' and season=2026")).rows;
  assert.deepEqual(rows.map(r=>r.driver_id),['beta']);
  assert.equal((await db.query("select count(*) from circuit_race_winners where circuit_id='test-circuit' and season=1973")).rows[0].count,1);
});


test('históricas excluem calendário atual, incluem retorno em outro ano e mantêm rascunhos e anônimos fora',async()=>{
  await seedCircuit();
  await db.exec(`insert into circuits(id,name,locality,country,official_url,published) values('archive-circuit','Histórica','Cidade','Portugal','https://example.test',true);
    insert into circuit_seasons values('archive-circuit',2027,1,'Retorno','2027-03-01');
    insert into circuit_race_winners values('archive-circuit',2021,1,'GP Antigo','2021-03-01','alpha','Alfa','Equipe A');`);
  await asUser(1);
  const rows=(await db.query('select * from circuit_archive(2026)')).rows;
  assert.deepEqual(rows.map(x=>x.circuit_archive.circuit.id),['archive-circuit']);
  assert.equal((await db.query('select count(*) from circuit_archive(2027)')).rows[0].count,1);
  await asUser(null);assert.equal((await db.query('select count(*) from circuit_archive(2026)')).rows[0].count,0);
  await asUser(null,'anon');await assert.rejects(db.query('select * from circuit_archive(2026)'),/permission denied/);
});


test('conteúdo só permite leitura publicada por autenticados e mantém coleta restrita',async()=>{
 await asUser(null,'postgres');
 await db.exec(`insert into content_posts(id,kind,title,summary,url,source_name,published,published_at) values
 ('news-ok','news','Notícia','Resumo','https://example.test/ok','Fonte',true,now()-interval '1 hour'),
 ('news-draft','news','Rascunho','','https://example.test/draft','Fonte',false,now()),
 ('news-future','news','Futura','','https://example.test/future','Fonte',true,now()+interval '1 day');`);
 await asUser(1);assert.deepEqual((await db.query('select id from content_posts')).rows.map(r=>r.id),['news-ok']);
 const denied=async(sql,pattern)=>{await db.exec('savepoint denied_check');await assert.rejects(db.exec(sql),pattern);await db.exec('rollback to savepoint denied_check;release savepoint denied_check');};
 await denied("insert into content_posts(id,kind,title,summary,url,source_name,published_at) values('x','news','x','','https://example.test/x','Fonte',now())",/row.level.security/);
 for(const sql of ["select acquire_content_sync('00000000-0000-0000-0000-000000000001')",'select publish_circuit_curiosity()'])await denied(sql,/permission denied/);
 await asUser(null,'anon');assert.equal((await db.query('select * from content_posts')).rows.length,0);
 await asUser(null,'postgres');
 const first='10000000-0000-0000-0000-000000000001',second='10000000-0000-0000-0000-000000000002';
 assert.equal((await db.query('select acquire_content_sync($1) as acquired',[first])).rows[0].acquired,true);
 assert.equal((await db.query('select acquire_content_sync($1) as acquired',[second])).rows[0].acquired,false);
 await db.query('select release_content_sync($1)',[second]);assert.equal((await db.query('select acquire_content_sync($1) as acquired',[second])).rows[0].acquired,false);
 await db.query('select release_content_sync($1)',[first]);assert.equal((await db.query('select acquire_content_sync($1) as acquired',[second])).rows[0].acquired,true);
 await db.query('select release_content_sync($1)',[second]);
});


test('curiosidade diária usa contagens do acervo, preserva um post por dia e não confunde temporadas com corridas',async()=>{
 await seedCircuit();await db.exec("update circuits set official_url='https://www.formula1.com/en/racing/2026/test' where id='test-circuit'");
 await db.exec('select publish_circuit_curiosity();select publish_circuit_curiosity()');
 const rows=(await db.query("select * from content_posts where kind='curiosity'")).rows;
 assert.equal(rows.length,1);assert.equal(rows[0].circuit_id,'test-circuit');assert.equal(rows[0].source_name,'Acervo Bolão F1 · dados Jolpica');assert.match(rows[0].summary,/4 corridas do Mundial em 3 temporadas/);
});

test('sessões opcionais preservam corrida antiga e recusam sprint sem programação',async()=>{
 await db.exec(`update races set quali_utc=now()-interval '1 hour' where id='${raceC}'`);await asUser(4);
 const legacy=(await db.query("select id,session,question_is_open(id) as open from questions where pool_id=$1 and kind='podium'",[poolC])).rows[0];assert.equal(legacy.session,'race');assert.equal(legacy.open,true);
 const q=(await db.query("insert into questions(pool_id,race_id,kind,prompt,session) values($1,$2,'driver','Qualy opcional','qualifying') returning id",[poolC,raceC])).rows[0];assert.equal((await db.query('select question_is_open($1) as open',[q.id])).rows[0].open,false);
 await db.exec('savepoint rejected_session');await assert.rejects(db.query("insert into questions(pool_id,race_id,kind,prompt,session) values($1,$2,'driver','Sprint sem horário','sprint')",[poolC,raceC]),/programação/);await db.exec('rollback to savepoint rejected_session;release savepoint rejected_session');
 await db.exec('savepoint rejected_pick');await assert.rejects(db.query('insert into predictions(question_id,user_id,answer) values($1,$2,$3)',[q.id,uid(4),{driver:'AAA'}]),/row.level.security/);await db.exec('rollback to savepoint rejected_pick;release savepoint rejected_pick');
});
test('histórico de apuração usa autor real, não aceita escrita do membro e respeita bolão',async()=>{
 await asUser(1);const q=(await db.query("insert into questions(pool_id,race_id,kind,prompt) values($1,$2,'driver','Piloto de teste') returning id",[poolA,raceA])).rows[0];
 await db.query('insert into results(question_id,answer,set_by) values($1,$2,$3)',[q.id,{driver:'VER'},uid(2)]);await db.query('update results set answer=$1 where question_id=$2',[{driver:'NOR'},q.id]);
 const events=(await db.query('select * from result_history where question_id=$1',[q.id])).rows;assert.equal(events.length,2);assert(events.every(e=>e.actor_id===uid(1)));assert(events.some(e=>e.previous_answer?.driver==='VER'&&e.answer.driver==='NOR'));
 await asUser(2);assert.equal((await db.query('select * from result_history where question_id=$1',[q.id])).rows.length,2);
 await db.exec('savepoint denied_audit');await assert.rejects(db.query('delete from result_history where question_id=$1 returning id',[q.id]).then(r=>{if(r.rows.length===0)throw Error('row level security');}),/row.level.security|permission denied/);await db.exec('rollback to savepoint denied_audit;release savepoint denied_audit');
 await asUser(5);assert.equal((await db.query('select * from result_history')).rows.length,0);
});
test('análise do bolão não abre dados para não membros ou anônimos',async()=>{await asUser(1);assert((await db.query('select pool_analysis($1) as data',[poolA])).rows[0].data.questions.length>0);await asUser(5);assert.equal((await db.query('select pool_analysis($1) as data',[poolA])).rows[0].data,null);await asUser(null,'anon');await assert.rejects(db.query('select pool_analysis($1)',[poolA]),/permission denied/);});
test('upsert de resultado gera um único evento real e salvar sem mudança não duplica auditoria',async()=>{await asUser(1);const q=(await db.query("insert into questions(pool_id,race_id,kind,prompt) values($1,$2,'driver','Audit upsert') returning id",[poolA,raceA])).rows[0];for(const code of ['VER','NOR','NOR'])await db.query('insert into results(question_id,answer) values($1,$2) on conflict(question_id) do update set answer=excluded.answer',[q.id,{driver:code}]);const rows=(await db.query('select * from result_history where question_id=$1',[q.id])).rows;assert.equal(rows.length,2);assert.equal(rows.filter(r=>r.previous_answer===null).length,1);assert(rows.some(r=>r.previous_answer?.driver==='VER'&&r.answer.driver==='NOR'));});

test('perfil privado agrega somente os próprios bolões, preserva ranking global e filtros disponíveis',async()=>{
 await asUser(1);const data=(await db.query('select my_profile_overview() as value')).rows[0].value;
 assert.equal(data.profile.id,uid(1));assert.equal(data.global.total,12);assert.equal(data.global.rank,1);
 assert.deepEqual(data.pools.map(p=>p.id).sort(),[poolA,poolB].sort());assert.equal(data.pools.reduce((n,p)=>n+p.earned_points,0),12);
 assert.equal(data.pools.reduce((n,p)=>n+p.max_points,0),18);assert.equal(data.pools.reduce((n,p)=>n+p.exact_podiums,0),1);
 await asUser(5);const empty=(await db.query('select my_profile_overview() as value')).rows[0].value;assert.equal(empty.profile.id,uid(5));assert.deepEqual(empty.pools,[]);assert.equal(empty.global,null);
 await asUser(null);assert.equal((await db.query('select my_profile_overview() as value')).rows[0].value,null);
 await asUser(null,'anon');await assert.rejects(db.query('select my_profile_overview()'),/permission denied/);
});
test('perfil só concede vitórias após finalizar, compartilha empates e remove bolões excluídos',async()=>{
 await asUser(null,'postgres');await db.query("update results set answer=$1 where question_id in(select id from questions where pool_id=$2)",[swapped,poolA]);
 await asUser(1);let data=(await db.query('select my_profile_overview() as value')).rows[0].value;assert.equal(data.pools.find(p=>p.id===poolA).rank,2);
 await asUser(null,'postgres');await db.query("update predictions set answer=$1 where question_id in(select id from questions where pool_id=$2)",[podium,poolA]);await db.query("update results set answer=$1 where question_id in(select id from questions where pool_id=$2)",[podium,poolA]);
 await asUser(1);data=(await db.query('select my_profile_overview() as value')).rows[0].value;assert.equal(data.pools.find(p=>p.id===poolA).rank,1);assert.equal(data.pools.find(p=>p.id===poolA).status,'finished');
 await asUser(4);data=(await db.query('select my_profile_overview() as value')).rows[0].value;assert.equal(data.pools[0].rank,1);assert.equal(data.pools[0].status,'ongoing');
 await asUser(1);await db.query('delete from pools where id=$1',[poolA]);data=(await db.query('select my_profile_overview() as value')).rows[0].value;assert.deepEqual(data.pools.map(p=>p.id),[poolB]);assert.equal(data.global.total,3);
});
test('participação considera prazo da sessão, ingresso e resposta completa; apuração parcial não vira pódio exato',async()=>{
 await asUser(null,'postgres');await db.query("update pool_members set joined_at='2020-01-01' where pool_id=$1 and user_id=$2",[poolC,uid(4)]);await db.query("update races set quali_utc=now()-interval '1 hour' where id=$1",[raceC]);
 const q=(await db.query("insert into questions(pool_id,race_id,kind,prompt,session,created_at) values($1,$2,'driver','Qualy','qualifying',now()-interval '2 hours') returning id",[poolC,raceC])).rows[0];
 await db.query('insert into predictions(question_id,user_id,answer) values($1,$2,$3)',[q.id,uid(4),{driver:'VER'}]);
 await db.query("update results set answer=$1 where question_id in(select id from questions where pool_id=$2)",[{p1:'VER'},poolA]);
 await asUser(4);let entry=(await db.query('select my_profile_overview() as value')).rows[0].value.pools[0];assert.equal(entry.eligible_questions,1);assert.equal(entry.answered_questions,1);assert.equal(entry.status,'ongoing');
 await asUser(null,'postgres');await db.query('update predictions set answer=$1 where question_id=$2',[{},q.id]);await asUser(4);entry=(await db.query('select my_profile_overview() as value')).rows[0].value.pools[0];assert.equal(entry.answered_questions,0);
 await asUser(1);entry=(await db.query('select my_profile_overview() as value')).rows[0].value.pools.find(p=>p.id===poolA);assert.equal(entry.max_points,3);assert.equal(entry.exact_podiums,0);assert.equal(entry.status,'ongoing');
});

async function seedFollowData(){
 await asUser(null,'postgres');
 await db.query(`insert into drivers(series,season,code,name,driver_id,team,team_color) values
  ('f1',2026,'VER','Max Verstappen','max_verstappen','Red Bull','#3671C6'),('f1',2026,'LAW','Liam Lawson','lawson','Racing Bulls','#6692FF'),
  ('f1',2015,'RAI','Kimi Räikkönen','raikkonen','Ferrari','#E80020'),('f1',2025,'GRO','Romain Grosjean','grosjean','Lotus','#FFB800'),
  ('f2',2026,'BOR','Piloto F2','f2_x','Red Bull','#000')`);
 await db.query(`insert into race_results(series,session,season,round,position,driver_code,team,grid,points,status) values
  ('f1','race',2026,1,1,'VER','Red Bull',3,25,'Finished'),('f1','race',2026,1,2,'LAW','Racing Bulls',8,18,'Finished'),
  ('f1','race',2025,1,4,'GRO','Lotus',2,12,'Finished')`);
 await db.query(`insert into driver_standings(series,season,position,driver_code,team,points,wins) values('f1',2026,1,'VER','Red Bull',25,1)`);
 await db.query(`insert into constructor_standings(series,season,position,team,points,wins) values('f1',2026,1,'Red Bull',25,1),('f1',2026,2,'Racing Bulls',18,0)`);
 await db.query(`insert into circuits(id,name,locality,country,official_url,published) values('interlagos','Interlagos','São Paulo','Brazil','https://example.test',true),('oculta','Oculta','X','Y','https://example.test',false)`);
 await db.query(`update races set circuit_id='interlagos' where id=$1`,[raceC]);
}
test('equipes recebem constructor_id estável da fonte ou do nome atual, somente na F1',async()=>{
 await seedFollowData();
 const ids=Object.fromEntries((await db.query("select series||':'||code k,constructor_id from drivers")).rows.map(r=>[r.k,r.constructor_id]));
 assert.equal(ids['f1:VER'],'red_bull');assert.equal(ids['f1:LAW'],'rb');assert.equal(ids['f1:GRO'],'lotus_f1');assert.equal(ids['f2:BOR'],null);
 await db.query("insert into drivers(series,season,code,name,driver_id,team,constructor_id) values('f1',2026,'NEW','Novo','novo','Nome Novo','fonte_x')");
 assert.equal((await db.query("select constructor_id from drivers where code='NEW'")).rows[0].constructor_id,'fonte_x');
 await db.query("update drivers set team='Ferrari' where code='LAW' and season=2026");
 assert.equal((await db.query("select constructor_id from drivers where code='LAW'")).rows[0].constructor_id,'ferrari');
 assert.equal((await db.query("select constructor_id from race_results where driver_code='GRO'")).rows[0].constructor_id,'lotus_f1');
 assert.equal((await db.query("select team_constructor_id('Brabham-Alfa Romeo') v")).rows[0].v,'brabham-alfa_romeo');
});
async function rejectsInTx(sql,params,re){if(re===undefined){re=params;params=[];}await db.exec('savepoint expected_error');await assert.rejects(db.query(sql,params),re);await db.exec('rollback to savepoint expected_error');}
test('acompanhamentos são privados, únicos, validados e resumem último GP, campeonato e carreira encerrada',async()=>{
 await seedFollowData();
 await asUser(1);
 for(const [kind,id] of [['driver','max_verstappen'],['driver','grosjean'],['team','red_bull'],['circuit','interlagos']])await db.query('insert into follows(kind,entity_id) values($1,$2)',[kind,id]);
 await rejectsInTx("insert into follows(kind,entity_id) values('driver','max_verstappen')",/duplicate key/);
 await rejectsInTx("insert into follows(kind,entity_id) values('driver','f2_x')",/não encontrado/);
 await rejectsInTx("insert into follows(kind,entity_id) values('circuit','oculta')",/não encontrado/);
 await rejectsInTx("insert into follows(kind,entity_id) values('team','Red Bull')",/não encontrado/);
 const data=(await db.query('select my_follows_overview() v')).rows[0].v;
 assert.equal(data.season,2026);assert.equal(data.next_race.id,raceC);
 const ver=data.drivers.find(d=>d.driver_id==='max_verstappen');assert.equal(ver.active,true);assert.equal(ver.last_race.position,1);assert.equal(ver.last_race.grid,3);assert.equal(ver.standing.position,1);
 const gro=data.drivers.find(d=>d.driver_id==='grosjean');assert.equal(gro.active,false);assert.equal(gro.last_race.season,2025);
 assert.equal(data.teams[0].team,'Red Bull');assert.equal(data.teams[0].standing.position,1);assert.deepEqual(data.teams[0].last_race.drivers.map(d=>d.code),['VER']);
 assert.equal(data.circuits[0].next_race.race_id,raceC);
 await asUser(2);assert.deepEqual((await db.query('select * from follows')).rows,[]);
 const other=(await db.query('select my_follows_overview() v')).rows[0].v;assert.deepEqual([other.drivers,other.teams,other.circuits],[[],[],[]]);
 await rejectsInTx("insert into follows(user_id,kind,entity_id) values($1,'driver','max_verstappen')",[uid(1)],/row-level security/);
 assert.equal((await db.query("delete from follows where user_id=$1 returning *",[uid(1)])).rows.length,0);
 await asUser(1);await db.query("delete from follows where kind='driver' and entity_id='max_verstappen'");
 assert.equal((await db.query('select my_follows_overview() v')).rows[0].v.drivers.length,1);
 assert.equal((await db.query("select count(*)::int n from drivers where driver_id='max_verstappen'")).rows[0].n,1);
 await asUser(null);assert.equal((await db.query('select my_follows_overview() v')).rows[0].v,null);
 await asUser(null,'anon');await rejectsInTx('select my_follows_overview()',/permission denied/);
});
test('último GP resume pontos e posições somente nos bolões do chamador e separa apuração pendente',async()=>{
 await asUser(null,'postgres');await db.query(`insert into race_results(series,session,season,round,position,driver_code,team) values('f1','race',2026,1,1,'VER','Red Bull')`);
 await asUser(1);let v=(await db.query('select my_last_gp_summary() v')).rows[0].v;
 assert.equal(v.race.id,raceA);assert.equal(v.next_race.id,raceC);assert.deepEqual(v.pools.map(p=>p.id),[poolA]);
 const a=v.pools[0];assert.equal(a.rank_before,1);assert.equal(a.rank_after,1);assert.equal(a.members,2);assert.equal(a.status,'settled');assert(a.points>0);
 await asUser(2);v=(await db.query('select my_last_gp_summary() v')).rows[0].v;assert.equal(v.pools[0].rank_after,2);assert.equal(v.pools[0].rank_before,1);
 await asUser(1);await db.query("insert into questions(pool_id,race_id,kind,prompt) values($1,$2,'driver','Extra')",[poolA,raceA]);
 assert.equal((await db.query('select my_last_gp_summary() v')).rows[0].v.pools[0].status,'partial');
 await asUser(5);assert.deepEqual((await db.query('select my_last_gp_summary() v')).rows[0].v.pools,[]);
 await asUser(null);assert.equal((await db.query('select my_last_gp_summary() v')).rows[0].v,null);
 await asUser(null,'anon');await rejectsInTx('select my_last_gp_summary()',/permission denied/);
});
test('mapa do piloto agrupa pódios por pista publicada com as provas que sustentam a contagem',async()=>{
 await seedFollowData();await asUser(null,'postgres');await db.query("update races set circuit_id='interlagos' where id=$1",[raceA]);
 await asUser(1);const rows=(await db.query("select driver_circuit_map('max_verstappen') v")).rows[0].v;
 assert.equal(rows.length,1);assert.equal(rows[0].id,'interlagos');assert.equal(rows[0].wins,1);assert.deepEqual(rows[0].results.map(r=>r.season),[2026]);
 assert.deepEqual((await db.query("select driver_circuit_map('lawson') v")).rows[0].v.map(r=>[r.wins,r.podiums]),[[0,1]]);
 await asUser(null,'anon');await rejectsInTx("select driver_circuit_map('max_verstappen')",/permission denied/);
});
test('raio-x da pista usa só provas anteriores ao GP e o grid da temporada',async()=>{
 await seedFollowData();await asUser(null,'postgres');
 await db.query("update races set circuit_id='interlagos' where id in ($1,$2,$3)",[raceA,raceB,raceC]);
 await db.query(`insert into drivers(series,season,code,name,driver_id,team) values('f1',2025,'VER','Max Verstappen','max_verstappen','Red Bull')`);
 await db.query(`insert into race_results(series,session,season,round,position,driver_code,team,grid,points,status) values('f1','race',2025,1,1,'VER','Red Bull',12,25,'Finished')`);
 await asUser(1);const v=(await db.query('select circuit_race_insight($1) v',[raceA])).rows[0].v;
 assert.equal(v.circuit_id,'interlagos');assert.equal(v.editions,1);assert.equal(v.from_outside10,1);assert.equal(v.deepest_win.grid,12);
 const ver=v.drivers.find(d=>d.driver_id==='max_verstappen');assert.equal(ver.starts,1);assert.equal(ver.wins,1);assert.equal(v.drivers.find(d=>d.driver_id==='lawson').starts,0);
 const later=(await db.query('select circuit_race_insight($1) v',[raceC])).rows[0].v;assert.equal(later.editions,2);
 await asUser(null,'anon');await rejectsInTx('select circuit_race_insight($1)',[raceA],/permission denied/);
});
test('carreira por equipe separa passagens e sequências contam largadas consecutivas',async()=>{
 await asUser(null,'postgres');
 const ids=[];for(let i=1;i<=5;i++){ids.push((await db.query("insert into races(season,round,name,date_utc) values(2030,$1,$2,$3) returning id",[i,`R${i}`,`2030-0${i}-01`])).rows[0].id);}
 const teams=['A','A','B','A','A'],pos=[1,2,1,1,9],pts=[25,18,25,25,2];
 await db.query("insert into drivers(series,season,code,name,driver_id,team,team_color) values('f1',2030,'TST','Teste','teste','A','#111')");
 for(let i=0;i<5;i++)await db.query("insert into race_results(series,session,season,round,position,driver_code,team,points,status) values('f1','race',2030,$1,$2,'TST',$3,$4,'Finished')",[i+1,pos[i],teams[i],pts[i]]);
 await asUser(1);const v=(await db.query("select driver_career_shape('teste') v")).rows[0].v;
 assert.deepEqual(v.stints.map(s=>[s.team,s.races]),[['A',2],['B',1],['A',2]]);
 assert.equal(v.streaks.wins.best,2);assert.equal(v.streaks.podiums.best,4);assert.equal(v.streaks.points.best,5);
 await asUser(null,'anon');await rejectsInTx("select driver_career_shape('teste')",/permission denied/);
});
test('vencedores em comum entre pistas combinam acervo e resultados importados',async()=>{
 await seedFollowData();await asUser(null,'postgres');
 await db.query("insert into circuits(id,name,locality,country,official_url,published) values('spa','Spa','Stavelot','Belgium','https://example.test',true)");
 await db.query("insert into circuit_race_winners(circuit_id,season,round,race_name,date_utc,driver_id,driver_name) values('spa',2020,7,'GP Bélgica','2020-08-30','max_verstappen','Max Verstappen'),('spa',2021,12,'GP Bélgica','2021-08-29','hamilton','Lewis Hamilton'),('interlagos',2019,20,'GP Brasil','2019-11-17','max_verstappen','Max Verstappen')");
 await db.query("update races set circuit_id='interlagos' where id=$1",[raceA]);
 await asUser(1);const v=(await db.query("select circuit_winners_overlap('interlagos','spa') v")).rows[0].v;
 assert.deepEqual(v.common.map(c=>[c.driver_id,c.a,c.b]),[['max_verstappen',2,1]]);assert.equal(v.only_a,0);assert.equal(v.only_b,1);
 assert.equal((await db.query("select circuit_winners_overlap('interlagos','oculta') v")).rows[0].v,null);
});
test('rivalidade por pista conta GPs em comum em equipes diferentes',async()=>{
 await seedFollowData();await asUser(null,'postgres');await db.query("update races set circuit_id='interlagos' where id=$1",[raceA]);
 await asUser(1);const v=(await db.query("select driver_rivalry_circuits('max_verstappen','lawson') v")).rows[0].v;
 assert.equal(v.races,1);assert.equal(v.a,1);assert.deepEqual(v.circuits.map(c=>[c.circuit_id,c.a,c.b]),[['interlagos',1,0]]);
 assert.equal((await db.query("select driver_rivalry_circuits('lawson','lawson') v")).rows[0].v.races,0);
});
test('feitos guiados filtram época e calculam primeira vitória por largada',async()=>{
 await asUser(null,'postgres');
 for(let i=1;i<=3;i++)await db.query("insert into races(season,round,name,date_utc) values(2031,$1,$2,$3)",[i,`R${i}`,`2031-0${i}-01`]);
 await db.query("insert into drivers(series,season,code,name,driver_id,team) values('f1',2031,'AAA','Piloto A','pa','X'),('f1',2031,'BBB','Piloto B','pb','X')");
 const rows=[[1,1,'AAA',12,25],[1,2,'BBB',1,18],[2,1,'BBB',1,25],[2,2,'AAA',3,18],[3,1,'AAA',2,25],[3,15,'BBB',1,0]];
 for(const [r,p,c,g,pt] of rows)await db.query("insert into race_results(series,session,season,round,position,driver_code,team,grid,points,status) values('f1','race',2031,$1,$2,$3,'X',$4,$5,'Finished')",[r,p,c,g,pt]);
 await asUser(1);const q=async(k,a=2031,b=2031)=>(await db.query('select history_feats($1,$2,$3) v',[k,a,b])).rows[0].v;
 assert.deepEqual((await q('win_from_back')).rows.map(r=>[r.driver_id,r.grid]),[['pa',12]]);
 assert.deepEqual((await q('pole_no_points')).rows.map(r=>r.round),[3]);
 assert.deepEqual((await q('first_win')).rows.map(r=>[r.driver_id,r.extra]).sort(),[['pa',1],['pb',2]]);
 assert.deepEqual((await q('win_on_debut')).rows.map(r=>r.driver_id),['pa']);
 assert.equal((await q('one_two')).total,2);assert.equal((await q('one_two',2032,2040)).total,0);
 assert.equal((await db.query("select history_feats('x') v")).rows[0].v,null);
});
test('temporada em uma tela só declara campeão com temporada encerrada',async()=>{
 await seedFollowData();await asUser(null,'postgres');await db.query("update races set circuit_id='interlagos' where id=$1",[raceA]);
 await asUser(1);let v=(await db.query('select season_overview(2026) v')).rows[0].v;
 assert.equal(v.finished,false);assert.equal(v.driver_champion,null);assert.equal(v.leader.driver_id,'max_verstappen');
 assert.deepEqual(v.winners.map(w=>[w.driver_id,w.wins]),[['max_verstappen',1]]);assert.equal(v.stops.find(s=>s.round===1).circuit_id,'interlagos');assert.equal(v.stops.find(s=>s.round===1).winner,'Max Verstappen');
 await asUser(null,'postgres');await db.query("update races set date_utc='2026-03-02' where id=$1",[raceC]);await asUser(1);
 v=(await db.query('select season_overview(2026) v')).rows[0].v;assert.equal(v.finished,true);assert.equal(v.driver_champion.driver_id,'max_verstappen');assert.equal(v.constructor_champion.team,'Red Bull');
});
test('primeiras N largadas ignoram desistências antes da largada',async()=>{
 await asUser(null,'postgres');
 for(let i=1;i<=3;i++)await db.query("insert into races(season,round,name,date_utc) values(2032,$1,$2,$3)",[i,`R${i}`,`2032-0${i}-01`]);
 await db.query("insert into drivers(series,season,code,name,driver_id,team) values('f1',2032,'CCC','C','pc','X'),('f1',2032,'DDD','D','pd','Y')");
 for(const [r,p,c,st,pt] of [[1,1,'CCC','Withdrew',0],[2,1,'CCC','Finished',25],[3,2,'CCC','Finished',18],[1,2,'DDD','Finished',18],[2,2,'DDD','Finished',18],[3,1,'DDD','Finished',25]])
  await db.query("insert into race_results(series,session,season,round,position,driver_code,team,grid,points,status) values('f1','race',2032,$1,$2,$3,'X',1,$4,$5)",[r,p,c,pt,st]);
 await asUser(1);const v=(await db.query("select driver_first_starts('pc','pd',2) v")).rows[0].v;
 assert.deepEqual([v.pc.starts,v.pc.wins,Number(v.pc.points)],[2,1,43]);assert.deepEqual([v.pd.starts,v.pd.wins],[2,0]);
});
test('neste dia encontra GPs passados pela data em Brasília',async()=>{
 await seedFollowData();await asUser(1);
 const v=(await db.query('select f1_on_this_day(3,2) v')).rows[0].v;
 assert.deepEqual(v.map(x=>[x.id,x.dist,x.winner.driver_id]),[[raceA,1,'max_verstappen']]);
 assert.deepEqual((await db.query('select f1_on_this_day(7,1) v')).rows[0].v,[]);
});
test('recordes até a temporada ignoram anos posteriores',async()=>{
 await seedFollowData();await asUser(1);
 const v=(await db.query('select records_until(2025) v')).rows[0].v;
 assert.deepEqual(v.starts.map(x=>x.driver_id),['grosjean']);assert.equal(v.wins,undefined);
 const w=(await db.query('select records_until(2026) v')).rows[0].v;assert.equal(w.wins[0].driver_id,'max_verstappen');
});
