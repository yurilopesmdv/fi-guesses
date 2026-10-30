-- Exploração guiada de feitos (H10): perguntas fixas, filtro de época, agregação e limite no servidor.
-- "Grid" é a posição de largada (pode diferir da pole por punições); largadas contam GPs com resultado do piloto.
create function public.history_feats(p_kind text, p_from int default 1950, p_to int default 2100) returns jsonb
language sql stable security invoker set search_path = public as $$
 with base as (
  select dr.*, row_number() over (partition by dr.driver_id order by dr.date_utc, dr.round) as start_no
  from driver_results dr
 ), picked as (
  select season, round, race_name, date_utc, driver_id, team, grid, position, null::int as extra from base
   where p_kind = 'win_from_back' and position = 1 and grid >= 10
  union all
  select season, round, race_name, date_utc, driver_id, team, grid, position, null from base
   where p_kind = 'pole_no_points' and grid = 1 and points = 0
  union all
  select season, round, race_name, date_utc, driver_id, team, grid, position, start_no::int from (
   select distinct on (driver_id) * from base where position = 1 order by driver_id, date_utc, round) f
   where p_kind in ('first_win', 'win_on_debut', 'longest_wait') and (p_kind <> 'win_on_debut' or start_no = 1)
  union all
  select a.season, a.round, a.race_name, a.date_utc, a.driver_id, a.team, a.grid, a.position, null from base a
   where p_kind = 'one_two' and a.position = 1
     and exists (select 1 from base b where b.season = a.season and b.round = a.round and b.position = 2 and b.team = a.team)
 ), scoped as (select * from picked where season between p_from and p_to)
 select jsonb_build_object(
  'total', (select count(*) from scoped),
  'rows', coalesce((select jsonb_agg(jsonb_build_object('season', s.season, 'round', s.round, 'race_name', s.race_name, 'date_utc', s.date_utc,
      'driver_id', s.driver_id, 'team', s.team, 'grid', s.grid, 'position', s.position, 'extra', s.extra,
      'name', (select d.name from drivers d where d.series = 'f1' and d.driver_id = s.driver_id order by d.season desc limit 1)))
    from (select * from scoped order by
      case when p_kind = 'win_from_back' then grid end desc nulls last,
      case when p_kind = 'longest_wait' then extra end desc nulls last,
      date_utc desc limit 100) s), '[]')
 ) where auth.uid() is not null and p_kind in ('win_from_back', 'pole_no_points', 'first_win', 'win_on_debut', 'longest_wait', 'one_two');
$$;
revoke all on function public.history_feats(text, int, int) from public, anon;
grant execute on function public.history_feats(text, int, int) to authenticated;
