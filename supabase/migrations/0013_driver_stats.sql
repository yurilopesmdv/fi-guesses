-- Estatísticas de piloto (F1) calculadas no banco

create index if not exists race_results_series_season_code_idx on public.race_results (series, season, driver_code);

-- Resultados de um piloto com identidade estável (junta pelo driver_id da temporada)
create or replace view public.driver_results with (security_invoker = true) as
select d.driver_id, rr.season, rr.round, r.name as race_name, r.country, r.date_utc, rr.position, rr.grid, rr.points, rr.status, rr.fastest_lap, rr.team,
       (rr.status = 'Finished' or rr.status like '+%') as classified
from race_results rr
join drivers d on d.series = rr.series and d.season = rr.season and d.code = rr.driver_code
join races r on r.series = rr.series and r.season = rr.season and r.round = rr.round
where rr.series = 'f1' and rr.session = 'race';

-- Temporada encerrada = não há corrida futura
create or replace function public.season_finished(p_season int) returns boolean
language sql stable as $$ select not exists (select 1 from races where series = 'f1' and season = p_season and date_utc > now()) $$;

-- Totais de carreira de todos os pilotos (base pros rankings históricos)
create or replace view public.driver_career_totals with (security_invoker = true) as
with res as (
  select driver_id,
         count(*) as races,
         count(*) filter (where position = 1) as wins,
         count(*) filter (where position <= 3) as podiums,
         count(*) filter (where grid = 1) as poles,
         count(*) filter (where fastest_lap) as fastest_laps,
         count(*) filter (where not classified) as dnfs,
         sum(points) as points,
         min(position) as best_finish,
         round(avg(position) filter (where classified), 2) as avg_finish
  from driver_results group by driver_id
),
titles as (
  select d.driver_id, count(*) as titles
  from driver_standings ds join drivers d on d.series = ds.series and d.season = ds.season and d.code = ds.driver_code
  where ds.series = 'f1' and ds.position = 1 and season_finished(ds.season)
  group by d.driver_id
),
span as (select driver_id, min(season) first_season, max(season) last_season, count(distinct season) seasons from drivers where series = 'f1' group by driver_id)
select s.driver_id, s.first_season, s.last_season, s.seasons,
       coalesce(r.races,0) races, coalesce(r.wins,0) wins, coalesce(r.podiums,0) podiums, coalesce(r.poles,0) poles, coalesce(r.fastest_laps,0) fastest_laps,
       coalesce(r.dnfs,0) dnfs, coalesce(r.points,0) points, r.best_finish, r.avg_finish, coalesce(t.titles,0) titles
from span s left join res r using (driver_id) left join titles t using (driver_id);

-- Perfil completo (identidade, carreira, rankings históricos, temporada a temporada)
create or replace function public.driver_profile(p_driver_id text) returns jsonb
language sql stable security invoker as $$
with latest as (
  select * from drivers where series = 'f1' and driver_id = p_driver_id order by season desc limit 1
),
tot as (select * from driver_career_totals where driver_id = p_driver_id),
ranks as (
  select driver_id,
         rank() over (order by wins desc) wins_rank, rank() over (order by podiums desc) podiums_rank,
         rank() over (order by titles desc) titles_rank, rank() over (order by points desc) points_rank,
         rank() over (order by poles desc) poles_rank, rank() over (order by races desc) races_rank,
         count(*) over () total_drivers
  from driver_career_totals
),
seasons as (
  select dr.season, max(dr.team) team,
         ds.position, ds.points as champ_points,
         count(*) races, count(*) filter (where dr.position = 1) wins, count(*) filter (where dr.position <= 3) podiums,
         count(*) filter (where dr.grid = 1) poles, count(*) filter (where dr.fastest_lap) fastest_laps,
         count(*) filter (where not dr.classified) dnfs, min(dr.position) best,
         round(avg(dr.position) filter (where dr.classified), 1) avg_finish,
         round(avg(dr.grid) filter (where dr.grid > 0), 1) avg_grid,
         (ds.position = 1 and season_finished(dr.season)) as champion
  from driver_results dr
  left join drivers d on d.series = 'f1' and d.season = dr.season and d.driver_id = dr.driver_id
  left join driver_standings ds on ds.series = 'f1' and ds.season = dr.season and ds.driver_code = d.code
  where dr.driver_id = p_driver_id
  group by dr.season, ds.position, ds.points
  order by dr.season
),
teams as (select string_agg(distinct team, ', ') teams from drivers where series = 'f1' and driver_id = p_driver_id and team is not null)
select jsonb_build_object(
  'driver', (select jsonb_build_object('driver_id', driver_id, 'name', name, 'code', code, 'number', number, 'team', team, 'team_color', team_color, 'season', season) from latest),
  'career', (select to_jsonb(t) - 'driver_id' from tot t),
  'ranks', (select to_jsonb(r) - 'driver_id' from ranks r where r.driver_id = p_driver_id),
  'teams', (select teams from teams),
  'seasons', (select coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb) from seasons s)
) $$;

-- Corrida a corrida de uma temporada
create or replace function public.driver_season_races(p_driver_id text, p_season int)
returns table (round int, race_name text, country text, date_utc timestamptz, grid int, finish int, points numeric, status text, fastest_lap boolean, classified boolean, team text)
language sql stable security invoker as $$
  select round, race_name, country, date_utc, grid, position, points, status, fastest_lap, classified, team
  from driver_results where driver_id = p_driver_id and season = p_season order by round
$$;

-- Busca de pilotos (pra comparação)
create or replace function public.driver_search(p_q text)
returns table (driver_id text, name text, first_season int, last_season int, wins bigint, titles bigint, team text, team_color text)
language sql stable security invoker as $$
  select t.driver_id, l.name, t.first_season, t.last_season, t.wins, t.titles, l.team, l.team_color
  from driver_career_totals t
  join lateral (select name, team, team_color from drivers d where d.series = 'f1' and d.driver_id = t.driver_id order by season desc limit 1) l on true
  where p_q = '' or l.name ilike '%' || p_q || '%'
  order by (p_q = '') desc, t.wins desc, t.last_season desc
  limit 25
$$;

-- Confronto direto quando foram companheiros de equipe (mesma equipe na mesma corrida)
create or replace function public.driver_head_to_head(p_a text, p_b text)
returns table (season int, team text, races bigint, a_ahead bigint, b_ahead bigint, a_points numeric, b_points numeric)
language sql stable security invoker as $$
  select a.season, a.team, count(*),
         count(*) filter (where a.position < b.position), count(*) filter (where b.position < a.position),
         sum(a.points), sum(b.points)
  from driver_results a
  join driver_results b on b.season = a.season and b.round = a.round and b.team = a.team and b.driver_id = p_b
  where a.driver_id = p_a
  group by a.season, a.team order by a.season
$$;
