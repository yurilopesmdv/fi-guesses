-- Total de largadas (carros) por equipe: a view muda de colunas, então recria view + funções dependentes
drop view public.team_career_totals cascade;

create view public.team_career_totals with (security_invoker = true) as
with res as (
  select team,
         min(season) first_season, max(season) last_season, count(distinct season) seasons,
         count(distinct (season, round)) races,
         count(*) entries,
         count(*) filter (where position = 1) wins,
         count(*) filter (where position <= 3) podiums,
         count(*) filter (where grid = 1) poles,
         count(*) filter (where fastest_lap) fastest_laps,
         count(*) filter (where not classified) dnfs,
         sum(points) points,
         count(*) filter (where position = 1 and exists (select 1 from driver_results x where x.season = driver_results.season and x.round = driver_results.round and x.team = driver_results.team and x.position = 2)) one_twos
  from driver_results where team is not null group by team
),
ctitles as (
  select team, count(*) titles from constructor_standings where series = 'f1' and position = 1 and season_finished(season) group by team
),
dtitles as (
  select d.team, count(*) driver_titles
  from driver_standings ds join drivers d on d.series = ds.series and d.season = ds.season and d.code = ds.driver_code
  where ds.series = 'f1' and ds.position = 1 and season_finished(ds.season) and d.team is not null group by d.team
)
select r.*, coalesce(c.titles, 0) titles, coalesce(t.driver_titles, 0) driver_titles
from res r left join ctitles c using (team) left join dtitles t using (team);

create or replace function public.team_profile(p_team text) returns jsonb
language sql stable security invoker as $$
with tot as (select * from team_career_totals where team = p_team),
color as (select team_color from drivers where series = 'f1' and team = p_team and team_color is not null order by season desc limit 1),
ranks as (
  select team,
         rank() over (order by wins desc) wins_rank, rank() over (order by podiums desc) podiums_rank,
         rank() over (order by titles desc) titles_rank, rank() over (order by points desc) points_rank,
         rank() over (order by poles desc) poles_rank, rank() over (order by races desc) races_rank,
         count(*) over () total_teams
  from team_career_totals
),
seasons as (
  select dr.season, cs.position, cs.points champ_points,
         count(distinct dr.round) races, count(*) filter (where dr.position = 1) wins, count(*) filter (where dr.position <= 3) podiums,
         count(*) filter (where dr.grid = 1) poles, count(*) filter (where not dr.classified) dnfs,
         (cs.position = 1 and season_finished(dr.season)) champion,
         (select string_agg(distinct d.name, ', ') from drivers d where d.series = 'f1' and d.season = dr.season and d.team = p_team) drivers
  from driver_results dr
  left join constructor_standings cs on cs.series = 'f1' and cs.season = dr.season and cs.team = p_team
  where dr.team = p_team
  group by dr.season, cs.position, cs.points order by dr.season
),
best as (
  select dr.driver_id, max(d.name) name, min(dr.season) first_season, max(dr.season) last_season,
         count(*) races, count(*) filter (where dr.position = 1) wins, count(*) filter (where dr.position <= 3) podiums,
         count(*) filter (where dr.grid = 1) poles, sum(dr.points) points,
         (select count(*) from driver_standings ds join drivers x on x.series = ds.series and x.season = ds.season and x.code = ds.driver_code
            where ds.series = 'f1' and ds.position = 1 and x.driver_id = dr.driver_id and x.team = p_team and season_finished(ds.season)) titles,
         (select headshot_url from drivers x where x.series = 'f1' and x.driver_id = dr.driver_id and x.headshot_url is not null order by season desc limit 1) headshot_url
  from driver_results dr join drivers d on d.series = 'f1' and d.season = dr.season and d.driver_id = dr.driver_id
  where dr.team = p_team
  group by dr.driver_id
  order by wins desc, podiums desc, points desc limit 12
),
current_drivers as (
  select jsonb_agg(jsonb_build_object('driver_id', driver_id, 'name', name, 'code', code, 'number', number, 'headshot_url', headshot_url) order by name)
  from drivers where series = 'f1' and team = p_team and season = (select last_season from tot)
)
select jsonb_build_object(
  'team', jsonb_build_object('name', p_team, 'color', (select team_color from color), 'drivers', (select * from current_drivers)),
  'career', (select to_jsonb(t) - 'team' from tot t),
  'ranks', (select to_jsonb(r) - 'team' from ranks r where r.team = p_team),
  'seasons', (select coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb) from seasons s),
  'best_drivers', (select coalesce(jsonb_agg(to_jsonb(b)), '[]'::jsonb) from best b)
) $$;

create or replace function public.team_search(p_q text)
returns table (team text, first_season int, last_season int, wins bigint, titles bigint, team_color text)
language sql stable security invoker as $$
  select t.team, t.first_season, t.last_season, t.wins, t.titles,
         (select team_color from drivers d where d.series = 'f1' and d.team = t.team and d.team_color is not null order by season desc limit 1)
  from team_career_totals t
  where p_q = '' or t.team ilike '%' || p_q || '%'
  order by (p_q = '') desc, t.wins desc, t.last_season desc
  limit 25
$$;

