-- Temporada em uma tela (H22/H08): campeões (só com temporada encerrada), vencedores, equipes e etapas no mapa.
create function public.season_overview(p_season int) returns jsonb
language sql stable security invoker set search_path = public as $$
 with rr as (
  select r.id as race_id, r.round, r.name, r.country, r.date_utc, coalesce(r.circuit_id, cs.circuit_id) as circuit_id
  from races r left join circuit_seasons cs on cs.season = r.season and cs.round = r.round
  where r.series = 'f1' and r.season = p_season
 ), win as (
  select dr.round, dr.driver_id, dr.team, dr.grid from driver_results dr where dr.season = p_season and dr.position = 1
 ), dname as (
  select driver_id, name, team_color from drivers where series = 'f1' and season = p_season and driver_id is not null
 )
 select jsonb_build_object(
  'season', p_season, 'finished', season_finished(p_season),
  'races', (select count(*) from rr), 'completed', (select count(distinct round) from win),
  'driver_champion', case when season_finished(p_season) then (select jsonb_build_object('driver_id', d.driver_id, 'name', d.name, 'team', s.team, 'points', s.points, 'wins', s.wins)
    from driver_standings s join drivers d on d.series = s.series and d.season = s.season and d.code = s.driver_code where s.series = 'f1' and s.season = p_season and s.position = 1 limit 1) end,
  'constructor_champion', case when season_finished(p_season) then (select jsonb_build_object('team', team, 'points', points, 'wins', wins, 'color', team_color)
    from constructor_standings where series = 'f1' and season = p_season and position = 1 limit 1) end,
  'leader', (select jsonb_build_object('driver_id', d.driver_id, 'name', d.name, 'points', s.points)
    from driver_standings s join drivers d on d.series = s.series and d.season = s.season and d.code = s.driver_code where s.series = 'f1' and s.season = p_season and s.position = 1 limit 1),
  'winners', coalesce((select jsonb_agg(x order by x.wins desc, x.name) from (
    select w.driver_id, max(n.name) as name, max(n.team_color) as team_color, count(*) as wins from win w left join dname n on n.driver_id = w.driver_id group by w.driver_id) x), '[]'),
  'teams', coalesce((select jsonb_agg(x order by x.wins desc, x.team) from (select team, count(*) as wins from win where team is not null group by team) x), '[]'),
  'from_p1', (select count(*) from win where grid = 1),
  'stops', coalesce((select jsonb_agg(jsonb_build_object('race_id', r.race_id, 'round', r.round, 'name', r.name, 'country', r.country, 'date_utc', r.date_utc,
     'circuit_id', r.circuit_id, 'circuit', c.name, 'lat', c.latitude, 'lon', c.longitude,
     'winner', (select n.name from win w left join dname n on n.driver_id = w.driver_id where w.round = r.round limit 1)) order by r.round)
    from rr r left join circuits c on c.id = r.circuit_id), '[]')
 ) where auth.uid() is not null;
$$;
revoke all on function public.season_overview(int) from public, anon;
grant execute on function public.season_overview(int) to authenticated;
