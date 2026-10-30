-- Rede de companheiros (H14): quem dividiu equipe no mesmo GP, com confronto. Carro compartilhado (mesma posição) não conta como à frente.
create function public.driver_teammates(p_driver_id text) returns jsonb
language sql stable security invoker set search_path = public as $$
 with pairs as (
  select b.driver_id as mate, a.season, a.team, a.position as pa, b.position as pb
  from driver_results a join driver_results b on b.season = a.season and b.round = a.round and b.team = a.team and b.driver_id <> a.driver_id
  where a.driver_id = p_driver_id
 ), agg as (
  select mate, count(*) as races, count(*) filter (where pa < pb) as ahead, count(*) filter (where pb < pa) as behind,
   min(season) as from_season, max(season) as to_season, string_agg(distinct team, ' · ') as teams
  from pairs group by mate
 )
 select coalesce(jsonb_agg(jsonb_build_object('driver_id', a.mate, 'races', a.races, 'ahead', a.ahead, 'behind', a.behind, 'from', a.from_season, 'to', a.to_season, 'teams', a.teams,
   'name', (select d.name from drivers d where d.series = 'f1' and d.driver_id = a.mate order by d.season desc limit 1),
   'headshot_url', (select d.headshot_url from drivers d where d.series = 'f1' and d.driver_id = a.mate and d.headshot_url is not null order by d.season desc limit 1))
   order by a.from_season, a.races desc), '[]')
 from agg a where auth.uid() is not null;
$$;
revoke all on function public.driver_teammates(text) from public, anon;
grant execute on function public.driver_teammates(text) to authenticated;
