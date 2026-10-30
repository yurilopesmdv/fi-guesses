-- Raio-X da pista antes de um GP: conversão do grid (H07) e histórico do grid atual nesta pista (H05).
-- Usa somente provas anteriores à data do GP; "largou em P1" é o grid, não necessariamente a pole da classificação.
create function public.circuit_race_insight(p_race uuid) returns jsonb
language sql stable security invoker set search_path = public as $$
 with target as (
  select r.id, r.season, r.date_utc, coalesce(r.circuit_id, cs.circuit_id) as circuit_id
  from races r left join circuit_seasons cs on cs.season = r.season and cs.round = r.round
  where r.id = p_race and r.series = 'f1'
 ), editions as (
  select r.season, r.round from races r cross join target t
  left join circuit_seasons cs on cs.season = r.season and cs.round = r.round
  where r.series = 'f1' and r.date_utc < t.date_utc and coalesce(r.circuit_id, cs.circuit_id) = t.circuit_id
 ), res as (
  select dr.* from driver_results dr join editions e on e.season = dr.season and e.round = dr.round
 ), winners as (select * from res where position = 1),
 recent as (select * from winners order by season desc, round desc limit 10),
 grid as (
  select distinct d.driver_id, d.name, d.code, d.team_color from drivers d cross join target t
  where d.series = 'f1' and d.season = t.season and d.driver_id is not null
    and (exists (select 1 from race_results rr where rr.series = 'f1' and rr.season = t.season and rr.driver_code = d.code)
      or not exists (select 1 from race_results rr where rr.series = 'f1' and rr.season = t.season))
 ), per_driver as (
  select g.driver_id, g.name, g.code, g.team_color, count(r.*) as starts,
   count(*) filter (where r.position = 1) as wins, count(*) filter (where r.position <= 3) as podiums,
   min(r.position) filter (where r.classified) as best,
   percentile_disc(0.5) within group (order by r.position) filter (where r.classified) as median,
   (select jsonb_build_object('season', x.season, 'position', x.position, 'classified', x.classified) from res x where x.driver_id = g.driver_id order by x.season desc, x.round desc limit 1) as last
  from grid g left join res r on r.driver_id = g.driver_id
  group by g.driver_id, g.name, g.code, g.team_color
 )
 select case when (select circuit_id from target) is null then null else jsonb_build_object(
  'circuit_id', (select circuit_id from target),
  'editions', (select count(*) from editions where exists (select 1 from winners w where w.season = editions.season and w.round = editions.round)),
  'first_season', (select min(season) from winners),
  'from_p1', (select count(*) from winners where grid = 1),
  'from_top3', (select count(*) from winners where grid between 1 and 3),
  'from_outside10', (select count(*) from winners where grid > 10),
  'deepest_win', (select jsonb_build_object('grid', grid, 'season', season, 'driver_id', driver_id) from winners where grid is not null and grid > 0 order by grid desc, season desc limit 1),
  'recent', jsonb_build_object('editions', (select count(*) from recent), 'from_p1', (select count(*) from recent where grid = 1)),
  'avg_gain', (select round(avg(grid - position), 1) from res where classified and grid > 0),
  'drivers', coalesce((select jsonb_agg(to_jsonb(p) order by p.podiums desc, p.wins desc, p.best nulls last, p.starts desc, p.name) from per_driver p), '[]')
 ) end where auth.uid() is not null;
$$;
revoke all on function public.circuit_race_insight(uuid) from public, anon;
grant execute on function public.circuit_race_insight(uuid) to authenticated;
