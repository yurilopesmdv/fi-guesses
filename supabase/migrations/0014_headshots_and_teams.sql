-- Foto oficial (OpenF1/formula1.com) — só grid atual tem
alter table public.drivers add column headshot_url text;

-- Perfil: acrescenta estatísticas por equipe e a foto
create or replace function public.driver_profile(p_driver_id text) returns jsonb
language sql stable security invoker as $$
with latest as (
  select * from drivers where series = 'f1' and driver_id = p_driver_id order by season desc limit 1
),
photo as (select headshot_url from drivers where series = 'f1' and driver_id = p_driver_id and headshot_url is not null order by season desc limit 1),
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
by_team as (
  select dr.team, min(dr.season) first_season, max(dr.season) last_season, count(distinct dr.season) seasons,
         count(*) races, count(*) filter (where dr.position = 1) wins, count(*) filter (where dr.position <= 3) podiums,
         count(*) filter (where dr.grid = 1) poles, sum(dr.points) points, count(*) filter (where not dr.classified) dnfs,
         (select team_color from drivers d where d.series = 'f1' and d.driver_id = p_driver_id and d.team = dr.team order by season desc limit 1) team_color,
         (select count(*) from driver_standings ds join drivers d on d.series = ds.series and d.season = ds.season and d.code = ds.driver_code
            where ds.series = 'f1' and ds.position = 1 and d.driver_id = p_driver_id and d.team = dr.team and season_finished(ds.season)) titles
  from driver_results dr where dr.driver_id = p_driver_id and dr.team is not null
  group by dr.team order by min(dr.season)
),
teams as (select string_agg(distinct team, ', ') teams from drivers where series = 'f1' and driver_id = p_driver_id and team is not null)
select jsonb_build_object(
  'driver', (select jsonb_build_object('driver_id', driver_id, 'name', name, 'code', code, 'number', number, 'team', team, 'team_color', team_color, 'season', season, 'headshot_url', (select headshot_url from photo)) from latest),
  'career', (select to_jsonb(t) - 'driver_id' from tot t),
  'ranks', (select to_jsonb(r) - 'driver_id' from ranks r where r.driver_id = p_driver_id),
  'teams', (select teams from teams),
  'by_team', (select coalesce(jsonb_agg(to_jsonb(b)), '[]'::jsonb) from by_team b),
  'seasons', (select coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb) from seasons s)
) $$;
